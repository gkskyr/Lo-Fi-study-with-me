import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from '../constants/config';

async function toRNFile(img: { uri: string; mimeType?: string; fileName?: string }): Promise<{ uri: string; type: string; name: string }> {
  const name = img.fileName ?? `img_${Date.now()}.jpg`;
  const type = img.mimeType ?? 'image/jpeg';
  if (img.uri.startsWith('file://')) return { uri: img.uri, type, name };
  const dest = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.copyAsync({ from: img.uri, to: dest });
  return { uri: dest, type, name };
}

// Expo 56's custom fetch doesn't support RN FormData file parts — use XHR instead
function xhrUpload<T>(url: string, fd: FormData, token: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as T;
        if (xhr.status >= 400) {
          const err = data as { message: string | string[] };
          reject(new Error(Array.isArray(err.message) ? err.message[0] : err.message));
        } else {
          resolve(data);
        }
      } catch {
        reject(new Error('Sunucu yanıtı okunamadı.'));
      }
    };
    xhr.onerror = () => reject(new Error('Ağ hatası.'));
    xhr.send(fd);
  });
}

async function get<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? 'Bir hata oluştu.');
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? 'Bir hata oluştu.');
  }
  return res.json() as Promise<T>;
}

async function postAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? 'Bir hata oluştu.');
  }
  return res.json() as Promise<T>;
}

async function patchAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? 'Bir hata oluştu.');
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type StudyMethod = 'POMODORO' | 'BASLAYAMIYORUM' | 'KLASIK' | 'RASTGELE' | 'OZEL';

export interface StudySessionConfig {
  topic: string;
  method: StudyMethod;
  workMinutes: number;
  breakMinutes: number;
  totalRounds: number;
  monitoringType: 'NONE';
}

export interface StudySession extends StudySessionConfig {
  id: string;
  userId: string;
  completedRounds: number;
  startedAt: string;
  endedAt: string | null;
  xpAwarded: number;
}

export interface Room {
  id: string;
  title: string;
  slug: string | null;
  type: 'PERSONAL' | 'COMMUNITY';
  owner: { id: string; name: string } | null;
  createdAt: string;
}

export interface Media {
  id: string;
  url: string;
}

export interface Question {
  id: string;
  content: string | null;
  upvotes: number;
  author: { id: string; name: string; username: string };
  roomId: string;
  createdAt: string;
  _count?: { answers: number };
  media?: Media[];
}

export interface Answer {
  id: string;
  content: string | null;
  author: { id: string; name: string; username: string };
  createdAt: string;
  media?: Media[];
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  username: string;
}

// ── API ────────────────────────────────────────────────────────────────────

export const api = {
  login: (email: string, password: string) =>
    post<AuthResponse>('/auth/login', { email, password }),

  register: (data: { email: string; username: string; name: string; password: string }) =>
    post<{ message: string }>('/auth/register', data),

  verifyEmail: (email: string, code: string) =>
    post<AuthResponse>('/auth/verify-email', { email, code }),

  getRooms: (token?: string) => get<Room[]>('/rooms', token),

  getRoom: (id: string, token?: string) => get<Room>(`/rooms/${id}`, token),

  getRoomQuestions: (roomId: string, token?: string) =>
    get<Question[]>(`/rooms/${roomId}/questions`, token),

  createQuestion: async (roomId: string, content: string, token: string, images?: { uri: string; mimeType?: string; fileName?: string }[]): Promise<Question> => {
    const fd = new FormData();
    fd.append('roomId', roomId);
    fd.append('content', content);
    if (images && images.length > 0) {
      await Promise.all(images.map(async (img) => {
        const f = await toRNFile(img);
        fd.append('files', f as unknown as Blob);
      }));
    }
    return xhrUpload<Question>(`${API_BASE_URL}/questions`, fd, token);
  },

  getAnswers: (questionId: string) =>
    get<Answer[]>(`/questions/${questionId}/answers`),

  createAnswer: async (questionId: string, content: string, token: string, images?: { uri: string; mimeType?: string; fileName?: string }[]): Promise<Answer> => {
    const fd = new FormData();
    fd.append('content', content);
    if (images && images.length > 0) {
      await Promise.all(images.map(async (img) => {
        const f = await toRNFile(img);
        fd.append('files', f as unknown as Blob);
      }));
    }
    return xhrUpload<Answer>(`${API_BASE_URL}/questions/${questionId}/answers`, fd, token);
  },

  voteQuestion: (questionId: string, token: string) =>
    postAuth<{ upvotes: number; voted: boolean }>(`/questions/${questionId}/vote`, {}, token),

  createStudySession: (config: StudySessionConfig, token: string) =>
    postAuth<StudySession>('/study-sessions', config, token),

  incrementRound: (sessionId: string, token: string) =>
    patchAuth<StudySession>(`/study-sessions/${sessionId}/round`, {}, token),

  endStudySession: (sessionId: string, token: string) =>
    patchAuth<StudySession & { xpResult: { xp: number; role: string; leveledUp: boolean } }>(
      `/study-sessions/${sessionId}/end`, {}, token
    ),
};
