const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  username: string;
  name: string;
  password: string;
}

interface VerifyEmailPayload {
  email: string;
  code: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  username: string;
}

export interface Room {
  id: string;
  title: string;
  type: "PERSONAL" | "COMMUNITY";
  owner: { id: string; name: string } | null;
  createdAt: string;
}

export interface Question {
  id: string;
  content: string | null;
  upvotes: number;
  author: { id: string; name: string; username: string };
  roomId: string;
  createdAt: string;
  _count?: { answers: number };
}

export interface AgoraToken {
  token: string;
  uid: number;
  channelName: string;
}

async function get<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? "Bir hata oluştu.");
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? "Bir hata oluştu.");
  }

  return res.json() as Promise<T>;
}

export const api = {
  login: (payload: LoginPayload) =>
    post<AuthResponse>("/auth/login", payload),

  register: (payload: RegisterPayload) =>
    post<{ message: string }>("/auth/register", payload),

  verifyEmail: (payload: VerifyEmailPayload) =>
    post<AuthResponse>("/auth/verify-email", payload),

  getRooms: (token?: string) => get<Room[]>("/rooms", token),

  getRoom: (id: string, token?: string) => get<Room>(`/rooms/${id}`, token),

  getRoomQuestions: (roomId: string) =>
    get<Question[]>(`/rooms/${roomId}/questions`),

  getAgoraToken: (roomId: string, token: string) =>
    get<AgoraToken>(`/rooms/${roomId}/agora-token`, token),
};
