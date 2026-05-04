import type * as Party from "partykit/server";

interface ChatMessage {
  id: string;
  type: "message" | "gif" | "sticker" | "system";
  sender: string;
  senderEmail: string;
  content: string;
  timestamp: number;
  reactions: Record<string, string[]>; // emoji -> list of userEmails
}

interface RoomState {
  messages: ChatMessage[];
  users: Record<string, { name: string; email: string; online: boolean }>;
}

type IncomingMessage =
  | { action: "join"; name: string; email: string }
  | { action: "leave"; email: string }
  | { action: "message"; message: Omit<ChatMessage, "id" | "timestamp" | "reactions"> }
  | { action: "react"; messageId: string; emoji: string; email: string }
  | { action: "typing"; email: string; name: string; isTyping: boolean }
  | { action: "history" };

export default class ChatRoom implements Party.Server {
  state: RoomState = { messages: [], users: {} };

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const stored = await this.room.storage.get<RoomState>("state");
    if (stored) {
      this.state = stored;
      // Mark all users offline on restart
      for (const key of Object.keys(this.state.users)) {
        this.state.users[key].online = false;
      }
    }
  }

  async saveState() {
    // Keep only last 200 messages
    if (this.state.messages.length > 200) {
      this.state.messages = this.state.messages.slice(-200);
    }
    await this.room.storage.put("state", this.state);
  }

  onConnect(conn: Party.Connection) {
    // Send current state to newly connected client
    conn.send(
      JSON.stringify({
        type: "init",
        messages: this.state.messages.slice(-100),
        users: this.state.users,
      })
    );
  }

  onClose(conn: Party.Connection) {
    // Find user by connection id and mark offline
    const userData = conn.state as { email?: string; name?: string } | undefined;
    if (userData?.email && this.state.users[userData.email]) {
      this.state.users[userData.email].online = false;
      this.room.broadcast(
        JSON.stringify({
          type: "user_status",
          email: userData.email,
          name: this.state.users[userData.email].name,
          online: false,
        })
      );
      this.saveState();
    }
  }

  async onMessage(raw: string, sender: Party.Connection) {
    let data: IncomingMessage;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    switch (data.action) {
      case "join": {
        this.state.users[data.email] = {
          name: data.name,
          email: data.email,
          online: true,
        };
        // Store user info on connection for onClose
        sender.setState({ email: data.email, name: data.name });

        const systemMsg: ChatMessage = {
          id: crypto.randomUUID(),
          type: "system",
          sender: "system",
          senderEmail: "system",
          content: `${data.name} joined the chat`,
          timestamp: Date.now(),
          reactions: {},
        };
        this.state.messages.push(systemMsg);

        this.room.broadcast(
          JSON.stringify({ type: "user_joined", ...this.state.users[data.email] })
        );
        this.room.broadcast(JSON.stringify({ type: "new_message", message: systemMsg }));
        await this.saveState();
        break;
      }

      case "leave": {
        if (this.state.users[data.email]) {
          this.state.users[data.email].online = false;
          const systemMsg: ChatMessage = {
            id: crypto.randomUUID(),
            type: "system",
            sender: "system",
            senderEmail: "system",
            content: `${this.state.users[data.email].name} left the chat`,
            timestamp: Date.now(),
            reactions: {},
          };
          this.state.messages.push(systemMsg);
          this.room.broadcast(
            JSON.stringify({
              type: "user_left",
              email: data.email,
              name: this.state.users[data.email].name,
            })
          );
          this.room.broadcast(JSON.stringify({ type: "new_message", message: systemMsg }));
          await this.saveState();
        }
        break;
      }

      case "message": {
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          type: data.message.type,
          sender: data.message.sender,
          senderEmail: data.message.senderEmail,
          content: data.message.content,
          timestamp: Date.now(),
          reactions: {},
        };
        this.state.messages.push(msg);
        this.room.broadcast(JSON.stringify({ type: "new_message", message: msg }));
        await this.saveState();
        break;
      }

      case "react": {
        const msg = this.state.messages.find((m) => m.id === data.messageId);
        if (msg) {
          if (!msg.reactions[data.emoji]) {
            msg.reactions[data.emoji] = [];
          }
          const idx = msg.reactions[data.emoji].indexOf(data.email);
          if (idx >= 0) {
            // Toggle off
            msg.reactions[data.emoji].splice(idx, 1);
            if (msg.reactions[data.emoji].length === 0) {
              delete msg.reactions[data.emoji];
            }
          } else {
            msg.reactions[data.emoji].push(data.email);
          }
          this.room.broadcast(
            JSON.stringify({
              type: "reaction_update",
              messageId: data.messageId,
              reactions: msg.reactions,
            })
          );
          await this.saveState();
        }
        break;
      }

      case "typing": {
        this.room.broadcast(
          JSON.stringify({
            type: "typing",
            email: data.email,
            name: data.name,
            isTyping: data.isTyping,
          }),
          [sender.id] // exclude sender
        );
        break;
      }

      case "history": {
        sender.send(
          JSON.stringify({
            type: "history",
            messages: this.state.messages.slice(-100),
          })
        );
        break;
      }
    }
  }
}
