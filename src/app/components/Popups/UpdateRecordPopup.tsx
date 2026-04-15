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

export default function UpdateRecordPopup({ onClose }: UpdateRecordPopupProps) {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("games")
      .select("id, name, updatedate, category, subcategory, image, video")
      .order("id", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) {
          console.error("加载更新记录失败:", error);
          setRecords([]);
        } else {
          setRecords(data || []);
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
    const dateA = new Date(a.replace(/\./g, "-"));
    const dateB = new Date(b.replace(/\./g, "-"));
    return isNaN(dateA.getTime()) ? 1 : isNaN(dateB.getTime()) ? -1 : dateB.getTime() - dateA.getTime();
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
                      {game.image ? (
                        <img
                          src={game.image}
                          alt={game.name}
                          className="update-record-thumb"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="update-record-thumb update-record-thumb-placeholder">
                          {game.name.charAt(0)}
                        </div>
                      )}
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
