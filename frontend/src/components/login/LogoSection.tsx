"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface LogoSectionProps {
  username?: string | null;
}

const LETTERS = ["k", "o", "z", "a", "n"] as const;

export function LogoSection({ username }: LogoSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-6"
    >
      {/* koZanlogo.png kaldırıldı, sadece harfler kalacak */}
      <AnimatePresence mode="wait">
        {username ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col"
          >
            <span className="text-2xl text-amber-700 font-medium">Hoşgeldin,</span>
            <span className="text-5xl font-bold text-amber-900">{username}</span>
          </motion.div>
        ) : (
          <motion.div
            key="brand"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-end gap-2"
          >
            {LETTERS.map((letter, i) => (
              <motion.div
                key={letter}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
              >
                <Image
                  src={`/images/${letter}.png`}
                  alt={letter}
                  width={110}
                  height={110}
                  className="object-contain"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
