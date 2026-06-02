"use client";

import { useState, useEffect } from "react";
import { SiteLink, fetchSiteLinksByType } from "@/lib/site_links";
import PopupLinkList from "./PopupLinkList";

interface HelpCenterPopupProps {
  onClose: () => void;
}

export default function HelpCenterPopup({ onClose }: HelpCenterPopupProps) {
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteLinksByType("help")
      .then((data) => setLinks(data))
      .catch((error) => console.error("加载帮助中心失败:", error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="popup-content link-popup-content" onClick={(e) => e.stopPropagation()}>
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
          <PopupLinkList links={links} />
        )}
      </div>
    </div>
  );
}
