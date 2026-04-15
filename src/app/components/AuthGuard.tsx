"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 登录相关页面跳过检查
const SKIP_PATHS = ["/admin/login", "/admin/callback"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const githubUsername =
        session.user.user_metadata?.user_name ||
        session.user.user_metadata?.preferred_username;

      if (!["anyebojue", "ytcwd3"].includes(githubUsername)) {
        localStorage.clear();
        sessionStorage.clear();
        await supabase.auth.signOut();
      }
    }

    check();
  }, [pathname]);

  return <>{children}</>;
}
