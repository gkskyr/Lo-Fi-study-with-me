"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Participant, Toast } from "./useRoomSocket";

const AVATAR_COLORS = [
  "#ffd000", "#fb923c", "#a3e635", "#38bdf8", "#c084fc", "#f472b6",
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  participants: Participant[];
  toasts: Toast[];
  connected: boolean;
  onSpam: (userId: string, username: string) => void;
}

export default function HexagonPanel({
  collapsed,
  onToggle,
  participants,
  toasts,
  connected,
  onSpam,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    userId: string;
    username: string;
  } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const panelW = collapsed ? 140 : 480;
  const panelH = collapsed ? 160 : 520;

  function handleRightClick(
    e: React.MouseEvent,
    userId: string,
    username: string
  ) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, userId, username });
  }

  function colorFor(index: number) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }

  return (
    <div
      className="relative"
      onClick={() => contextMenu && setContextMenu(null)}
    >
      <motion.div
        animate={{ width: panelW, height: panelH }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="relative overflow-hidden rounded-2xl border-2 border-yellow-300 bg-amber-900"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          clipPath:
            "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        }}
      >
        {/* lofi girl arka plan — collapsed veya katılımcı yokken görünür */}
        <AnimatePresence>
          {(collapsed || participants.length === 0) && (
            <motion.div
              key="lofi"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <Image
                src="/images/lofi-girl.jpg"
                alt="lofi girl"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-amber-900/30" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Katılımcı grid — expanded ve katılımcı varsa */}
        <AnimatePresence>
          {!collapsed && participants.length > 0 && (
            <motion.div
              key="participants"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-6 grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(participants.length, 2)}, 1fr)`,
                alignContent: "center",
              }}
            >
              {participants.map((p, i) => (
                <div
                  key={p.userId}
                  className="flex flex-col items-center gap-2 cursor-pointer select-none"
                  onContextMenu={(e) =>
                    handleRightClick(e, p.userId, p.username)
                  }
                >
                  <div className="relative">
                    <div
                      className="w-16 h-16 rounded-full border-3 border-yellow-300 flex items-center justify-center text-xl font-bold text-white shadow-lg"
                      style={{ backgroundColor: colorFor(i) }}
                    >
                      {p.username[0].toUpperCase()}
                    </div>
                    {p.cameraOn && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] border-2 border-white">
                        📷
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-yellow-100 max-w-[80px] truncate text-center drop-shadow">
                    {p.username}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* hexagon frame overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/images/hexagon (1).png"
            alt=""
            fill
            className="object-contain"
          />
        </div>

        {/* bağlantı durumu */}
        {!collapsed && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
            <div
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"} animate-pulse`}
            />
            <span className="text-[10px] text-yellow-100 font-medium">
              {connected ? "bağlı" : "bağlanıyor…"}
            </span>
          </div>
        )}

        {/* kamera butonu */}
        {!collapsed && (
          <button
            onClick={() => setCameraOn((c) => !c)}
            className={`absolute bottom-14 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              cameraOn
                ? "bg-yellow-400 border-yellow-500 text-amber-900"
                : "bg-amber-900/60 border-yellow-600 text-yellow-200 hover:bg-amber-800"
            }`}
          >
            {cameraOn ? "📷 Kamera Açık" : "📷 Kamera Kapat"}
          </button>
        )}
      </motion.div>

      {/* X butonu — hexagon'ın dışında sol üst köşede */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            key="close-btn"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            onClick={onToggle}
            className="absolute top-1 left-1 z-20 w-7 h-7 rounded-full bg-yellow-100/90 border border-yellow-400 flex items-center justify-center text-amber-800 font-bold text-sm hover:bg-yellow-200 transition"
          >
            {collapsed ? "+" : "×"}
          </motion.button>
        )}
      </AnimatePresence>

      {/* join/leave toastları */}
      <div
        className="absolute top-0 left-full ml-3 flex flex-col gap-2 pointer-events-none"
        style={{ minWidth: 200 }}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="bg-yellow-100/80 backdrop-blur-sm border border-yellow-300 rounded-xl px-3 py-2 text-xs text-amber-800 shadow-sm"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* sağ tık context menü */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            key="ctx"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-yellow-50 border border-yellow-300 rounded-xl shadow-lg py-1 text-sm"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                onSpam(contextMenu.userId, contextMenu.username);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-yellow-100 w-full text-left text-amber-800"
            >
              <Image
                src="/images/spam.png"
                alt="spam"
                width={16}
                height={16}
              />
              Spam Gönder
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
