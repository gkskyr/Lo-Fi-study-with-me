"use client";

import { useEffect, useState } from "react";
import { api, type Question } from "@/lib/api";
import QuestionCard from "./QuestionCard";

interface Props {
  roomId: string;
  newQuestions: Question[];
  compact?: boolean;
}

export default function QASection({ roomId, newQuestions, compact }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRoomQuestions(roomId)
      .then(setQuestions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  // WebSocket'ten gelen yeni soruları başa ekle
  useEffect(() => {
    if (newQuestions.length === 0) return;
    const latestId = newQuestions[0].id;
    setQuestions((prev) => {
      if (prev.some((q) => q.id === latestId)) return prev;
      return [newQuestions[0], ...prev];
    });
  }, [newQuestions]);

  return (
    <div className="flex flex-col h-full">
      <h1 className={`font-bold text-amber-900 tracking-tight mb-4 ${compact ? "text-lg" : "text-3xl mb-6"}`}>
        SORULAR & CEVAPLAR
      </h1>

      {loading && (
        <p className="text-amber-500 text-sm animate-pulse">Sorular yükleniyor…</p>
      )}

      {!loading && questions.length === 0 && (
        <p className="text-amber-500 text-sm">
          Bu odada henüz soru yok. İlk soruyu sen sor!
        </p>
      )}

      <div className="flex flex-col gap-3 overflow-y-auto pr-1">
        {questions.map((q) => (
          <QuestionCard key={q.id} q={q} />
        ))}
      </div>
    </div>
  );
}
