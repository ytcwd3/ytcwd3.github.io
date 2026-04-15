"use client";

import { useState, useEffect } from "react";
import { supabase, SiteLink } from "@/lib/supabase";

interface ToolPatchPopupProps {
  onClose: () => void;
}

export default function ToolPatchPopup({ onClose }: ToolPatchPopupProps) {
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_links")
      .select("*")
      .eq("type", "tool")
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("加载工具补丁失败:", error);
        } else {
          setLinks(data || []);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">工具补丁</h3>
      <div className="popup-text">
        {loading ? (
          <p>加载中...</p>
        ) : links.length === 0 ? (
          <p>暂无工具补丁</p>
        ) : (
          links.map((link, i) => (
            <p key={link.id}>
              {i + 1}. {link.name}：{link.url}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
