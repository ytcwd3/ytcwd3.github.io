"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AdminHeader from "../components/Header";
import SiteLinksManager from "../components/SiteLinksManager";

export default function SiteLinksPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  function checkAuth() {
    const loggedIn = localStorage.getItem("admin_logged_in");
    if (!loggedIn) {
      window.location.href = "/admin/login";
      return;
    }
    setUser(JSON.parse(localStorage.getItem("admin_user") || "{}"));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("admin_user");
    window.location.href = "/admin/login";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <AdminHeader user={user} />
      <SiteLinksManager />
    </div>
  );
}
