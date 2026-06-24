"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, type Room } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

// Pointy-top hexagon: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)
// Regular hex ratio: H = W * (2/√3) ≈ W * 1.1547
const HEX_W = 170;
const HEX_H = Math.round(HEX_W * 1.1547); // 196
const COLS = 3;

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

// Row spacing = HEX_H * 0.75 (hexes interlock, no gap, no overlap of shapes)
const ROW_STEP = Math.round(HEX_H * 0.75); // 147

const HEX_COLORS = ["#ffb940", "#ffd34f"];

export default function Community() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRooms(accessToken ?? undefined)
      .then((all) => setRooms(all.filter((r) => r.type === "COMMUNITY")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accessToken]);

  const totalRows = Math.ceil(rooms.length / COLS);
  const containerW = COLS * HEX_W + Math.floor(HEX_W / 2); // +half for odd row offset
  const containerH = (totalRows - 1) * ROW_STEP + HEX_H + 32;

  return (
    <main className="min-h-screen p-8 flex flex-col items-center" style={{ background: "#ffec8c" }}>
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold mb-2 tracking-tight" style={{ color: "#92400e" }}>
          TOPLULUK ODALARI
        </h1>
        <p className="text-base mb-10" style={{ color: "#b45309" }}>
          Bir odaya gir, sorularını sor ve cevapla.
        </p>

        {loading && (
          <p className="animate-pulse" style={{ color: "#b45309" }}>Odalar yükleniyor…</p>
        )}

        {!loading && rooms.length === 0 && (
          <p style={{ color: "#b45309" }}>Henüz topluluk odası yok.</p>
        )}

        {!loading && rooms.length > 0 && (
          <div className="relative" style={{ width: containerW, height: containerH }}>
            {rooms.map((room, i) => {
              const row = Math.floor(i / COLS);
              const col = i % COLS;
              const isOddRow = row % 2 === 1;

              const x = col * HEX_W + (isOddRow ? Math.floor(HEX_W / 2) : 0);
              const y = row * ROW_STEP;
              const bg = HEX_COLORS[i % HEX_COLORS.length];

              return (
                <motion.button
                  key={room.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 220, damping: 20 }}
                  whileHover={{ scale: 1.07, zIndex: 10 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(`/community/${room.slug || room.id}`)}
                  className="absolute flex flex-col items-center justify-center text-center cursor-pointer select-none"
                  style={{
                    left: x,
                    top: y,
                    width: HEX_W,
                    height: HEX_H,
                    clipPath: HEX_CLIP,
                    background: bg,
                    zIndex: 1,
                  }}
                >
                  <span className="font-bold text-base leading-tight px-6 drop-shadow-sm" style={{ color: "#78350f" }}>
                    {room.title}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
