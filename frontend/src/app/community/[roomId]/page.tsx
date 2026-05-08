"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
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

  const { joined, joinError, localVideoRef, remoteUsers, cameraOn, micOn, toggleCamera, toggleMic, leave } =
    useAgora(roomId, inRoom ? accessToken : null, inRoom);

  function handleEnterRoom() {
    setInRoom(true);
  }

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
      {/* ── Oda Kapalı: altıgen + Q&A tam genişlik ── */}
      <AnimatePresence mode="wait">
        {!inRoom && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex gap-6 p-6 items-start"
          >
            {/* Tıklanabilir altıgen */}
            <div className="shrink-0 sticky top-6">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleEnterRoom}
                className="relative block cursor-pointer group"
                style={{ width: 300, height: 346 }}
                title="Odaya gir"
              >
                {/* lofi girl clip */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath:
                      "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  }}
                >
                  <Image
                    src="/images/lofi-girl.jpg"
                    alt="lofi"
                    fill
                    sizes="300px"
                    className="object-cover"
                    priority
                  />
                  {/* hover overlay */}
                  <div className="absolute inset-0 bg-amber-900/0 group-hover:bg-amber-900/40 transition-colors duration-300 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-100 font-bold text-lg drop-shadow">
                      Odaya Gir →
                    </span>
                  </div>
                </div>
                {/* hexagon frame */}
                <div className="absolute inset-0 pointer-events-none">
                  <Image
                    src="/images/hexagon (1).png"
                    alt=""
                    fill
                    sizes="300px"
                    loading="eager"
                    className="object-contain"
                  />
                </div>
              </motion.button>
              <p className="text-center text-xs text-amber-600 mt-3 font-medium">
                {room?.title ?? "Oda yükleniyor…"}
              </p>
            </div>

            {/* Q&A tam genişlik */}
            <div className="flex-1 min-w-0 pt-2">
              <QASection roomId={roomId} newQuestions={newQuestions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Oda Açık: geniş RoomView sol + dar Q&A sağ ── */}
      <AnimatePresence mode="wait">
        {inRoom && (
          <motion.div
            key="room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex gap-0"
          >
            {/* RoomView — sayfanın ~%72'si */}
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
                localUserId={""}
                localVideoRef={localVideoRef}
                cameraOn={cameraOn}
                micOn={micOn}
                joined={joined}
                onToggleCamera={toggleCamera}
                onToggleMic={toggleMic}
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
              className="border-l-2 border-yellow-300 overflow-y-auto p-4 min-w-0" style={{ backgroundColor: "#ffec8c" }}
            >
              <QASection roomId={roomId} newQuestions={newQuestions} compact />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* join/leave toastları + Agora hatası */}
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
