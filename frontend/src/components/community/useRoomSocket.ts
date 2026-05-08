"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { Question } from "@/lib/api";

export interface Participant {
  userId: string;
  username: string;
  cameraOn: boolean;
}

export interface Toast {
  id: string;
  message: string;
}

interface UseRoomSocketResult {
  participants: Participant[];
  toasts: Toast[];
  newQuestions: Question[];
  connected: boolean;
}

const WS_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export function useRoomSocket(
  roomId: string,
  token: string | null
): UseRoomSocketResult {
  const socketRef = useRef<Socket | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newQuestions, setNewQuestions] = useState<Question[]>([]);
  const [connected, setConnected] = useState(false);

  function addToast(message: string) {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  useEffect(() => {
    const socket = io(WS_URL, {
      auth: token ? { token } : undefined,
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("room:join", roomId);
    });

    socket.on("disconnect", () => setConnected(false));

    // Mevcut katılımcı listesi (odaya ilk girerken)
    socket.on(
      "room:users",
      (users: { userId: string; username: string }[]) => {
        setParticipants(
          users.map((u) => ({ ...u, cameraOn: false }))
        );
      }
    );

    socket.on(
      "room:user:joined",
      (user: { userId: string; username: string }) => {
        setParticipants((prev) => {
          if (prev.some((p) => p.userId === user.userId)) return prev;
          return [...prev, { ...user, cameraOn: false }];
        });
        addToast(`${user.username} odaya katıldı`);
      }
    );

    socket.on(
      "room:user:left",
      (user: { userId: string; username: string }) => {
        setParticipants((prev) =>
          prev.filter((p) => p.userId !== user.userId)
        );
        addToast(`${user.username} odadan ayrıldı`);
      }
    );

    socket.on("question:new", (q: Question) => {
      setNewQuestions((prev) => [q, ...prev]);
    });

    return () => {
      socket.emit("room:leave", roomId);
      socket.disconnect();
    };
  }, [roomId, token]);

  return { participants, toasts, newQuestions, connected };
}
