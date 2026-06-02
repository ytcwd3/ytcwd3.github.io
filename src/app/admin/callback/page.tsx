"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  clearAdminSession,
  clearAdminSessionStorage,
  persistValidatedAdminUser,
} from "@/lib/admin_auth";

export default function AdminCallback() {
  const [status, setStatus] = useState("验证中...");

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session) {
        await persistValidatedAdminUser(session.user);
        setStatus("登录成功！正在跳转...");
        setTimeout(() => {
          window.location.href = "/admin";
        }, 1000);
      } else {
        clearAdminSessionStorage();
        window.location.href = "/admin/login";
      }
    } catch (err: any) {
      clearAdminSessionStorage();
      await clearAdminSession();
      setStatus("验证失败: " + err.message);
      setTimeout(() => {
        window.location.href = "/admin/login";
      }, 3000);
    }
  }

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: 0,
      }}
    >
      <div
        style={{
          background: "white",
          padding: 40,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center",
          minWidth: 300,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "4px solid #f3f3f3",
            borderTopColor: "#667eea",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }}
        />
        <p style={{ color: "#666", fontSize: 16 }}>{status}</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
