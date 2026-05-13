"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface UpdateRecordPopupProps {
  onClose: () => void;
}

interface GameRecord {
  id: number;
  name: string;
  updatedate: string;
  category: string[];
  subcategory: string[];
  image?: string;
  video?: string;
}

function parseUpdateDate(value: string) {
  if (!value) return null;
  const normalized = value.trim().replace(/\./g, "-").replace(/\//g, "-");
  const parts = normalized.split("-").map((part) => Number(part));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function UpdateRecordPopup({ onClose }: UpdateRecordPopupProps) {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("games")
      .select("id, name, updatedate, category, subcategory, image, video")
      .order("updatedate", { ascending: false })
      .order("id", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) {
          console.error("加载更新记录失败:", error);
          setRecords([]);
        } else {
          const sorted = [...(data || [])].sort((a, b) => {
            const dateA = parseUpdateDate(a.updatedate);
            const dateB = parseUpdateDate(b.updatedate);
            if (!dateA && !dateB) return b.id - a.id;
            if (!dateA) return 1;
            if (!dateB) return -1;
            if (dateA.getTime() !== dateB.getTime()) {
              return dateB.getTime() - dateA.getTime();
            }
            return b.id - a.id;
          });
          setRecords(sorted);
        }
        setLoading(false);
      });
  }, []);

  // 按日期分组
  const grouped: Record<string, GameRecord[]> = {};
  records.forEach((r) => {
    const date = r.updatedate || "未知日期";
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(r);
  });
  const dates = Object.keys(grouped).sort((a, b) => {
    const dateA = parseUpdateDate(a);
    const dateB = parseUpdateDate(b);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div
      className="popup-content update-record-popup"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">资源更新一览表</h3>
      <div className="popup-text">
        <div className="update-records-container">
          {loading ? (
            <div className="update-record-empty">加载中...</div>
          ) : records.length === 0 ? (
            <div className="update-record-empty">暂无更新记录</div>
          ) : (
            dates.map((date) => (
              <div key={date}>
                <div className="update-record-date">{date}</div>
                <div className="update-record-games">
                  {grouped[date].map((game) => (
                    <div key={game.id} className="update-record-item">
                      <div className="update-record-thumb" style={{ position: "relative", overflow: "hidden" }}>
                        {game.image ? (
                          <img
                            src={game.image}
                            alt={game.name}
                            loading="lazy"
                            decoding="async"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = "none";
                            }}
                          />
                        ) : null}
                        <div
                          className="update-record-thumb-placeholder"
                          style={{
                            display: game.image ? "none" : "flex",
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                            top: 0,
                            left: 0,
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "white",
                            background: "linear-gradient(135deg, #9333ea, #d857e8)",
                          }}
                        >
                          {game.name.charAt(0)}
                        </div>
                      </div>
                      <span className="update-record-name">{game.name}</span>
                      <span className="update-record-category">
                        {(game.subcategory || []).join(" / ") || (game.category || []).join(" / ")}
                      </span>
                      {game.video && (
                        <a
                          href={game.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="update-record-video"
                        >
                          🎬
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
