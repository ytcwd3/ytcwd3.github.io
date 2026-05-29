"use client";

import { useState, useEffect } from "react";
import AdminHeader from "../components/Header";
import DatabaseCategoryManager from "../components/DatabaseCategoryManager";

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
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <AdminHeader user={user} />
      <div className="admin-category-page" style={{ padding: "20px" }}>
        <DatabaseCategoryManager />
      </div>
    </div>
  );
}
