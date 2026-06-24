"use client";

import { useCallback, useRef, useState } from "react";
import { getBoxPixels, captureRegion, thumbprint, similarity } from "@/lib/monitoring";
import { isSafari } from "@/lib/clip";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

// ── Camera calibration stays in IDB (screen capture is client-only) ───────────

const IDB_DB = "kozan-monitoring";
const IDB_STORE = "calibration";

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbPut(key: string, value: unknown) {
  const db = await openDB();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => res((req.result as T) ?? null);
    req.onerror = () => rej(req.error);
  });
}

interface CamStored {
  cam?: number[];
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckResult {
  passed: boolean;
  similarity: number;
}

export interface UseMonitoringReturn {
  cameraCalibrated: boolean;
  pcCalibrated: boolean;
  loadCalibration: (userId: string) => Promise<{ camera: boolean; pc: boolean }>;
  calibrateCamera: (video: HTMLVideoElement, userId: string) => Promise<void>;
  calibratePC: (file: File, userId: string) => Promise<void>;
  checkCamera: (video: HTMLVideoElement) => Promise<CheckResult>;
  checkPC: () => Promise<CheckResult>;
  checkPCSafari: (file: File) => Promise<CheckResult>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMonitoring(): UseMonitoringReturn {
  const [cameraCalibrated, setCameraCalibrated] = useState(false);
  const [pcCalibrated, setPcCalibrated] = useState(false);
  const camThumbRef = useRef<number[] | null>(null);
  const { accessToken } = useAuthStore();

  // ── Calibration load ───────────────────────────────────────────────────────

  const loadCalibration = useCallback(async (userId: string) => {
    // Camera: from IDB
    const stored = await idbGet<CamStored>(`cam-${userId}`);
    if (stored?.cam) { camThumbRef.current = stored.cam; setCameraCalibrated(true); }

    // PC: from backend
    let pcOk = false;
    if (accessToken) {
      try {
        const status = await api.monitoringStatus(accessToken);
        pcOk = status.calibrated;
        if (pcOk) setPcCalibrated(true);
      } catch { /* not calibrated */ }
    }

    return { camera: !!stored?.cam, pc: pcOk };
  }, [accessToken]);

  // ── Camera calibration (IDB) ───────────────────────────────────────────────

  const calibrateCamera = useCallback(async (video: HTMLVideoElement, userId: string) => {
    const box = getBoxPixels(video);
    const img = captureRegion(video, box);
    camThumbRef.current = thumbprint(img);
    setCameraCalibrated(true);
    await idbPut(`cam-${userId}`, { cam: camThumbRef.current });
  }, []);

  // ── PC calibration (backend) ───────────────────────────────────────────────

  const calibratePC = useCallback(async (file: File, _userId: string) => {
    if (!accessToken) throw new Error("Oturum açık değil.");
    await api.monitoringCalibrate(file, accessToken);
    setPcCalibrated(true);
  }, [accessToken]);

  // ── Camera check (local) ───────────────────────────────────────────────────

  const checkCamera = useCallback(async (video: HTMLVideoElement): Promise<CheckResult> => {
    if (!camThumbRef.current) return { passed: true, similarity: 1 };
    const box = getBoxPixels(video);
    const current = captureRegion(video, box);
    const sim = similarity(camThumbRef.current, thumbprint(current));
    return { passed: sim > 0.65, similarity: sim };
  }, []);

  // ── PC check — capture screen, send to backend ────────────────────────────

  const checkPC = useCallback(async (): Promise<CheckResult> => {
    if (!accessToken) return { passed: false, similarity: 0 };
    if (isSafari()) return { passed: false, similarity: 0 };

    let stream: MediaStream | null = null;
    let sv: HTMLVideoElement | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      sv = document.createElement("video");
      sv.muted = true;
      sv.playsInline = true;
      sv.style.cssText = "position:fixed;top:0;left:0;opacity:0.01;pointer-events:none;width:1px;height:1px";
      document.body.appendChild(sv);

      // handler önce — srcObject sonra (race condition önlenir)
      await new Promise<void>((resolve, reject) => {
        const tid = setTimeout(() => reject(new Error("video timeout")), 8000);
        sv!.onloadedmetadata = () => { clearTimeout(tid); resolve(); };
        sv!.srcObject = stream;
      });

      await sv.play();

      // frame bekleme + 2sn fallback (gizli video event tetiklemeyebilir)
      await Promise.race([
        new Promise<void>((r) => {
          if ("requestVideoFrameCallback" in sv!) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sv as any).requestVideoFrameCallback(r);
          } else {
            sv!.ontimeupdate = () => r();
          }
        }),
        new Promise<void>((r) => setTimeout(r, 2000)),
      ]);

      const canvas = document.createElement("canvas");
      canvas.width = sv.videoWidth;
      canvas.height = sv.videoHeight;
      canvas.getContext("2d")!.drawImage(sv, 0, 0);
      const blob = await new Promise<Blob>((r) =>
        canvas.toBlob((b) => r(b!), "image/jpeg", 0.85),
      );

      const result = await api.monitoringCheck(blob, accessToken);
      return { passed: result.passed, similarity: result.similarity };
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      sv?.remove();
    }
  }, [accessToken]);

  // ── PC check — Safari: user uploads screenshot, send to backend ───────────

  const checkPCSafari = useCallback(async (file: File): Promise<CheckResult> => {
    if (!accessToken) return { passed: false, similarity: 0 };
    const result = await api.monitoringCheck(file, accessToken);
    return { passed: result.passed, similarity: result.similarity };
  }, [accessToken]);

  return {
    cameraCalibrated, pcCalibrated, loadCalibration,
    calibrateCamera, calibratePC,
    checkCamera, checkPC, checkPCSafari,
  };
}
