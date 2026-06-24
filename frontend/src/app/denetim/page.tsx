"use client";

import { useEffect, useRef, useState } from "react";
import { isSafari, isIOS } from "@/lib/clip";
import { useMonitoring, type CheckResult } from "@/components/personal-room/useMonitoring";

const TEST_USER = "denetim-test";

type CamStep = "idle" | "loading" | "ready" | "saved";
type PcStep = "idle" | "saved";

export default function DenetimPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camStep, setCamStep] = useState<CamStep>("idle");
  const [pcStep, setPcStep] = useState<PcStep>("idle");
  const [pcFile, setPcFile] = useState<File | null>(null);
  const [pcPreview, setPcPreview] = useState<string | null>(null);

  const [testing, setTesting] = useState(false);
  const [camResult, setCamResult] = useState<CheckResult | null>(null);
  const [pcResult, setPcResult] = useState<CheckResult | null>(null);

  const [existing, setExisting] = useState<{ camera: boolean; pc: boolean } | null>(null);
  const mon = useMonitoring();

  useEffect(() => {
    mon.loadCalibration(TEST_USER).then((r) => setExisting(r));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Camera: open stream ────────────────────────────────────────────────────
  function startCam() {
    setCamStep("loading");
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        setCamStep("ready"); // triggers useEffect below to attach srcObject
      })
      .catch(() => setCamStep("idle"));
  }

  // Attach stream to video element once it appears in DOM
  useEffect(() => {
    if (camStep === "ready" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camStep]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  async function saveCam() {
    const video = videoRef.current;
    if (!video) return;
    await mon.calibrateCamera(video, TEST_USER);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCamStep("saved");
    setExisting((prev) => ({ ...prev!, camera: true }));
  }

  // ── PC: file upload ────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pcPreview) URL.revokeObjectURL(pcPreview);
    setPcFile(file);
    setPcPreview(URL.createObjectURL(file));
  }

  async function savePc() {
    if (!pcFile) return;
    await mon.calibratePC(pcFile, TEST_USER);
    if (pcPreview) URL.revokeObjectURL(pcPreview);
    setPcStep("saved");
    setExisting((prev) => ({ ...prev!, pc: true }));
  }

  // ── Run test ───────────────────────────────────────────────────────────────
  async function runTest() {
    setTesting(true);
    setCamResult(null);
    setPcResult(null);
    await mon.loadCalibration(TEST_USER);

    if (camStep === "saved") {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const tempVideo = document.createElement("video");
      tempVideo.srcObject = stream;
      tempVideo.muted = true;
      await tempVideo.play();
      await new Promise((r) => setTimeout(r, 800));
      const r = await mon.checkCamera(tempVideo);
      setCamResult(r);
      stream.getTracks().forEach((t) => t.stop());
    }

    if (pcStep === "saved") {
      try {
        if (isSafari()) {
          const file = await new Promise<File | null>((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = () => resolve(input.files?.[0] ?? null);
            input.oncancel = () => resolve(null);
            input.click();
          });
          if (!file) {
            setPcResult({ passed: false, similarity: 0 });
          } else if (!isIOS() && Date.now() - file.lastModified > 90_000) {
            alert("Ekran görüntüsü çok eski, lütfen yeni bir tane çek.");
            setPcResult({ passed: false, similarity: 0 });
          } else {
            const r = await mon.checkPCSafari(file);
            setPcResult(r);
          }
        } else {
          const r = await mon.checkPC();
          setPcResult(r);
        }
      } catch {
        setPcResult({ passed: false, similarity: 0 });
      }
    }

    setTesting(false);
  }

  const canTest = (camStep === "saved" || pcStep === "saved") && !testing;

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "linear-gradient(135deg, #1c0a00 0%, #2d1200 100%)" }}
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-yellow-100 mb-1">Denetim Test Odası</h1>
        <p className="text-sm text-yellow-700 mb-2">
          Denetim mekanizmasını kişisel oda olmadan test et.
        </p>
        <p className="text-xs text-yellow-800 mb-6">
          Kamera: 32x32 MAD karşılaştırması (eşik: 65%) · PC: ORB feature matching (eşik: 15%)
          {" · "}
          <span className="text-yellow-900">Safari&apos;de PC kontrolü ekran görüntüsü yüklemeyle çalışır</span>
        </p>

        {existing && (
          <div className="flex gap-3 mb-6">
            <Badge ok={existing.camera} label="Kamera" />
            <Badge ok={existing.pc} label="PC" />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* ── CAMERA ──────────────────────────────────────────── */}
          <Section title="📷 Kamera Kalibrasyonu">
            <p className="text-xs text-yellow-700 mb-3">
              Objeyi yeşil kutunun içine koy → referans olarak kaydet.
              Check-in'de yeşil kutu bölgesi bu referansl karşılaştırılır.
            </p>

            {camStep === "idle" && (
              <Btn onClick={startCam}>Kamerayı Aç</Btn>
            )}

            {camStep === "loading" && (
              <Center><Spinner /><p className="text-xs text-yellow-600 mt-2">Açılıyor…</p></Center>
            )}

            {(camStep === "ready" || camStep === "saved") && (
              <>
                <div className="relative rounded-xl overflow-hidden border mb-3" style={{ borderColor: "#3c1a0a" }}>
                  <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    className="w-full block"
                    style={{ maxHeight: 200, objectFit: "cover", background: "#0a0500" }}
                  />
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: "25%", left: "25%", width: "50%", height: "50%",
                      border: "3px solid #00ff00", borderRadius: 6,
                      boxShadow: "0 0 10px rgba(0,255,0,0.3)",
                    }}
                  />
                </div>
                {camStep === "ready" && <Btn onClick={saveCam}>Referans Olarak Kaydet</Btn>}
                {camStep === "saved" && <p className="text-center text-xs text-yellow-500">✅ Kamera referansı kaydedildi</p>}
              </>
            )}

            {camResult && <ResultCard result={camResult} label="Kamera" />}
          </Section>

          {/* ── PC ──────────────────────────────────────────────── */}
          <Section title="🖥️ PC Kalibrasyonu">
            <p className="text-xs text-yellow-700 mb-3">
              Check-in'de ekranda aranacak referans görsel yükle.
              dHash (256-bit gradient hash) ile karşılaştırılır — farklı içerikler %50 civarı çıkar.
            </p>

            <label
              className="flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed
                         cursor-pointer transition py-5 mb-3"
              style={{ borderColor: pcFile ? "#ffd000" : "#3c1a0a", background: "rgba(60,26,10,0.4)" }}
            >
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {pcPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pcPreview} alt="Referans" className="max-h-28 rounded-lg object-contain" />
              ) : (
                <>
                  <span className="text-xl mb-1">🖼️</span>
                  <span className="text-xs text-yellow-700">PNG veya JPG yükle</span>
                </>
              )}
            </label>

            {pcFile && pcStep === "idle" && <Btn onClick={savePc}>Referans Olarak Kaydet</Btn>}
            {pcStep === "saved" && <p className="text-center text-xs text-yellow-500">✅ PC referansı kaydedildi</p>}

            {pcResult && <ResultCard result={pcResult} label="PC" />}
          </Section>
        </div>

        {/* ── TEST ──────────────────────────────────────────────── */}
        <div className="max-w-sm mx-auto space-y-3">
          <button
            onClick={runTest}
            disabled={!canTest}
            className="w-full py-3 rounded-xl text-sm font-bold transition"
            style={{
              background: canTest ? "#ffd000" : "#3c1a0a",
              color: canTest ? "#1c0a00" : "#5a2d0a",
              cursor: canTest ? "pointer" : "not-allowed",
            }}
          >
            {testing ? "Test çalışıyor…" : "Denetimi Test Et"}
          </button>

          {(camResult || pcResult) && (
            <p className="text-center text-xs text-yellow-800">
              Eşikler çok sıkı/gevşekse{" "}
              <code className="text-yellow-700">useMonitoring.ts</code> içindeki
              0.65 (kamera) / 0.72 (PC) değerlerini ayarla.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-5 space-y-2" style={{ background: "#1c0a00", borderColor: "#78350f" }}>
      <h2 className="text-sm font-bold text-yellow-300 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{
        background: ok ? "rgba(255,208,0,0.15)" : "rgba(60,26,10,0.6)",
        color: ok ? "#ffd000" : "#78350f",
        border: `1px solid ${ok ? "#78350f" : "#3c1a0a"}`,
      }}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function ResultCard({ result, label }: { result: CheckResult; label: string }) {
  const pct = (result.similarity * 100).toFixed(1);
  return (
    <div
      className="mt-3 rounded-xl px-4 py-3 text-sm text-center"
      style={{
        background: result.passed ? "rgba(0,255,0,0.07)" : "rgba(255,0,0,0.07)",
        border: `1px solid ${result.passed ? "#166534" : "#7f1d1d"}`,
        color: result.passed ? "#86efac" : "#fca5a5",
      }}
    >
      <span className="font-bold">{label}: {result.passed ? "Geçti ✓" : "Kaldı ✗"}</span>
      <span className="ml-2 opacity-70">({pct}% benzerlik)</span>
    </div>
  );
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

function Spinner() {
  return <div className="w-7 h-7 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center py-3">{children}</div>;
}
