"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { Participant } from "./useRoomSocket";
import type { RemoteUser } from "./useAgora";

const AVATAR_COLORS = [
  "#ffd000", "#fb923c", "#a3e635", "#38bdf8", "#c084fc", "#f472b6",
];

function colorFor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Backend ile aynı uid hesaplama
function uuidToUid(uuid: string): number {
  return parseInt(uuid.replace(/-/g, "").slice(0, 8), 16) >>> 0;
}

interface ParticipantTileProps {
  username: string;
  uid?: number;
  remoteUser?: RemoteUser;
  isLocal?: boolean;
  localVideoRef?: React.RefObject<HTMLDivElement | null>;
  cameraOn?: boolean;
  micOn?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

function ParticipantTile({
  username,
  uid,
  remoteUser,
  isLocal,
  localVideoRef,
  cameraOn,
  micOn,
  onContextMenu,
}: ParticipantTileProps) {
  const hasVideo = isLocal ? cameraOn : remoteUser?.hasVideo;
  const hasAudio = isLocal ? micOn : remoteUser?.hasAudio;

  // Uzak video track'ini DOM'a bağla
  useEffect(() => {
    if (!isLocal && remoteUser?.hasVideo && uid) {
      const el = document.getElementById(`agora-remote-${uid}`);
      if (el && remoteUser.videoTrack) {
        (remoteUser.videoTrack as { play: (el: HTMLElement) => void }).play(el);
      }
    }
  }, [isLocal, remoteUser?.hasVideo, remoteUser?.videoTrack, uid]);

  return (
    <div
      className="relative bg-amber-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-yellow-800 hover:border-yellow-500 transition"
      style={{ aspectRatio: "16/9" }}
      onContextMenu={onContextMenu}
    >
      {/* Video alanı — div HER ZAMAN DOM'da; track.play() ref'i null bulmaz */}
      {isLocal ? (
        <>
          <div
            ref={localVideoRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: hasVideo ? "block" : "none" }}
          />
          {!hasVideo && (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg border-4 border-yellow-400"
              style={{ backgroundColor: colorFor(username) }}
            >
              {username[0]?.toUpperCase()}
            </div>
          )}
        </>
      ) : (
        <>
          <div
            id={`agora-remote-${uid}`}
            className="absolute inset-0 w-full h-full"
            style={{ display: hasVideo ? "block" : "none" }}
          />
          {!hasVideo && (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg border-4 border-yellow-400"
              style={{ backgroundColor: colorFor(username) }}
            >
              {username[0]?.toUpperCase()}
            </div>
          )}
        </>
      )}

      {/* Alt bilgi şeridi */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-yellow-100 truncate">
          {isLocal ? `${username} (sen)` : username}
        </span>
        <div className="flex items-center gap-1.5">
          {!hasVideo && (
            <span className="text-[10px] bg-red-600/80 text-white px-1.5 py-0.5 rounded-full">
              kamera kapalı
            </span>
          )}
          {hasAudio && (
            <span className="text-[10px] text-green-400">🎙</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  roomTitle: string;
  participants: Participant[];
  remoteUsers: RemoteUser[];
  localUsername: string;
  localUserId: string;
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  cameraOn: boolean;
  micOn: boolean;
  joined: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onLeave: () => void;
  onSpam: (userId: string, username: string) => void;
}

export default function RoomView({
  roomTitle,
  participants,
  remoteUsers,
  localUsername,
  localUserId,
  localVideoRef,
  cameraOn,
  micOn,
  joined,
  onToggleCamera,
  onToggleMic,
  onLeave,
  onSpam,
}: Props) {
  // Socket katılımcılarına Agora track'lerini eşleştir
  function getRemoteForParticipant(p: Participant): RemoteUser | undefined {
    const uid = uuidToUid(p.userId);
    return remoteUsers.find((r) => r.uid === uid);
  }

  const others = participants.filter((p) => p.userId !== localUserId);

  const gridCols =
    others.length === 0
      ? "grid-cols-1"
      : others.length === 1
      ? "grid-cols-2"
      : others.length <= 3
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className="flex flex-col h-full bg-amber-950 rounded-2xl overflow-hidden border-2 border-yellow-700">
      {/* Başlık */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-900 border-b border-yellow-800">
        <div className="flex items-center gap-2">
          <Image src="/images/hexagon (1).png" alt="" width={24} height={24} />
          <span className="text-sm font-bold text-yellow-100">{roomTitle}</span>
          {joined && (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              bağlı
            </span>
          )}
        </div>
        <span className="text-xs text-yellow-500">
          {participants.length} katılımcı
        </span>
      </div>

      {/* Video grid */}
      <div className={`flex-1 grid ${gridCols} gap-3 p-4 overflow-auto`}>
        {/* Kendi tile'ı */}
        <ParticipantTile
          username={localUsername}
          isLocal
          localVideoRef={localVideoRef}
          cameraOn={cameraOn}
          micOn={micOn}
        />

        {/* Diğer katılımcılar */}
        {others.map((p) => {
          const remote = getRemoteForParticipant(p);
          return (
            <ParticipantTile
              key={p.userId}
              username={p.username}
              uid={uuidToUid(p.userId)}
              remoteUser={remote}
              onContextMenu={(e) => {
                e.preventDefault();
                onSpam(p.userId, p.username);
              }}
            />
          );
        })}

        {/* Kimse yoksa placeholder */}
        {others.length === 0 && (
          <div className="flex items-center justify-center bg-amber-900/40 rounded-2xl border-2 border-dashed border-yellow-700" style={{ aspectRatio: "16/9" }}>
            <p className="text-yellow-600 text-sm text-center px-4">
              Başka kimse yok<br />
              <span className="text-xs text-yellow-700">Biri katılınca burada görünür</span>
            </p>
          </div>
        )}
      </div>

      {/* Alt kontroller */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 bg-amber-900 border-t border-yellow-800">
        {!joined && (
          <span className="text-xs text-yellow-500 animate-pulse">Bağlanıyor…</span>
        )}

        <button
          onClick={onToggleMic}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
            micOn
              ? "bg-yellow-400 border-yellow-500 text-amber-900"
              : "bg-amber-800 border-yellow-700 text-yellow-300 hover:bg-amber-700"
          }`}
        >
          {micOn ? "🎙 Mikrofon" : "🔇 Sessiz"}
        </button>

        <button
          onClick={onToggleCamera}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
            cameraOn
              ? "bg-yellow-400 border-yellow-500 text-amber-900"
              : "bg-amber-800 border-yellow-700 text-yellow-300 hover:bg-amber-700"
          }`}
        >
          {cameraOn ? "📷 Kamera" : "📷 Kapalı"}
        </button>

        <button
          onClick={onLeave}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-700 border border-red-600 text-white hover:bg-red-600 transition"
        >
          🚪 Odadan Çık
        </button>
      </div>
    </div>
  );
}
