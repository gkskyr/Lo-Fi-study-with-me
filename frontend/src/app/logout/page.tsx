"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function LogoutPage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    // Auth state'ini tamamen sıfırla
    logout();
    // Varsa localStorage içindeki kozan-auth'u garanti olarak temizle
    if (typeof window !== 'undefined') {
      localStorage.removeItem("kozan-auth");
    }
    // Ana sayfaya (Giriş ekranı) geri yolla
    router.replace("/");
  }, [logout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50 text-amber-900 font-bold text-2xl">
      Oturum kapatılıyor... Lütfen bekleyin.
    </div>
  );
}
