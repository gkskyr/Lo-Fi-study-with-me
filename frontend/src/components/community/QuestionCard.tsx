"use client";

import { useState } from "react";
import Image from "next/image";
import type { Question } from "@/lib/api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins || 1} dakika önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

export default function QuestionCard({ q }: { q: Question }) {
  const [votes, setVotes] = useState(q.upvotes);
  const [voted, setVoted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  function handleVote() {
    setVotes((v) => (voted ? v - 1 : v + 1));
    setVoted((v) => !v);
  }

  return (
    <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 hover:border-yellow-400 hover:shadow-sm transition group">
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
            className={`text-[11px] font-semibold ${voted ? "text-amber-600" : "text-amber-400"}`}
          >
            {votes}
          </span>
        </button>

        <button
          onClick={() => setBookmarked((b) => !b)}
          title="Kaydet"
          className={`transition ${bookmarked ? "opacity-100" : "opacity-40 hover:opacity-80"}`}
        >
          <Image
            src="/images/bookmark.png"
            alt="kaydet"
            width={20}
            height={20}
          />
        </button>

        <button
          title="Spam"
          className="opacity-40 hover:opacity-80 transition"
        >
          <Image src="/images/spam.png" alt="spam" width={20} height={20} />
        </button>
      </div>

      {/* içerik */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-amber-500 mb-1">
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
            <Image
              src="/images/honey-dipper.png"
              alt="filtrele"
              width={20}
              height={20}
            />
          </button>
        </div>

        <p className="text-sm font-semibold text-amber-900 mb-1 leading-snug line-clamp-2">
          {q.content ?? "(görsel içerik)"}
        </p>

        <div className="flex items-center gap-3 text-[11px] text-amber-400 mt-2">
          <span>{q._count?.answers ?? 0} cevap</span>
          <span>•</span>
          <span>{votes} oy</span>
        </div>
      </div>
    </div>
  );
}
