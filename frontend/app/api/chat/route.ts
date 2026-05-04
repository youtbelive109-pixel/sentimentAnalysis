import { NextRequest, NextResponse } from "next/server";
import {
  joinRoom,
  leaveRoom,
  addMessage,
  toggleReaction,
  setTyping,
  getMessages,
  getUsers,
  getTypingUsers,
} from "@/lib/chatStore";

// GET - Poll for messages and state
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") || "general";
  const since = searchParams.get("since");
  const email = searchParams.get("email") || "";

  const sinceTs = since ? parseInt(since, 10) : undefined;
  const messages = getMessages(room, sinceTs);
  const users = getUsers(room);
  const typing = getTypingUsers(room, email);

  return NextResponse.json({
    messages,
    users,
    typing,
    serverTime: Date.now(),
  });
}

// POST - Send actions (join, leave, message, react, typing)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, room = "general" } = body;

    switch (action) {
      case "join": {
        const { email, name } = body;
        if (!email || !name) {
          return NextResponse.json({ error: "email and name required" }, { status: 400 });
        }
        const msg = joinRoom(room, email, name);
        return NextResponse.json({ success: true, message: msg });
      }

      case "leave": {
        const { email } = body;
        if (!email) {
          return NextResponse.json({ error: "email required" }, { status: 400 });
        }
        const msg = leaveRoom(room, email);
        return NextResponse.json({ success: true, message: msg });
      }

      case "message": {
        const { type, sender, senderEmail, content } = body;
        if (!content || !sender || !senderEmail) {
          return NextResponse.json({ error: "content, sender, senderEmail required" }, { status: 400 });
        }
        const msg = addMessage(room, { type: type || "message", sender, senderEmail, content });
        return NextResponse.json({ success: true, message: msg });
      }

      case "react": {
        const { messageId, emoji, email } = body;
        if (!messageId || !emoji || !email) {
          return NextResponse.json({ error: "messageId, emoji, email required" }, { status: 400 });
        }
        const msg = toggleReaction(room, messageId, emoji, email);
        return NextResponse.json({ success: true, message: msg });
      }

      case "typing": {
        const { email, name, isTyping } = body;
        if (!email) {
          return NextResponse.json({ error: "email required" }, { status: 400 });
        }
        setTyping(room, email, name || "", isTyping ?? false);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
