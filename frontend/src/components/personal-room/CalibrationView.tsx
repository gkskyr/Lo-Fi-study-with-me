"use client";

import { useEffect, useRef, useState } from "react";
import type { MonitoringType } from "@/lib/api";
import { useMonitoring } from "./useMonitoring";

interface Props {
  monitoringType: Exclude<MonitoringType, "NONE">;
  userId: string;
  onDone: () => void;
}

type Step =
  | "checking"
  | "already-done"
  | "cam-loading"
  | "cam-ready"
  | "pc-upload"
  | "done";

export default function CalibrationView({ monitoringType, userId, onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("checking");
  const [pcFile, setPcFile] = useState<File | null>(null);
  const [pcPreview, setPcPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mon = useMonitoring();

  const needsCam = monitoringType === "NOTEBOOK" || monitoringType === "BOTH";

  // Check for existing calibration on mount
  useEffect(() => {
    mon.loadCalibration(userId).then(({ camera, pc }) => {
      const camOK = !needsCam || camera;
      const pcOK = !(monitoringType === "PC" || monitoringType === "BOTH") || pc;
      if (camOK && pcOK) {
        setStep("already-done");
      } else if (needsCam) {
        setStep("cam-loading");
      } else {
        setStep("pc-upload");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open webcam when needed
  useEffect(() => {
    if (step !== "cam-loading") return;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        setStep("cam-ready"); // video element renders after this state change
      })
      .catch(() => setStep("cam-ready"));
  }, [step]);

  // Attach stream once the video element is in the DOM (after "cam-ready" state change)
  useEffect(() => {
    if (step === "cam-ready" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step]);

  // Cleanup webcam on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pcPreview) URL.revokeObjectURL(pcPreview);
    setPcFile(file);
    setPcPreview(URL.createObjectURL(file));
  }

  async function saveCam() {
    const video = videoRef.current;
    if (!video) return;
    setSaving(true);
    await mon.calibrateCamera(video, userId);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setSaving(false);
    if ((monitoringType === "PC" || monitoringType === "BOTH")) setStep("pc-upload");
    else setStep("done");
  }

  async function savePc() {
    if (!pcFile) return;
    setSaving(true);
    await mon.calibratePC(pcFile, userId);
    if (pcPreview) URL.revokeObjectURL(pcPreview);
    setSaving(false);
    setStep("done");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #1c0a00 0%, #2d1200 100%)" }}
    >
      <div className="w-full max-w-md">
        <p className="text-xs text-yellow-700 uppercase tracking-widest mb-3 text-center">
          Denetim Kalibrasyonu
        </p>

        <div className="rounded-2xl border p-6 space-y-5" style={{ background: "#1c0a00", borderColor: "#78350f" }}>

          {/* ── CHECKING ──────────────────────────────────────── */}
          {step === "checking" && (
            <Center><Spinner /><p className="text-sm text-yellow-600 mt-3">Kontrol ediliyor…</p></Center>
          )}

          {/* ── ALREADY CALIBRATED ────────────────────────────── */}
          {step === "already-done" && (
            <>
              <div className="text-center text-3xl">✅</div>
              <h2 className="text-base font-bold text-yellow-100 text-center">
                Kalibrasyon verisi mevcut
              </h2>
              <p className="text-sm text-yellow-600 text-center">
                Önceki oturumdan kalibrasyon verisi bulundu. Doğrudan başlayabilirsin.
              </p>
              <Btn onClick={onDone}>Oturumu Başlat ▶</Btn>
              <button
                onClick={() => setStep(needsCam ? "cam-loading" : "pc-upload")}
                className="w-full text-sm text-yellow-800 hover:text-yellow-600 transition py-1"
              >
                Yeniden kalibre et
              </button>
            </>
          )}

          {/* ── CAM LOADING ───────────────────────────────────── */}
          {step === "cam-loading" && (
            <Center><Spinner /><p className="text-sm text-yellow-600 mt-3">Kamera açılıyor…</p></Center>
          )}

          {/* ── CAM READY ─────────────────────────────────────── */}
          {step === "cam-ready" && (
            <>
              <h2 className="text-base font-bold text-yellow-100">
                {monitoringType === "BOTH" ? "Adım 1: Kamera kalibrasyonu" : "Kamera kalibrasyonu"}
              </h2>
              <p className="text-sm text-yellow-500 leading-relaxed">
                Defterini, kitabını veya çalışma materyalini{" "}
                <strong className="text-yellow-200">yeşil kutunun içine</strong> koy.
                Hazır olunca "Kaydet"e bas.
              </p>

              {/* Camera + green box overlay */}
              <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: "#3c1a0a" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full block"
                  style={{ maxHeight: 240, objectFit: "cover", background: "#0a0500" }}
                />
                {/* Green bounding box — center 50% of frame */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: "25%", left: "25%",
                    width: "50%", height: "50%",
                    border: "3px solid #00ff00",
                    borderRadius: 6,
                    boxShadow: "0 0 12px rgba(0,255,0,0.4), inset 0 0 8px rgba(0,255,0,0.1)",
                  }}
                />
                {/* Corner markers */}
                <CornerMarkers />
              </div>

              <Btn onClick={saveCam} disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </Btn>
            </>
          )}

          {/* ── PC UPLOAD ─────────────────────────────────────── */}
          {step === "pc-upload" && (
            <>
              <h2 className="text-base font-bold text-yellow-100">
                {monitoringType === "BOTH" ? "Adım 2: PC kalibrasyonu" : "PC kalibrasyonu"}
              </h2>
              <p className="text-sm text-yellow-500 leading-relaxed">
                Check-in'de ekranında arayacağımız sembol ya da materyalin görselini yükle.
                Çalışırken bu görsel ekranda görünür olmalı.
              </p>

              <label
                className="flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed
                           cursor-pointer transition py-6"
                style={{ borderColor: pcFile ? "#ffd000" : "#3c1a0a", background: "rgba(60,26,10,0.4)" }}
              >
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {pcPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pcPreview} alt="Referans" className="max-h-32 rounded-lg object-contain" />
                ) : (
                  <>
                    <span className="text-2xl mb-2">🖼️</span>
                    <span className="text-sm text-yellow-700">Görsel seçmek için tıkla</span>
                    <span className="text-xs text-yellow-800 mt-1">PNG, JPG, JPEG</span>
                  </>
                )}
              </label>

{pcFile && (
                <Btn onClick={savePc} disabled={saving}>
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </Btn>
              )}
              <button
                onClick={() => setStep("done")}
                className="w-full text-sm text-yellow-800 hover:text-yellow-600 transition py-1"
              >
                Bu adımı atla
              </button>
            </>
          )}

          {/* ── DONE ──────────────────────────────────────────── */}
          {step === "done" && (
            <>
              <div className="text-center text-4xl mb-1">✅</div>
              <h2 className="text-lg font-bold text-yellow-100 text-center">Kalibrasyon Tamamlandı!</h2>
              <p className="text-sm text-yellow-600 text-center">
                Veriler kaydedildi. Artık oturumu başlatabilirsin.
              </p>
              <Btn onClick={onDone}>Oturumu Başlat ▶</Btn>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Mini components ────────────────────────────────────────────────────────────

function Btn({
  children, onClick, disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
      style={{
        background: disabled ? "#3c1a0a" : "#ffd000",
        color: disabled ? "#5a2d0a" : "#1c0a00",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center py-4">{children}</div>;
}

function CornerMarkers() {
  const corner = "absolute w-4 h-4 pointer-events-none";
  const borderColor = "#00ff00";
  const bw = 3;
  return (
    <>
      {/* top-left */}
      <div className={corner} style={{ top: "calc(25% - 1px)", left: "calc(25% - 1px)", borderTop: `${bw}px solid ${borderColor}`, borderLeft: `${bw}px solid ${borderColor}` }} />
      {/* top-right */}
      <div className={corner} style={{ top: "calc(25% - 1px)", right: "calc(25% - 1px)", borderTop: `${bw}px solid ${borderColor}`, borderRight: `${bw}px solid ${borderColor}` }} />
      {/* bottom-left */}
      <div className={corner} style={{ bottom: "calc(25% - 1px)", left: "calc(25% - 1px)", borderBottom: `${bw}px solid ${borderColor}`, borderLeft: `${bw}px solid ${borderColor}` }} />
      {/* bottom-right */}
      <div className={corner} style={{ bottom: "calc(25% - 1px)", right: "calc(25% - 1px)", borderBottom: `${bw}px solid ${borderColor}`, borderRight: `${bw}px solid ${borderColor}` }} />
    </>
  );
}
