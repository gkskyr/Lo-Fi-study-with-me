"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { BeehiveButton } from "@/components/login/BeehiveButton";
import { LogoSection } from "@/components/login/LogoSection";
import { AuthForm } from "@/components/login/AuthForm";
import { NavButtons } from "@/components/login/NavButtons";
import { useAuthStore } from "@/store/authStore";

type PageState = "idle" | "auth" | "loggedIn";

export default function Home() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const { username, isLoggedIn, setAuth } = useAuthStore();

  const effectiveState: PageState = isLoggedIn ? "loggedIn" : pageState;

  function handleAuthSuccess(newUsername: string, accessToken: string) {
    setAuth(newUsername, accessToken);
    setPageState("loggedIn");
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-7">
        <AnimatePresence mode="wait">
          {effectiveState === "idle" && (
            <BeehiveButton
              key="beehive"
              onReveal={() => setPageState("auth")}
            />
          )}
        </AnimatePresence>

        {effectiveState !== "idle" && (
          <>
            <LogoSection
              username={effectiveState === "loggedIn" ? username : null}
            />

            <AnimatePresence mode="wait">
              {effectiveState === "auth" && (
                <AuthForm key="form" onSuccess={handleAuthSuccess} />
              )}
              {effectiveState === "loggedIn" && (
                <NavButtons key="nav" />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </main>
  );
}
