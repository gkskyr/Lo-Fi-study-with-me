"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface BeehiveButtonProps {
  onReveal: () => void;
}

export function BeehiveButton({ onReveal }: BeehiveButtonProps) {
  return (
    <motion.button
      onClick={onReveal}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 1.15 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.4 } }}
      className="cursor-pointer focus:outline-none"
      aria-label="koZan'a giriş yap"
    >
      <Image
        src="/images/beehive.png"
        alt="Beehive"
        width={260}
        height={260}
        priority
      />
    </motion.button>
  );
}
