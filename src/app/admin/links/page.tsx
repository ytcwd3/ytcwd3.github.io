"use client";
import "../admin.css";

import { useState, useEffect } from "react";
import { validateAdminSession } from "@/lib/admin_auth";
import AdminHeader from "../components/Header";
import SiteLinksManager from "../components/SiteLinksManager";

export default function SiteLinksPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkAuth() {
      const result = await validateAdminSession();
      if (result.ok) {
        setUser(result.user);
      }
    }
    checkAuth();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <AdminHeader user={user} />
      <div className="admin-category-page" style={{ padding: "20px" }}>
        <SiteLinksManager />
      </div>
    </div>
  );
}
