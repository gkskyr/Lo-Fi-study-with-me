"use client";

import { useState, useEffect } from "react";
import type { StudyMethod, MonitoringType, StudySessionConfig } from "@/lib/api";

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

// Soft palette constants
const C = {
  bg: "#ffec8c",
  card: "#fef3c7",
  border: "#fde68a",
  borderActive: "#fbbf24",
  accent: "#fbbf24",
  accentDark: "#f59e0b",
  orange: "#fb923c",
  textDark: "#92400e",
  textMed: "#b45309",
  textLight: "#d97706",
  btnPrimary: "#fbbf24",
  btnPrimaryText: "#78350f",
  btnSecondaryBorder: "#fde68a",
  btnSecondaryText: "#b45309",
  disabled: "#fef3c7",
  disabledText: "#d97706",
};

const METHOD_PRESETS: {
  id: StudyMethod;
  label: string;
  desc: string;
  work: number;
  brk: number;
  rounds: number;
}[] = [
  { id: "POMODORO",       label: "Pomodoro",       desc: "25 dk çalış · 5 dk mola · 5 tekrar",  work: 25, brk: 5,  rounds: 5 },
  { id: "BASLAYAMIYORUM", label: "Başlayamıyorum",  desc: "10 dk çalış · 5 dk mola · 5 tekrar",  work: 10, brk: 5,  rounds: 5 },
  { id: "KLASIK",         label: "Klasik",          desc: "45 dk çalış · 15 dk mola · 5 tekrar", work: 45, brk: 15, rounds: 5 },
  { id: "RASTGELE",       label: "Rastgele",        desc: "Rastgele süreler · 5 tekrar",          work: 25, brk: 10, rounds: 5 },
  { id: "OZEL",           label: "Özel",            desc: "Kendi süreni belirle",                 work: 25, brk: 5,  rounds: 5 },
];

