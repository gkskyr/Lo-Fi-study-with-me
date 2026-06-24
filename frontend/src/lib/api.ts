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
  slug: string | null;
  type: "PERSONAL" | "COMMUNITY";
  owner: { id: string; name: string } | null;
  createdAt: string;
}

export interface QuestionMedia {
  id: string;
  url: string;
  mimeType: string;
}

export interface Question {
  id: string;
  content: string | null;
  upvotes: number;
  author: { id: string; name: string; username: string };
  roomId: string;
  createdAt: string;
  _count?: { answers: number };
  media?: QuestionMedia[];
}

export interface AnswerMedia {
  id: string;
  url: string;
  mimeType: string;
}

export interface Answer {
  id: string;
  content: string | null;
  author: { id: string; name: string; username: string };
  createdAt: string;
  media?: AnswerMedia[];
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

async function postAuth<T>(path: string, body: FormData | unknown, token: string, isForm = false): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (!isForm) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: isForm ? (body as FormData) : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? "Bir hata oluştu.");
  }
  return res.json() as Promise<T>;
}

async function deleteAuth<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? "Bir hata oluştu.");
  }
  return res.json() as Promise<T>;
}

async function patchAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? "Bir hata oluştu.");
  }
  return res.json() as Promise<T>;
}

export type StudyMethod = "POMODORO" | "BASLAYAMIYORUM" | "KLASIK" | "RASTGELE" | "OZEL";
export type MonitoringType = "NONE" | "PC" | "NOTEBOOK" | "BOTH";

export interface StudySessionConfig {
  topic: string;
  method: StudyMethod;
  workMinutes: number;
  breakMinutes: number;
  totalRounds: number;
  monitoringType: MonitoringType;
}

export interface StudySession extends StudySessionConfig {
  id: string;
  userId: string;
  completedRounds: number;
  startedAt: string;
  endedAt: string | null;
  xpAwarded: number;
}

export interface CheckInPayload {
  round: number;
  passed: boolean;
  monitoringType: MonitoringType;
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

  createQuestion: (roomId: string, content: string, token: string, files?: File[]) => {
    const fd = new FormData();
    fd.append("roomId", roomId);
    fd.append("content", content);
    if (files) files.forEach(f => fd.append("files", f));
    return postAuth<Question>("/questions", fd, token, true);
  },

  getAnswers: (questionId: string) =>
    get<Answer[]>(`/questions/${questionId}/answers`),

  createAnswer: (questionId: string, content: string, token: string, files?: File[]) => {
    const fd = new FormData();
    fd.append("content", content);
    if (files) files.forEach(f => fd.append("files", f));
    return postAuth<Answer>(`/questions/${questionId}/answers`, fd, token, true);
  },

  voteQuestion: (questionId: string, token: string) =>
    postAuth<{ upvotes: number; voted: boolean }>(`/questions/${questionId}/vote`, {}, token),

  createStudySession: (config: StudySessionConfig, token: string) =>
    postAuth<StudySession>("/study-sessions", config, token),

  incrementRound: (sessionId: string, token: string) =>
    patchAuth<StudySession>(`/study-sessions/${sessionId}/round`, {}, token),

  addCheckIn: (sessionId: string, payload: CheckInPayload, token: string) =>
    postAuth<unknown>(`/study-sessions/${sessionId}/checkin`, payload, token),

  endStudySession: (sessionId: string, token: string) =>
    patchAuth<StudySession & { xpResult: { xp: number; role: string; leveledUp: boolean } }>(
      `/study-sessions/${sessionId}/end`,
      {},
      token,
    ),

  getStudySessions: (token: string) =>
    get<StudySession[]>("/study-sessions/me", token),

  monitoringStatus: (token: string) =>
    get<{ calibrated: boolean; updatedAt: string | null }>("/monitoring/status", token),

  monitoringCalibrate: (imageFile: File, token: string) => {
    const fd = new FormData();
    fd.append("image", imageFile);
    return postAuth<{ success: boolean; scales: number }>("/monitoring/calibrate", fd, token, true);
  },

  monitoringCheck: (screenshotBlob: Blob, token: string) => {
    const fd = new FormData();
    fd.append("screenshot", screenshotBlob, "screen.jpg");
    return postAuth<{ passed: boolean; similarity: number; calibrated: boolean }>(
      "/monitoring/check", fd, token, true,
    );
  },

  monitoringDeleteCalibration: (token: string) =>
    deleteAuth<{ success: boolean }>("/monitoring/calibration", token),
};
