"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  topic: string;
  completedRounds: number;
  totalRounds: number;
  totalMinutes: number;
  checkInsPassed: number;
  checkInsTotal: number;
  xpAwarded: number;
  leveledUp: boolean;
  onNewSession: () => void;
  onGoHome: () => void;
}

export default function SessionSummary({
  topic,
  completedRounds,
  totalRounds,
  totalMinutes,
  checkInsPassed,
  checkInsTotal,
  xpAwarded,
  leveledUp,
  onNewSession,
  onGoHome,
}: Props) {
  const early = completedRounds < totalRounds;
  const [displayXp, setDisplayXp] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (xpAwarded === 0) return;
    const duration = 1500;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayXp(Math.round(eased * xpAwarded));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [xpAwarded]);

  const monitoringScore = checkInsTotal > 0 ? `${checkInsPassed}/${checkInsTotal}` : "—";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationLabel = hours > 0 ? `${hours}s ${mins}dk` : `${mins} dk`;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#ffec8c" }}
    >
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <div className="text-4xl mb-3">{early ? "⏹️" : "🎉"}</div>
          <h1 className="text-2xl font-black" style={{ color: "#92400e" }}>
            {early ? "Erken Bitirilen Oturum" : "Oturum Tamamlandı!"}
          </h1>
          <p className="text-sm truncate" style={{ color: "#d97706" }}>{topic}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Tekrar" value={`${completedRounds}/${totalRounds}`} />
          <StatCard label="Süre" value={durationLabel} />
          <StatCard label="Denetim" value={monitoringScore} />
        </div>

        <div
          className="rounded-2xl border p-5 text-center"
          style={{ background: "#fef3c7", borderColor: "#fde68a" }}
        >
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#d97706" }}>Kazanılan XP</p>
          <p className="font-black leading-none" style={{ fontSize: "3.5rem", color: "#f59e0b" }}>
            +{displayXp}
          </p>
          {leveledUp && (
            <p className="text-sm font-semibold mt-2" style={{ color: "#b45309" }}>
              🏆 Seviye atladın!
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onNewSession}
            className="w-full py-3 rounded-xl text-sm font-semibold transition"
            style={{ background: "#fbbf24", color: "#78350f" }}
          >
            Yeni Oturum Başlat
          </button>
          <button
            onClick={onGoHome}
            className="w-full py-3 rounded-xl text-sm font-semibold border transition"
            style={{ borderColor: "#fde68a", color: "#b45309", background: "transparent" }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border p-3 text-center"
      style={{ background: "#fef3c7", borderColor: "#fde68a" }}
    >
      <p className="text-xs mb-1" style={{ color: "#d97706" }}>{label}</p>
      <p className="text-base font-bold" style={{ color: "#b45309" }}>{value}</p>
    </div>
  );
}