interface Props {
  onComplete: (config: StudySessionConfig) => void;
}

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [method, setMethod] = useState<StudyMethod | null>(null);
  const [customWork, setCustomWork] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);
  const [customRounds, setCustomRounds] = useState(5);
  const [wantsMonitoring, setWantsMonitoring] = useState<boolean | null>(null);
  const [monitoringType, setMonitoringType] = useState<MonitoringType | null>(null);
  const [pcSupported, setPcSupported] = useState(false);

  useEffect(() => {
    setPcSupported(
      typeof window !== "undefined" &&
        typeof window.navigator?.mediaDevices?.getDisplayMedia === "function",
    );
  }, []);

  function getConfig(): StudySessionConfig {
    const preset = METHOD_PRESETS.find((p) => p.id === method)!;
    return {
      topic,
      method: method!,
      workMinutes:  method === "OZEL" ? customWork   : preset.work,
      breakMinutes: method === "OZEL" ? customBreak  : preset.brk,
      totalRounds:  method === "OZEL" ? customRounds : preset.rounds,
      monitoringType: wantsMonitoring ? monitoringType! : "NONE",
    };
  }

  function canAdvanceStep1() { return topic.trim().length > 0; }
  function canAdvanceStep2() {
    if (!method) return false;
    if (method === "OZEL") return customWork >= 1 && customBreak >= 1 && customRounds >= 1;
    return true;
  }
  function canFinishStep3() {
    if (wantsMonitoring === null) return false;
    if (!wantsMonitoring) return true;
    return monitoringType !== null;
  }

  function finish() { onComplete(getConfig()); }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: C.bg }}>
      <div className="w-full max-w-lg">

        {/* İlerleme göstergesi */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                style={{
                  width: 28, height: 28,
                  backgroundColor: step >= s ? C.accent : C.card,
                  clipPath: HEX_CLIP,
                  border: `2px solid ${step >= s ? C.accentDark : C.border}`,
                  transition: "background-color 0.3s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  color: step >= s ? C.btnPrimaryText : C.textLight,
                }}
              >
                {s}
              </div>
              {s < 3 && (
                <div className="w-10 h-0.5 rounded"
                  style={{ backgroundColor: step > s ? C.accent : C.border }} />
              )}
            </div>
          ))}
        </div>

        {/* ADIM 1 */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: C.textDark }}>Bugün neye çalışacaksın?</h2>
            <p className="text-sm mb-6" style={{ color: C.textLight }}>Bu kameranın üstünde tüm oturum boyunca görünecek.</p>
            <input
              className="w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none transition"
              style={{
                background: C.card,
                borderColor: C.border,
                color: C.textDark,
              }}
              placeholder="ör. Matematik — Türev ve İntegral"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canAdvanceStep1() && setStep(2)}
              autoFocus
            />
            <div className="flex justify-end mt-6">
              <WizardButton disabled={!canAdvanceStep1()} onClick={() => setStep(2)}>
                İleri →
              </WizardButton>
            </div>
          </div>
        )}

        {/* ADIM 2 */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: C.textDark }}>Çalışma yöntemi</h2>
            <p className="text-sm mb-5" style={{ color: C.textLight }}>Bir yöntem seç.</p>
            <div className="flex flex-col gap-3">
              {METHOD_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setMethod(p.id)}
                  className="text-left px-4 py-3 rounded-xl border-2 transition"
                  style={{
                    borderColor: method === p.id ? C.borderActive : C.border,
                    background: method === p.id ? "#fef9c3" : C.card,
                    color: method === p.id ? C.textDark : C.textMed,
                  }}
                >
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            {method === "OZEL" && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: C.textLight }}>Çalışma (dk)</label>
                  <NumberInput value={customWork} min={1} onChange={setCustomWork} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: C.textLight }}>Mola (dk)</label>
                  <NumberInput value={customBreak} min={1} onChange={setCustomBreak} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: C.textLight }}>Tekrar</label>
                  <NumberInput value={customRounds} min={1} onChange={setCustomRounds} />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <WizardButton secondary onClick={() => setStep(1)}>← Geri</WizardButton>
              <WizardButton disabled={!canAdvanceStep2()} onClick={() => setStep(3)}>İleri →</WizardButton>
            </div>
          </div>
        )}

        {/* ADIM 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: C.textDark }}>Denetim ister misin?</h2>
            <p className="text-sm mb-5" style={{ color: C.textLight }}>
              Denetim açıksa belirli aralıklarla çalıştığını doğrulamanı isteyeceğiz.
            </p>

            <div className="flex gap-3 mb-6">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => { setWantsMonitoring(v); if (!v) setMonitoringType(null); }}
                  className="flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition"
                  style={{
                    borderColor: wantsMonitoring === v ? C.borderActive : C.border,
                    background: wantsMonitoring === v ? "#fef9c3" : C.card,
                    color: wantsMonitoring === v ? C.textDark : C.textMed,
                  }}
                >
                  {v ? "Evet" : "Hayır"}
                </button>
              ))}
            </div>

            {wantsMonitoring && (
              <div>
                <p className="text-sm mb-3" style={{ color: C.textLight }}>Nasıl çalışıyorsun?</p>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ...(pcSupported ? [{ id: "PC",   label: "💻 PC / Ekran paylaşımı" }] : []),
                      { id: "NOTEBOOK", label: "📓 Defter / Kitap (kamera ile)" },
                      ...(pcSupported ? [{ id: "BOTH", label: "💻📓 Her ikisi birden" }] : []),
                    ] as { id: MonitoringType; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setMonitoringType(opt.id)}
                      className="text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition"
                      style={{
                        borderColor: monitoringType === opt.id ? C.borderActive : C.border,
                        background: monitoringType === opt.id ? "#fef9c3" : C.card,
                        color: monitoringType === opt.id ? C.textDark : C.textMed,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <WizardButton secondary onClick={() => setStep(2)}>← Geri</WizardButton>
              <WizardButton disabled={!canFinishStep3()} onClick={finish}>
                Oturumu Başlat ▶
              </WizardButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WizardButton({
  children, onClick, disabled, secondary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-2.5 rounded-xl text-sm font-semibold transition"
      style={{
        background: secondary ? "transparent" : disabled ? "#fef3c7" : "#fbbf24",
        color: secondary ? "#b45309" : disabled ? "#d97706" : "#78350f",
        border: secondary ? "2px solid #fde68a" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function NumberInput({ value, min, onChange }: { value: number; min: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
      className="w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none transition"
      style={{ background: "#fef3c7", borderColor: "#fde68a", color: "#92400e" }}
    />
  );
}
