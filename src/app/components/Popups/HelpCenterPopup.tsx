"use client";

import { useState, useEffect } from "react";
import { supabase, SiteLink } from "@/lib/supabase";

interface HelpCenterPopupProps {
  onClose: () => void;
}

export default function HelpCenterPopup({ onClose }: HelpCenterPopupProps) {
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_links")
      .select("*")
      .eq("type", "help")
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("加载帮助中心失败:", error);
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
      <h3 className="popup-title">帮助中心</h3>
      <div className="popup-text">
        {loading ? (
          <p>加载中...</p>
        ) : links.length === 0 ? (
          <p>暂无帮助文档</p>
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
