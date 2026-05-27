"use client";

import { useState, useEffect } from "react";
import AdminHeader from "../components/Header";
import DatabaseCategoryManager from "../components/DatabaseCategoryManager";
import HomeDisplayManager from "../components/HomeDisplayManager";

export default function CategoryPage() {
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

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <AdminHeader user={user} />
      <div style={{ padding: "20px" }}>
        <DatabaseCategoryManager />
        <HomeDisplayManager />
      </div>
    </div>
  );
}
