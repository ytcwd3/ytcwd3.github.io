"use client";

import { useState, useEffect } from "react";
import { SiteLink, fetchSiteLinksByType } from "@/lib/site_links";
import PopupLinkList from "./PopupLinkList";

interface ToolPatchPopupProps {
  onClose: () => void;
}

export default function ToolPatchPopup({ onClose }: ToolPatchPopupProps) {
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteLinksByType("tool")
      .then((data) => setLinks(data))
      .catch((error) => console.error("加载工具补丁失败:", error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="popup-content link-popup-content tool-patch-popup-content"
      onClick={(e) => e.stopPropagation()}
    >
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
          <PopupLinkList links={links} />
        )}
      </div>
    </div>
  );
}
