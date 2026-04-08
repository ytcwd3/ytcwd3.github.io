"use client";

import { supabase } from "@/lib/supabase";
import { Game } from "@/lib/supabase";

interface HeaderProps {
  user: { github?: string; email?: string } | null;
  className?: string;
}

export default function AdminHeader({ user, className }: HeaderProps) {
  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("admin_user");
    window.location.href = "/admin/login";
  }

  return (
    <div
      className={`admin-header ${className || ""}`}
      style={{
        background: "linear-gradient(135deg, #d857e8 0%, #9333ea 100%)",
        color: "white",
        padding: "7px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(216,87,232,0.3)",
      }}
    >
      <div>
        <h1
          className="admin-header-title"
          style={{
            fontSize: "18px",
            fontWeight: 700,
            margin: 0,
            letterSpacing: "0.5px",
          }}
        >
          游戏数据库管理后台
        </h1>
        <p style={{ fontSize: "11px", margin: "1px 0 0", opacity: 0.85 }}>
          单游仓鼠 · 游戏资源管理
        </p>
      </div>
      <div className="admin-header-user" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <span style={{ fontSize: "12px", opacity: 0.9 }}>
          👤 {user?.github || user?.email}
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "white",
            padding: "5px 12px",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontSize: "12px",
            transition: "all 0.2s",
          }}
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
