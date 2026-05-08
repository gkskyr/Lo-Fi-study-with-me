"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { api, type Room } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

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

  return (
    <main className="min-h-screen p-8 flex gap-10 items-start">
      {/* Sol — dekoratif altıgen */}
      <div className="shrink-0 sticky top-8 hidden lg:block">
        <div
          className="relative"
          style={{ width: 220, height: 252 }}
        >
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
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src="/images/hexagon (1).png"
              alt=""
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Sağ — oda listesi */}
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-amber-900 mb-2 tracking-tight">
          TOPLULUK ODALARI
        </h1>
        <p className="text-sm text-amber-600 mb-8">
          Bir odaya gir, sorularını sor ve cevapla.
        </p>

        {loading && (
          <p className="text-amber-500 text-sm animate-pulse">Odalar yükleniyor…</p>
        )}

        {!loading && rooms.length === 0 && (
          <p className="text-amber-500 text-sm">Henüz topluluk odası yok.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rooms.map((room, i) => (
            <motion.button
              key={room.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => router.push(`/community/${room.id}`)}
              className="text-left bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 hover:border-yellow-400 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-yellow-200 border-2 border-yellow-400 flex items-center justify-center">
                  <Image
                    src="/images/beehiveee.png"
                    alt=""
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-[11px] text-amber-400 font-medium bg-yellow-100 px-2 py-0.5 rounded-full border border-yellow-200">
                  Topluluk
                </span>
              </div>
              <h2 className="font-bold text-amber-900 text-sm leading-snug mb-1 group-hover:text-amber-700">
                {room.title}
              </h2>
              {room.owner && (
                <p className="text-xs text-amber-500">
                  {room.owner.name} tarafından oluşturuldu
                </p>
              )}
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-600">
                <span>Odaya Gir</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </main>
  );
}
