"use client";

import { useEffect, useRef, useState } from "react";
import type { StudySession } from "@/lib/api";
import { api } from "@/lib/api";
import { useStudyTimer } from "./useStudyTimer";
import CheckInModal from "./CheckInModal";

interface Props {
  session: StudySession;
  userId: string;
  token: string;
  onSessionEnd: (endedSession: StudySession & { xpResult: { xp: number; role: string; leveledUp: boolean } }) => void;
}

export default function StudySessionView({ session, userId, token, onSessionEnd }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [checkInRound, setCheckInRound] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(console.error);

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const timer = useStudyTimer(
    {
      workMinutes: session.workMinutes,
      breakMinutes: session.breakMinutes,
      totalRounds: session.totalRounds,
      method: session.method,
    },
    {
      onRoundComplete: (round) => {
        timer.pause();
        if (session.monitoringType !== "NONE") {
          setCheckInRound(round);
        } else {
          api.incrementRound(session.id, token).catch(console.error);
          timer.resume();
        }
      },
      onSessionDone: () => {
        handleEnd();
      },
    },
  );

  async function handleCheckInComplete(result: { passed: boolean }) {
    const round = checkInRound!;
    setCheckInRound(null);
    try {
      await api.addCheckIn(session.id, { round, passed: result.passed, monitoringType: session.monitoringType }, token);
      await api.incrementRound(session.id, token);
    } catch (e) {
      console.error(e);
    }
    if (timer.phase !== "done") timer.resume();
  }

  async function handleEnd() {
    if (ending) return;
    setEnding(true);
    try {
      const ended = await api.endStudySession(session.id, token);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onSessionEnd(ended);
    } catch (e) {
      console.error(e);
      setEnding(false);
    }
  }

  const mins = String(Math.floor(timer.remaining / 60)).padStart(2, "0");
  const secs = String(timer.remaining % 60).padStart(2, "0");
  const isWork = timer.phase === "work";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#ffec8c" }}
    >
      {/* Topic bar */}
      <div
        className="w-full py-3 px-6 flex items-center justify-center border-b"
        style={{ borderColor: "#fde68a", background: "#fef3c7" }}
      >
        <span className="font-bold text-base tracking-wide truncate max-w-xl" style={{ color: "#b45309" }}>
          {session.topic}
        </span>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row gap-0">
        {/* Camera */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden border-2" style={{ borderColor: "#fde68a" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
              style={{ aspectRatio: "4/3", objectFit: "cover", background: "#fef9c3" }}
            />
            <div
              className="absolute top-3 left-3 right-3 text-center px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: "rgba(254,243,199,0.85)", color: "#b45309" }}
            >
              {session.topic}
            </div>
          </div>
        </div>

        {/* Timer panel */}
        <div
          className="lg:w-72 flex flex-col items-center justify-center gap-6 p-8 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: "#fde68a", background: "#fef3c7" }}
        >
          {/* Phase badge */}
          <div
            className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{
              background: isWork ? "rgba(251,191,36,0.2)" : "rgba(251,146,60,0.15)",
              color: isWork ? "#b45309" : "#c2410c",
              border: `1px solid ${isWork ? "#fbbf24" : "#fb923c"}`,
            }}
          >
            {timer.phase === "done" ? "Tamamlandı" : isWork ? "Çalışma" : "Mola"}
          </div>

          {/* Big clock */}
          <div
            className="font-mono font-black leading-none"
            style={{ fontSize: "5rem", color: isWork ? "#f59e0b" : "#fb923c" }}
          >
            {mins}:{secs}
          </div>

          {/* Round indicator */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs uppercase tracking-widest" style={{ color: "#d97706" }}>Tur</p>
            <div className="flex gap-2">
              {Array.from({ length: session.totalRounds }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{
                    background:
                      i < timer.currentRound - 1
                        ? "#fbbf24"
                        : i === timer.currentRound - 1
                        ? isWork ? "#fbbf24" : "#fb923c"
                        : "#fde68a",
                    opacity: i < timer.currentRound - 1 ? 0.5 : 1,
                  }}
                />
              ))}
            </div>
            <p className="text-sm" style={{ color: "#d97706" }}>
              {timer.currentRound} / {session.totalRounds}
            </p>
          </div>

          {/* Duration info */}
          <div className="text-xs text-center" style={{ color: "#b45309" }}>
            <p>{timer.workMinutes} dk çalışma · {timer.breakMinutes} dk mola</p>
          </div>

          {/* End session button */}
          <button
            onClick={handleEnd}
            disabled={ending}
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold border transition"
            style={{
              borderColor: "#fca5a5",
              background: "transparent",
              color: ending ? "#fca5a5" : "#ef4444",
              cursor: ending ? "not-allowed" : "pointer",
            }}
          >
            {ending ? "Bitiriliyor…" : "Oturumu Bitir"}
          </button>
        </div>
      </div>

      {checkInRound !== null && (
        <CheckInModal
          monitoringType={session.monitoringType}
          userId={userId}
          round={checkInRound}
          onCheckInComplete={handleCheckInComplete}
        />
      )}
    </div>
  );
}
