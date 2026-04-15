"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const ALLOWED_GITHUB_USERS = ["anyebojue", "ytcwd3"];

export default function AdminLogin() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 清除所有存储，确保干净登录
    localStorage.clear();
    sessionStorage.clear();
    checkSession();
  }, []);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await validateUser(session.user);
    }
  }

  async function validateUser(user: any) {
    if (user.app_metadata?.provider === "github") {
      const githubUsername =
        user.user_metadata?.user_name || user.user_metadata?.preferred_username;

      if (ALLOWED_GITHUB_USERS.includes(githubUsername)) {
        localStorage.setItem("admin_logged_in", "true");
        localStorage.setItem(
          "admin_user",
          JSON.stringify({
            email: user.email,
            github: githubUsername,
          }),
        );
        window.location.href = "/admin";
      } else {
        setError("您没有权限访问管理后台");
        localStorage.clear();
        sessionStorage.clear();
        await supabase.auth.signOut();
      }
    } else {
      setError("请使用 GitHub 账号登录");
      localStorage.clear();
      sessionStorage.clear();
    }
  }

  async function handleGitHubLogin() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/admin/callback`,
      },
    });

    if (error) {
      setError("登录失败: " + error.message);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "90vh",
      }}
    >
      <div
        style={{
          background: "white",
          padding: 40,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center",
          maxWidth: 400,
          width: "90%",
        }}
      >
        <h1 style={{ color: "#333", marginBottom: 10, fontSize: 24 }}>
          游戏数据库管理系统
        </h1>
        <p style={{ color: "#666", marginBottom: 30 }}>使用 GitHub 账号登录</p>

        {error && (
          <div
            style={{
              background: "#fee",
              color: "#c00",
              padding: 15,
              borderRadius: 8,
              marginBottom: 20,
              display: "block",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: "#e8f0fe",
            color: "#1a73e8",
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 14,
            textAlign: "left",
          }}
        >
          <strong>授权用户：</strong> anyebojue, ytcwd3
          <br />
          <br />
          <small>只有授权的 GitHub 用户才能登录管理后台</small>
        </div>

        <button
          onClick={handleGitHubLogin}
          disabled={loading}
          style={{
            background: "#24292e",
            color: "white",
            border: "none",
            padding: "15px 40px",
            borderRadius: 8,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            justifyContent: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: 20, height: 20 }}
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>{loading ? "跳转中..." : "使用 GitHub 登录"}</span>
        </button>

        <div style={{ marginTop: 20, fontSize: 12, color: "#999" }}>
          <a href="/" style={{ color: "#666", textDecoration: "underline" }}>
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
