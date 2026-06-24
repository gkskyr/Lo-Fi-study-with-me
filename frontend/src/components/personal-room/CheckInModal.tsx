"use client";

import { useEffect, useRef, useState } from "react";
import type { MonitoringType } from "@/lib/api";
import { isSafari, isIOS } from "@/lib/clip";
import { useMonitoring } from "./useMonitoring";

interface Props {
  monitoringType: MonitoringType;
  userId: string;
  round: number;
  onCheckInComplete: (result: { passed: boolean }) => void;
}

type Step = "loading" | "cam-wait" | "cam-countdown" | "pc-share" | "pc-safari-upload" | "checking" | "result";

export default function CheckInModal({ monitoringType, userId, round, onCheckInComplete }: Props) {
  const webcamRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("loading");
  const [countdown, setCountdown] = useState(3);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [simScore, setSimScore] = useState(0);
  const [safariFileError, setSafariFileError] = useState<string | null>(null);

  const notebookPassedRef = useRef<boolean | null>(null);

  const mon = useMonitoring();

  // Open webcam for camera-based checks
  useEffect(() => {
    if (monitoringType === "PC") return;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 224, height: 224 }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (webcamRef.current) webcamRef.current.srcObject = stream;
      })
      .catch(console.error);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [monitoringType]);

  // Load calibration, then show appropriate first step
  useEffect(() => {
    mon.loadCalibration(userId).then(() => {
      if (monitoringType === "PC") {
        setStep(isSafari() ? "pc-safari-upload" : "pc-share");
      } else {
        setStep("cam-wait");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown → predict
  useEffect(() => {
    if (step !== "cam-countdown") return;
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); runCamCheck(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function runCamCheck() {
    const video = webcamRef.current;
    if (!video) { finish(false, 0); return; }
    setStep("checking");
    const result = await mon.checkCamera(video);
    notebookPassedRef.current = result.passed;
    setSimScore(result.similarity);

    if (monitoringType === "BOTH") {
      setStep(isSafari() ? "pc-safari-upload" : "pc-share");
    } else {
      finish(result.passed, result.similarity);
    }
  }

  async function runPcCheck() {
    setStep("checking");
    try {
      const result = await mon.checkPC();
      if (monitoringType === "BOTH") {
        const both = (notebookPassedRef.current ?? true) && result.passed;
        setSimScore(result.similarity);
        finish(both, result.similarity);
      } else {
        setSimScore(result.similarity);
        finish(result.passed, result.similarity);
      }
    } catch {
      finish(false, 0);
    }
  }

  async function handleSafariFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isIOS()) {
      const ageMs = Date.now() - file.lastModified;
      if (ageMs > 90_000) {
        setSafariFileError("Ekran görüntüsü çok eski. Lütfen yeni bir tane çek ve yükle.");
        return;
      }
    }

    setSafariFileError(null);
    setStep("checking");
    try {
      const result = await mon.checkPCSafari(file);
      if (monitoringType === "BOTH") {
        const both = (notebookPassedRef.current ?? true) && result.passed;
        finish(both, result.similarity);
      } else {
        finish(result.passed, result.similarity);
      }
    } catch {
      finish(false, 0);
    }
  }

  function finish(p: boolean, sim: number) {
    setPassed(p);
    setSimScore(sim);
    setStep("result");
    setTimeout(() => onCheckInComplete({ passed: p }), 2200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,5,0,0.88)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: "#1c0a00", borderColor: "#78350f" }}>
        <p className="text-xs text-yellow-700 mb-1">Tur {round} bitti</p>
        <h2 className="text-lg font-bold text-yellow-100 mb-5">Check-in</h2>

        {/* Webcam with green box — shown during camera steps */}
        {["cam-wait", "cam-countdown"].includes(step) && (
          <div className="relative rounded-xl overflow-hidden border mb-4" style={{ borderColor: "#3c1a0a" }}>
            <video
              ref={webcamRef}
              autoPlay playsInline muted
              className="w-full block"
              style={{ maxHeight: 180, objectFit: "cover", background: "#0a0500" }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: "25%", left: "25%", width: "50%", height: "50%",
                border: "3px solid #00ff00",
                borderRadius: 6,
                boxShadow: "0 0 10px rgba(0,255,0,0.3)",
              }}
            />
          </div>
        )}

        {step === "loading" && (
          <Center><Spinner /><p className="text-sm text-yellow-600 mt-3">Hazırlanıyor…</p></Center>
        )}

        {step === "cam-wait" && (
          <div className="space-y-4">
            <p className="text-sm text-yellow-400">
              Defterini / kitabını <strong className="text-yellow-200">yeşil kutunun içine</strong> tut.
            </p>
            <Btn onClick={() => setStep("cam-countdown")}>Hazırım</Btn>
          </div>
        )}

        {step === "cam-countdown" && (
          <div className="text-center space-y-3">
            <p className="text-sm text-yellow-500">Kamerada tut, fotoğraf çekiliyor…</p>
            <p className="text-5xl font-black text-yellow-400">{countdown}</p>
          </div>
        )}

        {step === "pc-share" && (
          <div className="space-y-4">
            {monitoringType === "BOTH" && (
              <p className="text-xs text-yellow-700">Kamera tamam. Şimdi ekranı doğrulayalım.</p>
            )}
            <p className="text-sm text-yellow-400">
              Çalışma materyalini ekranda aç, ardından ekranı paylaş.
            </p>
            <Btn onClick={runPcCheck}>Ekranı Paylaş</Btn>
          </div>
        )}

        {step === "pc-safari-upload" && (
          <div className="space-y-4">
            {monitoringType === "BOTH" && (
              <p className="text-xs text-yellow-700">Kamera tamam. Şimdi ekranı doğrulayalım.</p>
            )}
            <p className="text-sm text-yellow-400">
              Çalışma materyalini ekrana aç, ardından ekran görüntüsü çek ve yükle.
            </p>
            <p className="text-xs text-yellow-700">
              Mac: <strong className="text-yellow-300">Cmd+Shift+4</strong>
              {" · "}
              Windows: <strong className="text-yellow-300">Win+Shift+S</strong>
            </p>
            {safariFileError && (
              <p className="text-xs text-red-400">{safariFileError}</p>
            )}
            <label
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-center block cursor-pointer"
              style={{ background: "#ffd000", color: "#1c0a00" }}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSafariFile}
              />
              Ekran görüntüsü yükle
            </label>
          </div>
        )}

        {step === "checking" && (
          <Center><Spinner /><p className="text-sm text-yellow-600 mt-3">Kontrol ediliyor…</p></Center>
        )}

        {step === "result" && passed !== null && (
          <div className="text-center space-y-3 py-2">
            <div className="text-5xl">{passed ? "🎯" : "❌"}</div>
            <p className="text-lg font-bold" style={{ color: passed ? "#ffd000" : "#f87171" }}>
              {passed ? "Harika! Devam et." : "Bu turu kaçırdın."}
            </p>
            <p className="text-xs text-yellow-800">
              Benzerlik: {(simScore * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />;
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2.5 rounded-xl text-sm font-semibold"
      style={{ background: "#ffd000", color: "#1c0a00" }}
    >
      {children}
    </button>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center py-4">{children}</div>;
}
