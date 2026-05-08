"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  IAgoraRTCClient,
  ILocalVideoTrack,
  ILocalAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { api } from "@/lib/api";

export interface RemoteUser {
  uid: number;
  videoTrack: IRemoteVideoTrack | null;
  audioTrack: IRemoteAudioTrack | null;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface UseAgoraResult {
  joined: boolean;
  joinError: string | null;
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteUsers: RemoteUser[];
  cameraOn: boolean;
  micOn: boolean;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  leave: () => Promise<void>;
}

export function useAgora(
  roomId: string,
  accessToken: string | null,
  active: boolean
): UseAgoraResult {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);

  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  useEffect(() => {
    if (!active || !accessToken) return;

    let destroyed = false;

    async function init() {
      try {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
        if (!appId) {
          setJoinError("NEXT_PUBLIC_AGORA_APP_ID tanımlı değil");
          return;
        }

        const agoraData = await api.getAgoraToken(roomId, accessToken!);
        if (destroyed) return;

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
          await client.subscribe(user, mediaType);

          if (mediaType === "video") {
            const videoTrack = user.videoTrack ?? null;
            setRemoteUsers((prev) => {
              const exists = prev.find((r) => r.uid === (user.uid as number));
              if (exists) {
                return prev.map((r) =>
                  r.uid === (user.uid as number)
                    ? { ...r, videoTrack, hasVideo: true }
                    : r
                );
              }
              return [...prev, { uid: user.uid as number, videoTrack, audioTrack: null, hasVideo: true, hasAudio: false }];
            });
            setTimeout(() => {
              const el = document.getElementById(`agora-remote-${user.uid}`);
              if (el && videoTrack) videoTrack.play(el);
            }, 100);
          }

          if (mediaType === "audio") {
            const audioTrack = user.audioTrack ?? null;
            setRemoteUsers((prev) => {
              const exists = prev.find((r) => r.uid === (user.uid as number));
              if (exists) {
                return prev.map((r) =>
                  r.uid === (user.uid as number)
                    ? { ...r, audioTrack, hasAudio: true }
                    : r
                );
              }
              return [...prev, { uid: user.uid as number, videoTrack: null, audioTrack, hasVideo: false, hasAudio: true }];
            });
            audioTrack?.play();
          }
        });

        client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
          setRemoteUsers((prev) =>
            prev.map((r) =>
              r.uid === (user.uid as number)
                ? {
                    ...r,
                    videoTrack: mediaType === "video" ? null : r.videoTrack,
                    audioTrack: mediaType === "audio" ? null : r.audioTrack,
                    hasVideo: mediaType === "video" ? false : r.hasVideo,
                    hasAudio: mediaType === "audio" ? false : r.hasAudio,
                  }
                : r
            )
          );
        });

        client.on("user-left", (user: IAgoraRTCRemoteUser) => {
          setRemoteUsers((prev) => prev.filter((r) => r.uid !== (user.uid as number)));
        });

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Agora sunucusuna bağlanılamadı (12s)")), 12000)
        );
        await Promise.race([
          client.join(appId, agoraData.channelName, agoraData.token, agoraData.uid),
          timeout,
        ]);
        if (!destroyed) setJoined(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Agora bağlantısı başarısız";
        console.error("Agora init hatası:", err);
        setJoinError(msg);
      }
    }

    init();

    return () => {
      destroyed = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, roomId, accessToken]);

  async function cleanup() {
    try {
      localVideoTrackRef.current?.stop();
      localVideoTrackRef.current?.close();
      localVideoTrackRef.current = null;

      localAudioTrackRef.current?.stop();
      localAudioTrackRef.current?.close();
      localAudioTrackRef.current = null;

      await clientRef.current?.leave();
      clientRef.current = null;
    } catch (e) {
      console.warn("Agora cleanup:", e);
    }
    setJoined(false);
    setRemoteUsers([]);
    setCameraOn(false);
    setMicOn(false);
  }

  const toggleCamera = useCallback(async () => {
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const client = clientRef.current;

      if (cameraOn && localVideoTrackRef.current) {
        if (client) await client.unpublish(localVideoTrackRef.current).catch(() => {});
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
        setCameraOn(false);
      } else {
        const track = await AgoraRTC.createCameraVideoTrack();
        localVideoTrackRef.current = track;
        if (localVideoRef.current) track.play(localVideoRef.current);
        if (client) await client.publish(track).catch(() => {});
        setCameraOn(true);
      }
    } catch (err) {
      console.error("Kamera toggle hatası:", err);
    }
  }, [cameraOn]);

  const toggleMic = useCallback(async () => {
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const client = clientRef.current;

      if (micOn && localAudioTrackRef.current) {
        if (client) await client.unpublish(localAudioTrackRef.current).catch(() => {});
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
        setMicOn(false);
      } else {
        const track = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = track;
        if (client) await client.publish(track).catch(() => {});
        setMicOn(true);
      }
    } catch (err) {
      console.error("Mikrofon toggle hatası:", err);
    }
  }, [micOn]);

  const leave = useCallback(async () => {
    await cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    joined,
    joinError,
    localVideoRef,
    remoteUsers,
    cameraOn,
    micOn,
    toggleCamera,
    toggleMic,
    leave,
  };
}
