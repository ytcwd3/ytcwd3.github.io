"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ALLOWED_GITHUB_USERS, clearAdminSession } from "@/lib/admin_auth";

// 登录相关页面和管理后台跳过检查（管理后台有自己的验证逻辑）
const SKIP_PATHS = ["/admin/login", "/admin/callback", "/admin"];

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

      if (!ALLOWED_GITHUB_USERS.includes(githubUsername)) {
        await clearAdminSession();
      }
    }

    check();
  }, [pathname]);

  return <>{children}</>;
}
