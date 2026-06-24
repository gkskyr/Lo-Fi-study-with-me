"use client";

import { useState } from "react";
import Image from "next/image";
import type { Question, Answer } from "@/lib/api";
import { api } from "@/lib/api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins || 1} dakika önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const AVATAR_COLORS = [
  "#ffd000", "#fb923c", "#a3e635", "#38bdf8", "#c084fc", "#f472b6",
];
function colorFor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function QuestionCard({
  q,
  accessToken,
}: {
  q: Question;
  accessToken?: string | null;
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [votes, setVotes] = useState(q.upvotes);
  const [voted, setVoted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [answerSending, setAnswerSending] = useState(false);
  const [answerCount, setAnswerCount] = useState(q._count?.answers ?? 0);

  async function handleVote() {
    if (!accessToken) return;
    try {
      const result = await api.voteQuestion(q.id, accessToken);
      setVotes(result.upvotes);
      setVoted(result.voted);
    } catch {
      // optimistic fallback
      setVotes((v) => (voted ? v - 1 : v + 1));
      setVoted((v) => !v);
    }
  }

  async function handleExpand() {
    if (!expanded && answers === null) {
      setAnswersLoading(true);
      try {
        const data = await api.getAnswers(q.id);
        setAnswers(data);
      } catch {
        setAnswers([]);
      } finally {
        setAnswersLoading(false);
      }
    }
    setExpanded((e) => !e);
  }

  async function handleAnswerSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!accessToken || (!answerText.trim() && answerFiles.length === 0)) return;
    setAnswerSending(true);
    try {
      const answer = await api.createAnswer(q.id, answerText.trim(), accessToken, answerFiles);
      setAnswers((prev) => [...(prev ?? []), answer]);
      setAnswerCount((c) => c + 1);
      setAnswerText("");
      setAnswerFiles([]);
    } catch (err) {
      console.error(err);
    } finally {
      setAnswerSending(false);
    }
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl overflow-hidden hover:border-yellow-400 hover:shadow-sm transition">
      {/* Ana satır */}
      <div className="flex gap-3 p-4">
        {/* sol ikon kolonu */}
        <div className="flex flex-col items-center gap-3 pt-1 shrink-0">
          <button
            onClick={handleVote}
            className="flex flex-col items-center gap-0.5"
            title="Oy ver"
          >
            <Image
              src="/images/arrow.png"
              alt="oy"
              width={20}
              height={20}
              className={`transition ${voted ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
            />
            <span
              className={`text-sm font-semibold ${voted ? "text-amber-600" : "text-amber-400"}`}
            >
              {votes}
            </span>
          </button>

          <button
            onClick={() => setBookmarked((b) => !b)}
            title="Kaydet"
            className={`transition ${bookmarked ? "opacity-100" : "opacity-40 hover:opacity-80"}`}
          >
            <Image src="/images/bookmark.png" alt="kaydet" width={20} height={20} />
          </button>

          <button
            onClick={() => {
              setAnswerText("Spamınız dikkate alınacaktır.");
              setExpanded(true);
            }}
            title="Spam Bildir"
            className="transition opacity-40 hover:opacity-80 mt-1"
          >
            <Image src="/images/spam.svg" alt="spam" width={20} height={20} />
          </button>
        </div>

        {/* içerik */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-amber-500 mb-1">
              {/* hexagon avatar */}
              <div
                className="w-6 h-6 flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{
                  backgroundColor: colorFor(q.author?.username ?? q.author?.name ?? "?"),
                  clipPath: HEX_CLIP,
                }}
              >
                {(q.author?.username ?? q.author?.name ?? "?")[0]?.toUpperCase()}
              </div>
              <span className="font-semibold text-amber-700">
                @{q.author?.username ?? "anonim"}
              </span>
              <span>•</span>
              <span>{timeAgo(q.createdAt)}</span>
            </div>
            <button
              title="Filtrele"
              className="shrink-0 opacity-40 hover:opacity-80 transition mt-0.5"
            >
              <Image src="/images/honey-dipper.png" alt="filtrele" width={20} height={20} />
            </button>
          </div>

          <p className="text-base font-semibold text-amber-900 mb-2 leading-snug whitespace-pre-wrap">
            {q.content ?? ""}
          </p>
          {q.media && q.media.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 mt-2">
              {q.media.map((m) => (
                <img key={m.id} src={m.url.startsWith("http") ? m.url : `${apiUrl}${m.url}`} alt="Soru görseli" onClick={() => setViewingImage(m.url.startsWith("http") ? m.url : `${apiUrl}${m.url}`)} className="w-auto h-32 rounded-lg object-contain border border-yellow-200 bg-yellow-100/50 cursor-zoom-in hover:opacity-90 transition" />
              ))}
            </div>
          )}

          <button
            onClick={handleExpand}
            className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-700 transition"
          >
            <span>{answerCount} cevap</span>
            <span className="text-xs">{expanded ? "▲" : "▼"}</span>
            <span>•</span>
            <span>{votes} oy</span>
          </button>
        </div>
      </div>

      {/* Cevaplar bölümü */}
      {expanded && (
        <div className="border-t border-yellow-200 bg-yellow-100/60 px-4 py-3 flex flex-col gap-2">
          {answersLoading && (
            <p className="text-sm text-amber-500 animate-pulse">Cevaplar yükleniyor…</p>
          )}
          {!answersLoading && answers?.length === 0 && (
            <p className="text-sm text-amber-500">Henüz cevap yok. İlk cevabı sen yaz!</p>
          )}
          {answers?.map((a) => (
            <div key={a.id} className="flex gap-2 text-sm">
              <div
                className="w-6 h-6 shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                style={{
                  backgroundColor: colorFor(a.author?.username ?? a.author?.name ?? "?"),
                  clipPath: HEX_CLIP,
                }}
              >
                {(a.author?.username ?? a.author?.name ?? "?")[0]?.toUpperCase()}
              </div>
              <div>
                <span className="font-semibold text-amber-700">
                  @{a.author?.username ?? "anonim"}
                </span>
                <span className="text-amber-400 ml-1">•</span>
                <span className="text-amber-400 ml-1">{timeAgo(a.createdAt)}</span>
                <p className="text-amber-900 mt-0.5 whitespace-pre-wrap">{a.content}</p>
                {a.media && a.media.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {a.media.map((m) => (
                      <img key={m.id} src={m.url.startsWith("http") ? m.url : `${apiUrl}${m.url}`} alt="Cevap görseli" onClick={() => setViewingImage(m.url.startsWith("http") ? m.url : `${apiUrl}${m.url}`)} className="w-auto h-24 rounded-lg object-contain border border-yellow-200 bg-yellow-100/50 cursor-zoom-in hover:opacity-90 transition" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {accessToken && (
            <form onSubmit={handleAnswerSubmit} className="flex flex-col gap-2 mt-1">
              <div className="flex gap-2">
                <input
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Cevabını yaz…"
                  className="flex-1 text-sm bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  className="bg-yellow-100 hover:bg-yellow-200 text-amber-600 rounded-lg transition flex items-center justify-center border border-yellow-300 px-3 py-2 text-sm"
                  title="Fotoğraf Ekle"
                  onClick={() => document.getElementById(`a-image-${q.id}`)?.click()}
                >
                  📷
                </button>
                <input 
                  type="file" 
                  id={`a-image-${q.id}`} 
                  className="hidden" 
                  accept="image/*" 
                  multiple
                  onChange={(e) => {
                    if (e.target.files) setAnswerFiles(Array.from(e.target.files));
                  }}
                />
                <button
                  type="submit"
                  disabled={(!answerText.trim() && answerFiles.length === 0) || answerSending}
                  className="text-sm px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold disabled:opacity-40 transition"
                >
                  {answerSending ? "…" : "Gönder"}
                </button>
              </div>
              {answerFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                  {answerFiles.map((f, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden border border-yellow-400">
                      <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setAnswerFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-bl-md hover:bg-red-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* Lightbox */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setViewingImage(null)}
        >
          <img
            src={viewingImage}
            alt="Büyük görsel"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold hover:bg-white/30 transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
