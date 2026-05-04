// In-memory chat store for Vercel serverless (single-instance demo)
// For production, swap this with Redis/Upstash or a database

import type { ChatMessage, User } from "./types";
import { randomUUID } from "crypto";

interface RoomState {
  messages: ChatMessage[];
  users: Record<string, User>;
  typing: Record<string, { name: string; expires: number }>;
}

const rooms = new Map<string, RoomState>();

function getRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { messages: [], users: {}, typing: {} });
  }
  return rooms.get(roomId)!;
}

export function joinRoom(roomId: string, email: string, name: string): ChatMessage {
  const room = getRoom(roomId);
  room.users[email] = { name, email, online: true };

  const systemMsg: ChatMessage = {
    id: randomUUID(),
    type: "system",
    sender: "system",
    senderEmail: "system",
    content: `${name} joined the chat`,
    timestamp: Date.now(),
    reactions: {},
  };
  room.messages.push(systemMsg);
  trimMessages(room);
  return systemMsg;
}

export function leaveRoom(roomId: string, email: string): ChatMessage | null {
  const room = getRoom(roomId);
  const user = room.users[email];
  if (!user) return null;

  user.online = false;
  delete room.typing[email];

  const systemMsg: ChatMessage = {
    id: randomUUID(),
    type: "system",
    sender: "system",
    senderEmail: "system",
    content: `${user.name} left the chat`,
    timestamp: Date.now(),
    reactions: {},
  };
  room.messages.push(systemMsg);
  trimMessages(room);
  return systemMsg;
}

export function addMessage(
  roomId: string,
  msg: { type: "message" | "gif" | "sticker"; sender: string; senderEmail: string; content: string }
): ChatMessage {
  const room = getRoom(roomId);
  const chatMsg: ChatMessage = {
    id: randomUUID(),
    type: msg.type,
    sender: msg.sender,
    senderEmail: msg.senderEmail,
    content: msg.content,
    timestamp: Date.now(),
    reactions: {},
  };
  room.messages.push(chatMsg);
  trimMessages(room);

  // Clear typing status when message is sent
  delete room.typing[msg.senderEmail];

  return chatMsg;
}

export function toggleReaction(roomId: string, messageId: string, emoji: string, email: string): ChatMessage | null {
  const room = getRoom(roomId);
  const msg = room.messages.find((m) => m.id === messageId);
  if (!msg) return null;

  if (!msg.reactions[emoji]) {
    msg.reactions[emoji] = [];
  }

  const idx = msg.reactions[emoji].indexOf(email);
  if (idx >= 0) {
    msg.reactions[emoji].splice(idx, 1);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  } else {
    msg.reactions[emoji].push(email);
  }

  return msg;
}

export function setTyping(roomId: string, email: string, name: string, isTyping: boolean) {
  const room = getRoom(roomId);
  if (isTyping) {
    room.typing[email] = { name, expires: Date.now() + 3000 };
  } else {
    delete room.typing[email];
  }
}

export function getMessages(roomId: string, since?: number): ChatMessage[] {
  const room = getRoom(roomId);
  if (since) {
    return room.messages.filter((m) => m.timestamp > since);
  }
  return room.messages.slice(-100);
}

export function getUsers(roomId: string): Record<string, User> {
  return getRoom(roomId).users;
}

export function getTypingUsers(roomId: string, excludeEmail?: string): Record<string, string> {
  const room = getRoom(roomId);
  const now = Date.now();
  const result: Record<string, string> = {};

  for (const [email, data] of Object.entries(room.typing)) {
    if (email !== excludeEmail && data.expires > now) {
      result[email] = data.name;
    }
  }

  // Clean expired entries
  for (const [email, data] of Object.entries(room.typing)) {
    if (data.expires <= now) {
      delete room.typing[email];
    }
  }

  return result;
}

function trimMessages(room: RoomState) {
  if (room.messages.length > 500) {
    room.messages = room.messages.slice(-300);
  }
}
