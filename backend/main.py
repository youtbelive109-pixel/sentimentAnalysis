import asyncio
import json
import os
import re
import threading
from contextlib import asynccontextmanager
from urllib.parse import urlparse, parse_qs

from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import torch
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from transformers import pipeline

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
if not YOUTUBE_API_KEY:
    raise RuntimeError("YOUTUBE_API_KEY is not set in .env")

# Loaded once at startup, shared across all requests
sentiment_pipeline = None

# Cache: key=(video_id, order, max_results), TTL=5 minutes, max 128 entries
_cache: TTLCache = TTLCache(maxsize=128, ttl=300)
_cache_lock = threading.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global sentiment_pipeline
    print("Loading sentiment model...")
    sentiment_pipeline = pipeline(
        "sentiment-analysis",
        model="cardiffnlp/twitter-roberta-base-sentiment-latest",
        torch_dtype=torch.float16,
    )
    print("Model ready.")
    yield


app = FastAPI(title="YouTube Comment Sentiment Analyzer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_video_id(url: str) -> str:
    """
    Extract the YouTube video ID from the following URL formats:
      - https://www.youtube.com/watch?v=VIDEO_ID
      - https://youtu.be/VIDEO_ID
      - https://www.youtube.com/embed/VIDEO_ID
      - https://www.youtube.com/shorts/VIDEO_ID
    Returns the video ID string, or raises HTTPException(400) on failure.
    """
    url = url.strip()
    parsed = urlparse(url)

    # youtu.be/VIDEO_ID
    if parsed.netloc in ("youtu.be", "www.youtu.be"):
        video_id = parsed.path.lstrip("/").split("/")[0]
        if video_id:
            return video_id

    # youtube.com/watch?v=VIDEO_ID
    if "youtube.com" in parsed.netloc:
        qs = parse_qs(parsed.query)
        if "v" in qs:
            return qs["v"][0]

        # youtube.com/embed/VIDEO_ID  or  youtube.com/shorts/VIDEO_ID
        match = re.match(r"^/(embed|shorts|v)/([A-Za-z0-9_-]{11})", parsed.path)
        if match:
            return match.group(2)

    raise HTTPException(
        status_code=400,
        detail="Could not extract a video ID from the provided URL. "
               "Supported formats: watch?v=, youtu.be/, /embed/, /shorts/",
    )


def fetch_comments(video_id: str, order: str = "time", max_results: int = 20) -> list[str]:
    """
    Fetch top-level comments for `video_id` via the YouTube Data API v3.
    order: "time" (most recent) or "relevance" (top comments).
    max_results: number of comments to fetch (1–100).
    """
    youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

    try:
        response = (
            youtube.commentThreads()
            .list(
                part="snippet",
                videoId=video_id,
                maxResults=max_results,
                order=order,
                textFormat="plainText",
            )
            .execute()
        )
    except HttpError as e:
        status = e.resp.status
        # Parse the error reason from the response body
        reason = ""
        if e.error_details:
            reason = e.error_details[0].get("reason", "")

        if status == 403 and reason == "commentsDisabled":
            raise HTTPException(
                status_code=422,
                detail="Comments are disabled for this video.",
            )
        if status == 403:
            raise HTTPException(
                status_code=403,
                detail=f"YouTube API access denied: {e.reason}",
            )
        if status == 404:
            raise HTTPException(
                status_code=404,
                detail="Video not found. Check the URL and try again.",
            )
        # Quota exceeded or other API errors
        raise HTTPException(
            status_code=502,
            detail=f"YouTube API error (HTTP {status}): {e.reason}",
        )

    items = response.get("items", [])
    if not items:
        raise HTTPException(
            status_code=404,
            detail="No comments found for this video.",
        )

    comments = []
    for item in items:
        top = item["snippet"]["topLevelComment"]["snippet"]
        comments.append(top.get("textDisplay", ""))
    return comments


def classify_batch(texts: list[str]) -> list[dict]:
    """
    Run sentiment classification on a list of comment strings.
    Returns one dict per input text with keys: text, sentiment, score.
    """
    # Separate empty strings — pipeline errors on them
    valid_indices = [i for i, t in enumerate(texts) if t.strip()]
    valid_texts = [texts[i] for i in valid_indices]

    batch_outputs = {}
    if valid_texts:
        try:
            outputs = sentiment_pipeline(
                valid_texts,
                truncation=True,
                max_length=512,
                batch_size=16,
            )
            for idx, output in zip(valid_indices, outputs):
                batch_outputs[idx] = output
        except Exception:
            pass  # fall through to UNKNOWN for all

    results = []
    for i, text in enumerate(texts):
        if i in batch_outputs:
            out = batch_outputs[i]
            results.append({
                "text": text,
                "sentiment": out["label"].upper(),
                "score": round(out["score"], 4),
            })
        else:
            results.append({"text": text, "sentiment": "UNKNOWN", "score": 0.0})
    return results


@app.get("/analyze")
def analyze(
    url: str = Query(..., description="YouTube video URL"),
    order: str = Query("time", description="Comment sort order: 'time' or 'relevance'"),
    max_results: int = Query(20, ge=1, le=100, description="Number of comments to fetch (1–100)"),
):
    """
    Accepts a YouTube URL, fetches comments (sorted by time or relevance),
    classifies their sentiment, and returns the results as JSON.
    """
    if order not in ("time", "relevance"):
        raise HTTPException(status_code=400, detail="order must be 'time' or 'relevance'")
    video_id = extract_video_id(url)

    cache_key = (video_id, order, max_results)
    with _cache_lock:
        cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    raw_comments = fetch_comments(video_id, order=order, max_results=max_results)
    classified = classify_batch(raw_comments)
    result = {
        "video_id": video_id,
        "comment_count": len(classified),
        "comments": classified,
    }
    with _cache_lock:
        _cache[cache_key] = result
    return result


@app.get("/analyze/stream")
async def analyze_stream(
    url: str = Query(..., description="YouTube video URL"),
    order: str = Query("time", description="Comment sort order: 'time' or 'relevance'"),
    max_results: int = Query(20, ge=1, le=100, description="Number of comments to fetch (1–100)"),
):
    """
    SSE endpoint. Streams classified comments progressively as Server-Sent Events.
    Events: status | comment | summary | error
    """
    if order not in ("time", "relevance"):
        raise HTTPException(status_code=400, detail="order must be 'time' or 'relevance'")
    video_id = extract_video_id(url)

    async def event_generator():
        loop = asyncio.get_event_loop()

        yield f"event: status\ndata: {json.dumps({'message': 'Fetching comments\u2026'})}\n\n"

        # fetch_comments is synchronous — offload to thread pool so we don't block the event loop
        try:
            raw_comments = await loop.run_in_executor(
                None, lambda: fetch_comments(video_id, order=order, max_results=max_results)
            )
        except HTTPException as e:
            yield f"event: error\ndata: {json.dumps({'detail': e.detail})}\n\n"
            return

        yield f"event: status\ndata: {json.dumps({'message': 'Classifying comments\u2026'})}\n\n"

        classified = []
        mini_batch_size = 8
        for batch_start in range(0, len(raw_comments), mini_batch_size):
            batch = raw_comments[batch_start:batch_start + mini_batch_size]
            results = await loop.run_in_executor(None, classify_batch, batch)
            for i, result in enumerate(results):
                classified.append(result)
                payload = json.dumps({"index": batch_start + i, **result})
                yield f"event: comment\ndata: {payload}\n\n"

        pos = sum(1 for c in classified if c["sentiment"] == "POSITIVE")
        neg = sum(1 for c in classified if c["sentiment"] == "NEGATIVE")
        neu = sum(1 for c in classified if c["sentiment"] == "NEUTRAL")
        summary_payload = json.dumps({
            "video_id": video_id,
            "total": len(classified),
            "pos": pos,
            "neg": neg,
            "neu": neu,
        })
        yield f"event: summary\ndata: {summary_payload}\n\n"

        # Populate cache so a follow-up /analyze call on the same video is instant
        cache_key = (video_id, order, max_results)
        cache_value = {
            "video_id": video_id,
            "comment_count": len(classified),
            "comments": classified,
        }
        with _cache_lock:
            _cache[cache_key] = cache_value

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@app.get("/health")
def health():
    return {"status": "ok"}
