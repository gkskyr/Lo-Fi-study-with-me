"use client";

import { useEffect, useState } from "react";
import { api, type Question } from "@/lib/api";
import QuestionCard from "./QuestionCard";

interface Props {
  roomId: string;
  newQuestions: Question[];
  compact?: boolean;
  accessToken?: string | null;
}

export default function QASection({ roomId, newQuestions, compact, accessToken }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionText, setQuestionText] = useState("");
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .getRoomQuestions(roomId)
      .then(setQuestions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (newQuestions.length === 0) return;
    setQuestions((prev) => {
      const incoming = newQuestions[0];
      if (prev.some((q) => q.id === incoming.id)) return prev;
      return [incoming, ...prev];
    });
  }, [newQuestions]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!accessToken || (!questionText.trim() && questionFiles.length === 0)) return;
    setSending(true);
    try {
      const q = await api.createQuestion(roomId, questionText.trim(), accessToken, questionFiles);
      setQuestionText("");
      setQuestionFiles([]);
      setQuestions((prev) => {
        if (prev.some((p) => p.id === q.id)) return prev;
        return [q, ...prev];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <h1 className={`font-bold text-amber-900 tracking-tight ${compact ? "text-lg" : "text-3xl"}`}>
        SORULAR & CEVAPLAR
      </h1>

      {/* Soru yazma formu */}
      {accessToken && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Sorunuzu yazın…"
              className={`flex-1 bg-yellow-50 border border-yellow-300 rounded-xl px-3 text-amber-900 placeholder-amber-400 focus:outline-none focus:border-amber-500 ${compact ? "text-sm py-2" : "text-base py-3"}`}
            />
            <button
              type="button"
              className={`bg-yellow-100 hover:bg-yellow-200 text-amber-600 rounded-xl transition flex items-center justify-center border border-yellow-300 ${compact ? "px-3 py-2 text-sm" : "px-4 py-3 text-base"}`}
              title="Fotoğraf Ekle"
              onClick={() => document.getElementById('q-image')?.click()}
            >
              📷
            </button>
            <input 
              type="file" 
              id="q-image" 
              className="hidden" 
              accept="image/*" 
              multiple
              onChange={(e) => {
                if (e.target.files) setQuestionFiles(Array.from(e.target.files));
              }}
            />
            <button
              type="submit"
              disabled={(!questionText.trim() && questionFiles.length === 0) || sending}
              className={`bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-40 transition ${compact ? "text-sm px-4 py-2" : "text-base px-6 py-3"}`}
            >
              {sending ? "…" : "Sor"}
            </button>
          </div>
          {questionFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {questionFiles.map((f, i) => (
                <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-yellow-400">
                  <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setQuestionFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl-md hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      )}

      {loading && (
        <p className="text-amber-500 text-sm animate-pulse">Sorular yükleniyor…</p>
      )}

      {!loading && questions.length === 0 && (
        <p className="text-amber-500 text-sm">
          Bu odada henüz soru yok. İlk soruyu sen sor!
        </p>
      )}

      <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
        {questions
          .filter((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i)
          .map((q) => (
            <QuestionCard key={q.id} q={q} accessToken={accessToken} />
          ))}
      </div>
    </div>
  );
}
