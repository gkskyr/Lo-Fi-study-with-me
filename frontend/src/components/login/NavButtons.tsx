"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { icon: "/images/bee.png", label: "Kişisel Oda", href: "/personal-room" },
  { icon: "/images/beehiveee.png", label: "Topluluk Odaları", href: "/community" },
] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 18 },
  },
};

export function NavButtons() {
  const router = useRouter();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex gap-10"
    >
      {NAV_ITEMS.map(({ icon, label, href }) => (
        <div key={href} className="flex flex-col items-center gap-2">
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push(href)}
            className="w-36 h-36 rounded-full bg-yellow-100 border-2 border-honey flex items-center justify-center shadow-sm focus:outline-none cursor-pointer"
            aria-label={label}
          >
            <Image src={icon} alt={label} width={72} height={72} />
          </motion.button>
          <span className="text-base font-medium text-gray-700">{label}</span>
        </div>
      ))}
    </motion.div>
  );
}
