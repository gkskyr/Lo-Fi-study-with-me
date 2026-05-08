"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface LogoSectionProps {
  username?: string | null;
}

export function LogoSection({ username }: LogoSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-4"
    >
      <Image
        src="/images/koZanlogo.png"
        alt="koZan logo"
        width={110}
        height={110}
        priority
      />

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
            <span className="text-sm text-amber-700 font-medium">Hoşgeldin,</span>
            <span className="text-2xl font-bold text-amber-900">{username}</span>
          </motion.div>
        ) : (
          <motion.div
            key="brand"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-4xl font-bold tracking-wide text-amber-900">
              koZan
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
