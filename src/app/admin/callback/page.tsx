"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ALLOWED_GITHUB_USERS = ["anyebojue", "ytcwd3"];

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

      console.log("Callback执行中...");
      console.log("Session:", session);
      console.log("Error:", error);

      if (error) throw error;

      if (session) {
        const user = session.user;
        console.log("User:", user);
        console.log("Provider:", user.app_metadata?.provider);

        if (user.app_metadata?.provider === "github") {
          const githubUsername =
            user.user_metadata?.user_name ||
            user.user_metadata?.preferred_username;
          console.log("GitHub Username:", githubUsername);
          console.log("Allowed Users:", ALLOWED_GITHUB_USERS);
          console.log(
            "Is Allowed:",
            ALLOWED_GITHUB_USERS.includes(githubUsername),
          );

          if (ALLOWED_GITHUB_USERS.includes(githubUsername)) {
            localStorage.setItem("admin_logged_in", "true");
            localStorage.setItem(
              "admin_user",
              JSON.stringify({
                email: user.email,
                github: githubUsername,
              }),
            );

            setStatus("登录成功！正在跳转...");
            console.log("准备跳转到 /admin");
            setTimeout(() => {
              window.location.href = "/admin";
            }, 1000);
          } else {
            localStorage.clear();
            sessionStorage.clear();
            await supabase.auth.signOut();
            setStatus("您没有权限访问管理后台");
            console.log("用户没有权限");
            setTimeout(() => {
              window.location.href = "/admin/login";
            }, 2000);
          }
        } else {
          localStorage.clear();
          sessionStorage.clear();
          setStatus("请使用 GitHub 账号登录");
          console.log("不是GitHub登录");
          setTimeout(() => {
            window.location.href = "/admin/login";
          }, 2000);
        }
      } else {
        console.log("没有session，跳转回登录页");
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/admin/login";
      }
    } catch (err: any) {
      console.error("Callback错误:", err);
      localStorage.clear();
      sessionStorage.clear();
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
