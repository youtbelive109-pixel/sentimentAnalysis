import os
import re
from contextlib import asynccontextmanager
from urllib.parse import urlparse, parse_qs

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from transformers import pipeline

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
if not YOUTUBE_API_KEY:
    raise RuntimeError("YOUTUBE_API_KEY is not set in .env")

# Loaded once at startup, shared across all requests
sentiment_pipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global sentiment_pipeline
    print("Loading sentiment model...")
    sentiment_pipeline = pipeline(
        "sentiment-analysis",
        model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    )
    print("Model ready.")
    yield
    # Nothing to clean up


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


def fetch_comments(video_id: str, order: str = "time") -> list[str]:
    """
    Fetch up to 20 top-level comments for `video_id` via the YouTube Data API v3.
    order: "time" (most recent) or "relevance" (top comments).
    """
    youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

    try:
        response = (
            youtube.commentThreads()
            .list(
                part="snippet",
                videoId=video_id,
                maxResults=20,
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


def classify_comments(texts: list[str]) -> list[dict]:
    """
    Run sentiment classification on a list of comment strings.
    Returns a list of dicts: {text, sentiment, score}.
    - Empty/whitespace strings are skipped (labelled UNKNOWN, score 0.0).
    - Truncation to 512 tokens is handled by the pipeline.
    - Non-English text will be classified without crashing (results may be unreliable).
    """
    results = []
    for text in texts:
        if not text.strip():
            results.append({"text": text, "sentiment": "UNKNOWN", "score": 0.0})
            continue
        try:
            output = sentiment_pipeline(
                text,
                truncation=True,
                max_length=512,
            )[0]
            results.append(
                {
                    "text": text,
                    "sentiment": output["label"].upper(),  # normalize to POSITIVE/NEUTRAL/NEGATIVE
                    "score": round(output["score"], 4),
                }
            )
        except Exception:
            # Catch any unexpected model error so one bad comment doesn't kill the request
            results.append({"text": text, "sentiment": "UNKNOWN", "score": 0.0})
    return results


@app.get("/analyze")
def analyze(
    url: str = Query(..., description="YouTube video URL"),
    order: str = Query("time", description="Comment sort order: 'time' or 'relevance'"),
):
    """
    Accepts a YouTube URL, fetches 20 comments (sorted by time or relevance),
    classifies their sentiment, and returns the results as JSON.
    """
    if order not in ("time", "relevance"):
        raise HTTPException(status_code=400, detail="order must be 'time' or 'relevance'")
    video_id = extract_video_id(url)
    raw_comments = fetch_comments(video_id, order=order)
    classified = classify_comments(raw_comments)
    return {
        "video_id": video_id,
        "comment_count": len(classified),
        "comments": classified,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
