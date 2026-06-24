"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

type FormMode = "login" | "register" | "otp";

interface AuthFormProps {
  onSuccess: (username: string, accessToken: string) => void;
}

const inputClass =
  "w-full bg-yellow-100 border border-yellow-300 rounded-2xl px-5 py-3.5 outline-none focus:border-honey transition text-gray-700 placeholder-gray-400";

const btnClass =
  "w-full bg-honey hover:bg-honey-dark transition rounded-2xl py-3.5 font-semibold text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-base";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function PasswordInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
        tabIndex={-1}
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<FormMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [otp, setOtp] = useState("");

  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email: loginEmail, password: loginPassword });
      onSuccess(res.username, res.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.register({
        email: regEmail,
        username: regUsername,
        name: regName,
        password: regPassword,
      });
      setPendingEmail(regEmail);
      setMode("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyEmail({ email: pendingEmail, code: otp });
      onSuccess(res.username, res.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Doğrulama kodu geçersiz veya süresi dolmuş.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="w-full max-w-md"
    >
      {mode !== "otp" && (
        <div className="flex bg-yellow-100 border border-yellow-300 rounded-2xl p-1 mb-5">
          {(["login", "register"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => switchMode(tab)}
              className={`flex-1 py-2.5 rounded-xl font-medium transition ${
                mode === tab
                  ? "bg-honey text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {mode === "login" && (
          <motion.form
            key="login"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleLogin}
            className="flex flex-col gap-3"
          >
            <input
              type="email"
              placeholder="E-posta"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className={inputClass}
            />
            <PasswordInput
              placeholder="Şifre"
              value={loginPassword}
              onChange={setLoginPassword}
            />
            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </motion.form>
        )}

        {mode === "register" && (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleRegister}
            className="flex flex-col gap-3"
          >
            <input
              type="email"
              placeholder="E-posta"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              className={inputClass}
            />
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 select-none">
                @
              </span>
              <input
                type="text"
                placeholder="kullanici_adi"
                value={regUsername}
                onChange={(e) =>
                  setRegUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
                required
                className={`${inputClass} pl-9`}
              />
            </div>
            <input
              type="text"
              placeholder="Ad Soyad"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
              className={inputClass}
            />
            <PasswordInput
              placeholder="Şifre (min. 8 kar., 1 büyük, 1 rakam, 1 özel)"
              value={regPassword}
              onChange={setRegPassword}
            />
            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
            </button>
          </motion.form>
        )}

        {mode === "otp" && (
          <motion.form
            key="otp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleVerify}
            className="flex flex-col gap-3"
          >
            <p className="text-center text-gray-600">
              <strong>{pendingEmail}</strong> adresine 6 haneli doğrulama kodu
              gönderildi.
            </p>
            <input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              maxLength={6}
              required
              className={`${inputClass} text-center tracking-widest text-2xl font-mono`}
            />
            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className={btnClass}
            >
              {loading ? "Doğrulanıyor..." : "Doğrula"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
