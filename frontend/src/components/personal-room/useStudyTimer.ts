"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyMethod } from "@/lib/api";

export type TimerPhase = "work" | "break" | "done";

export interface TimerState {
  phase: TimerPhase;
  remaining: number; // seconds
  currentRound: number;
  totalRounds: number;
  workMinutes: number;
  breakMinutes: number;
}

interface TimerConfig {
  workMinutes: number;
  breakMinutes: number;
  totalRounds: number;
  method: StudyMethod;
}

interface TimerCallbacks {
  onRoundComplete: (round: number) => void;
  onSessionDone: () => void;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomMinutes() {
  return { work: randomBetween(10, 45), brk: randomBetween(5, 15) };
}

export function useStudyTimer(config: TimerConfig, callbacks: TimerCallbacks) {
  const { workMinutes: initWork, breakMinutes: initBreak, totalRounds, method } = config;
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  function initialMinutes() {
    if (method === "RASTGELE") {
      const r = getRandomMinutes();
      return { work: r.work, brk: r.brk };
    }
    return { work: initWork, brk: initBreak };
  }

  const [phase, setPhase] = useState<TimerPhase>("work");
  const [currentRound, setCurrentRound] = useState(1);
  const [workMins, setWorkMins] = useState(() => initialMinutes().work);
  const [breakMins, setBreakMins] = useState(() => initialMinutes().brk);
  const [remaining, setRemaining] = useState(() => initialMinutes().work * 60);
  const [running, setRunning] = useState(true);

  const phaseRef = useRef(phase);
  const roundRef = useRef(currentRound);
  const workMinsRef = useRef(workMins);
  const breakMinsRef = useRef(breakMins);
  phaseRef.current = phase;
  roundRef.current = currentRound;
  workMinsRef.current = workMins;
  breakMinsRef.current = breakMins;

  // Pause/resume (used when CheckInModal is open)
  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => setRunning(true), []);

  useEffect(() => {
    if (!running || phase === "done") return;

    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);

          if (phaseRef.current === "work") {
            const round = roundRef.current;
            cbRef.current.onRoundComplete(round);

            if (round >= totalRounds) {
              setPhase("done");
              cbRef.current.onSessionDone();
              return 0;
            }

            setPhase("break");
            return breakMinsRef.current * 60;
          } else {
            // break → next work round
            const nextRound = roundRef.current + 1;
            setCurrentRound(nextRound);

            if (method === "RASTGELE") {
              const r = getRandomMinutes();
              setWorkMins(r.work);
              setBreakMins(r.brk);
              setPhase("work");
              return r.work * 60;
            }

            setPhase("work");
            return workMinsRef.current * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [running, phase, totalRounds, method]);

  return {
    phase,
    remaining,
    currentRound,
    totalRounds,
    workMinutes: workMins,
    breakMinutes: breakMins,
    pause,
    resume,
  } satisfies TimerState & { pause: () => void; resume: () => void };
}
