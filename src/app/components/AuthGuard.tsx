"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // 没登录，不处理
        return;
      }

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
  }, []);

  return <>{children}</>;
}
