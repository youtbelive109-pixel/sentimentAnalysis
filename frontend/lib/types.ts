export interface ChatMessage {
  id: string;
  type: "message" | "gif" | "sticker" | "system";
  sender: string;
  senderEmail: string;
  content: string;
  timestamp: number;
  reactions: Record<string, string[]>;
}

export interface User {
  name: string;
  email: string;
  online: boolean;
}

export interface AuthState {
  authenticated: boolean;
  email: string;
  name: string;
}
