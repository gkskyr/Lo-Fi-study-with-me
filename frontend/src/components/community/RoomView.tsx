"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { Participant } from "./useRoomSocket";
import type { RemoteUser } from "./useAgora";

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const AVATAR_COLORS = ["#ffb940", "#ffd34f", "#fb923c", "#fbbf24", "#f59e0b", "#fdba74"];

function colorFor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function uuidToUid(uuid: string): number {
  return parseInt(uuid.replace(/-/g, "").slice(0, 8), 16) >>> 0;
}

function HexAvatar({ name, size = 64 }: { name: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center font-bold shadow-md"
      style={{
        width: size,
        height: size,
        backgroundColor: colorFor(name),
        clipPath: HEX_CLIP,
        fontSize: size * 0.35,
        color: "#78350f",
      }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

interface ParticipantTileProps {
  username: string;
  uid?: number;
  remoteUser?: RemoteUser;
  isLocal?: boolean;
  localVideoRef?: React.RefObject<HTMLDivElement | null>;
  cameraOn?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

function ParticipantTile({
  username,
  uid,
  remoteUser,
  isLocal,
  localVideoRef,
  cameraOn,
  onContextMenu,
}: ParticipantTileProps) {
  const hasVideo = isLocal ? cameraOn : remoteUser?.hasVideo;

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
      className="relative rounded-2xl overflow-hidden flex items-center justify-center border-2 transition-colors"
      style={{
        aspectRatio: "16/9",
        background: "#fef3c7",
        borderColor: "#fde68a",
      }}
      onContextMenu={onContextMenu}
    >
      {isLocal ? (
        <>
          <div
            ref={localVideoRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: hasVideo ? "block" : "none" }}
          />
          {!hasVideo && <HexAvatar name={username} size={72} />}
        </>
      ) : (
        <>
          <div
            id={`agora-remote-${uid}`}
            className="absolute inset-0 w-full h-full"
            style={{ display: hasVideo ? "block" : "none" }}
          />
          {!hasVideo && <HexAvatar name={username} size={72} />}
        </>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
        style={{ background: "rgba(254,243,199,0.85)" }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 flex items-center justify-center text-[7px] font-bold"
            style={{ backgroundColor: colorFor(username), clipPath: HEX_CLIP, color: "#78350f" }}
          >
            {username[0]?.toUpperCase()}
          </div>
          <span className="text-xs font-medium truncate" style={{ color: "#92400e" }}>
            {isLocal ? `${username} (sen)` : username}
          </span>
        </div>
        {!hasVideo && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#fde68a", color: "#b45309" }}>
            kamera kapalı
          </span>
        )}
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
  joined: boolean;
  onToggleCamera: () => void;
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
  joined,
  onToggleCamera,
  onLeave,
  onSpam,
}: Props) {
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
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden border-2"
      style={{ background: "#ffec8c", borderColor: "#fde68a" }}
    >
      {/* Başlık */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ background: "#fef3c7", borderColor: "#fde68a" }}
      >
        <div className="flex items-center gap-2.5">
          <Image src="/images/hexagon (1).png" alt="" width={22} height={22} />
          <span className="text-sm font-bold tracking-wide" style={{ color: "#92400e" }}>{roomTitle}</span>
          {joined ? (
            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#16a34a" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              bağlı
            </span>
          ) : (
            <span className="text-[10px] animate-pulse" style={{ color: "#b45309" }}>bağlanıyor…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 flex items-center justify-center text-[8px] font-bold"
            style={{ backgroundColor: "#ffb940", clipPath: HEX_CLIP, color: "#78350f" }}
          >
            {participants.length}
          </div>
          <span className="text-xs" style={{ color: "#b45309" }}>katılımcı</span>
        </div>
      </div>

      {/* Video grid */}
      <div className={`flex-1 grid ${gridCols} gap-3 p-4 overflow-auto`}>
        <ParticipantTile
          username={localUsername}
          isLocal
          localVideoRef={localVideoRef}
          cameraOn={cameraOn}
        />
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
        {others.length === 0 && (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed gap-3"
            style={{ aspectRatio: "16/9", borderColor: "#fde68a" }}
          >
            <div
              className="w-12 h-12 flex items-center justify-center opacity-40"
              style={{ backgroundColor: "#ffb940", clipPath: HEX_CLIP }}
            />
            <p className="text-sm text-center px-4" style={{ color: "#b45309" }}>
              Başka kimse yok
              <br />
              <span className="text-xs" style={{ color: "#d97706" }}>Biri katılınca burada görünür</span>
            </p>
          </div>
        )}
      </div>

      {/* Alt kontroller */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-3 border-t"
        style={{ background: "#fef3c7", borderColor: "#fde68a" }}
      >
        <button
          onClick={onToggleCamera}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold border transition"
          style={
            cameraOn
              ? { background: "#ffb940", borderColor: "#f59e0b", color: "#78350f" }
              : { background: "#fef3c7", borderColor: "#fde68a", color: "#b45309" }
          }
        >
          {cameraOn ? "📷 Kamera Açık" : "📷 Kamera Kapalı"}
        </button>

        <button
          onClick={onLeave}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold border transition"
          style={{ background: "#fee2e2", borderColor: "#fca5a5", color: "#dc2626" }}
        >
          🚪 Odadan Çık
        </button>
      </div>
    </div>
  );
}
