"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api, type StudySessionConfig, type StudySession, type MonitoringType } from "@/lib/api";
import SetupWizard from "@/components/personal-room/SetupWizard";
import CalibrationView from "@/components/personal-room/CalibrationView";
import StudySessionView from "@/components/personal-room/StudySessionView";
import SessionSummary from "@/components/personal-room/SessionSummary";

type PageState = "setup" | "starting" | "calibrating" | "session" | "summary";

type EndedSession = StudySession & {
  xpResult: { xp: number; role: string; leveledUp: boolean };
};

interface SummaryData {
  topic: string;
  completedRounds: number;
  totalRounds: number;
  totalMinutes: number;
  checkInsPassed: number;
  checkInsTotal: number;
  xpAwarded: number;
  leveledUp: boolean;
}

export default function PersonalRoom() {
  const router = useRouter();
  const { accessToken, isLoggedIn } = useAuthStore();
  const [pageState, setPageState] = useState<PageState>("setup");
  const [session, setSession] = useState<StudySession | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // stable userId derived from token (first 16 chars is enough as IDB key)
  const userId = accessToken ? accessToken.slice(-16) : "guest";

  useEffect(() => {
    if (!isLoggedIn) router.replace("/");
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  async function handleSetupComplete(config: StudySessionConfig) {
    setPageState("starting");
    setError(null);
    try {
      const created = await api.createStudySession(config, accessToken!);
      setSession(created);
      // If monitoring is enabled, go to calibration first
      if (config.monitoringType !== "NONE") {
        setPageState("calibrating");
      } else {
        setPageState("session");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oturum başlatılamadı.");
      setPageState("setup");
    }
  }

  function handleCalibrationDone() {
    setPageState("session");
  }

  function handleSessionEnd(ended: EndedSession) {
    const s = ended;
    setSummaryData({
      topic: s.topic,
      completedRounds: s.completedRounds,
      totalRounds: s.totalRounds,
      totalMinutes: s.completedRounds * s.workMinutes,
      checkInsPassed: 0, // server doesn't return this yet — will be derived in future
      checkInsTotal: 0,
      xpAwarded: s.xpAwarded,
      leveledUp: ended.xpResult?.leveledUp ?? false,
    });
    setSession(null);
    setPageState("summary");
  }

  function handleNewSession() {
    setSummaryData(null);
    setSession(null);
    setPageState("setup");
  }

  // ── setup ──────────────────────────────────────────────────────────────────
  if (pageState === "setup") {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900 border border-red-600
                          text-red-200 text-sm px-5 py-3 rounded-xl shadow-lg">
            {error}
          </div>
        )}
        <SetupWizard onComplete={handleSetupComplete} />
      </>
    );
  }

  // ── starting spinner ───────────────────────────────────────────────────────
  if (pageState === "starting") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#ffec8c" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#fbbf24", borderTopColor: "transparent" }} />
          <p className="font-semibold" style={{ color: "#b45309" }}>Oturum başlatılıyor…</p>
        </div>
      </main>
    );
  }

  // ── calibration ────────────────────────────────────────────────────────────
  if (pageState === "calibrating" && session) {
    return (
      <CalibrationView
        monitoringType={session.monitoringType as Exclude<MonitoringType, "NONE">}
        userId={userId}
        onDone={handleCalibrationDone}
      />
    );
  }

  // ── session ────────────────────────────────────────────────────────────────
  if (pageState === "session" && session) {
    return (
      <StudySessionView
        session={session}
        userId={userId}
        token={accessToken!}
        onSessionEnd={handleSessionEnd}
      />
    );
  }

  // ── summary ────────────────────────────────────────────────────────────────
  if (pageState === "summary" && summaryData) {
    return (
      <SessionSummary
        {...summaryData}
        onNewSession={handleNewSession}
        onGoHome={() => router.push("/")}
      />
    );
  }

  return null;
}
