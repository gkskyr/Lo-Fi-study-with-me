"use client";

import { use, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRoomSocket } from "@/components/community/useRoomSocket";
import { useAgora } from "@/components/community/useAgora";
import RoomView from "@/components/community/RoomView";
import QASection from "@/components/community/QASection";
import { api, type Room } from "@/lib/api";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { accessToken, username } = useAuthStore();

  const localUserId = accessToken
    ? (JSON.parse(atob(accessToken.split(".")[1])) as { sub: string }).sub
    : "";

  const [inRoom, setInRoom] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    userId: string;
    username: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    api.getRoom(roomId, accessToken ?? undefined).then(setRoom).catch(console.error);
  }, [roomId, accessToken]);

  const { participants, toasts, newQuestions } = useRoomSocket(
    roomId,
    inRoom ? accessToken : null
  );

  const { joined, joinError, localVideoRef, remoteUsers, cameraOn, toggleCamera, leave } =
    useAgora(roomId, inRoom ? accessToken : null, inRoom);

  async function handleLeave() {
    await leave();
    setInRoom(false);
  }

  function handleSpam(userId: string, uname: string, e?: React.MouseEvent) {
    if (e) setContextMenu({ userId, username: uname, x: e.clientX, y: e.clientY });
    else console.info("Spam →", userId, uname);
  }

  return (
    <main
      className="min-h-screen flex overflow-hidden"
      onClick={() => contextMenu && setContextMenu(null)}
    >
      {/* Sol — canlı oda butonu */}
      <div className="shrink-0 flex items-center justify-center py-8 px-2" style={{ width: 72 }}>
        <AnimatePresence mode="wait">
          {!inRoom ? (
            <motion.button
              key="join-btn"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInRoom(true)}
              title="Canlı odaya gir"
              className="flex flex-col items-center gap-2 cursor-pointer group"
            >
              {/* Altıgen buton */}
              <div
                className="w-12 h-14 flex items-center justify-center text-white text-xl font-bold shadow-lg transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  filter: "drop-shadow(0 2px 8px #fbbf2466)",
                }}
              >
                🎥
              </div>
              <span
                className="text-[10px] font-semibold text-center leading-tight"
                style={{ color: "#b45309", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
              >
                Canlı Odaya Gir
              </span>
            </motion.button>
          ) : (
            <motion.button
              key="leave-btn"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLeave}
              title="Odadan ayrıl"
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <div
                className="w-12 h-14 flex items-center justify-center text-white text-xl font-bold shadow-lg transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #f87171, #dc2626)",
                  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  filter: "drop-shadow(0 2px 8px #dc262644)",
                }}
              >
                ✕
              </div>
              <span
                className="text-[10px] font-semibold text-center leading-tight"
                style={{ color: "#dc2626", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
              >
                Odadan Ayrıl
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* İçerik */}
      <div className="flex-1 min-w-0 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {!inRoom && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 p-6 pt-8"
            >
              <h1 className="text-2xl font-bold mb-6" style={{ color: "#92400e" }}>
                {room?.title ?? "Oda yükleniyor…"}
              </h1>
              <QASection roomId={roomId} newQuestions={newQuestions} accessToken={accessToken} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {inRoom && (
            <motion.div
              key="room"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex gap-0 min-w-0"
            >
              {/* RoomView — %72 */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "72%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="p-4 min-w-0"
              >
                <RoomView
                  roomTitle={room?.title ?? "Oda"}
                  participants={participants}
                  remoteUsers={remoteUsers}
                  localUsername={username ?? "sen"}
                  localUserId={localUserId}
                  localVideoRef={localVideoRef}
                  cameraOn={cameraOn}
                  joined={joined}
                  onToggleCamera={toggleCamera}
                  onLeave={handleLeave}
                  onSpam={(userId, uname) => handleSpam(userId, uname)}
                />
              </motion.div>

              {/* Q&A sidebar — %28 */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "28%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut", delay: 0.05 }}
                className="border-l-2 overflow-y-auto p-4 min-w-0"
                style={{ borderColor: "#fde68a", backgroundColor: "#fef3c7" }}
              >
                <QASection roomId={roomId} newQuestions={newQuestions} compact accessToken={accessToken} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast bildirimleri */}
      <div className="fixed top-4 right-4 flex flex-col gap-2 pointer-events-none z-50">
        <AnimatePresence>
          {joinError && (
            <motion.div
              key="agora-error"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="bg-red-100/90 backdrop-blur-sm border border-red-300 rounded-xl px-4 py-2 text-sm text-red-800 shadow"
            >
              Bağlantı hatası: {joinError}
            </motion.div>
          )}
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.25 }}
              className="bg-yellow-100/90 backdrop-blur-sm border border-yellow-300 rounded-xl px-4 py-2 text-sm text-amber-800 shadow"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sağ tık spam menüsü */}
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
                console.info("Spam →", contextMenu.userId);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-yellow-100 w-full text-left text-amber-800"
            >
              🚫 Spam Gönder
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
