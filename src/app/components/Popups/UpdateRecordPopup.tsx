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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;

  async function loadRecords(page: number, append = false) {
    const isInitialLoad = page === 1 && !append;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("games")
        .select("id, name, updatedate, category, subcategory, image, video")
        .order("updatedate", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const nextRecords = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        updatedate: item.updatedate,
        category: item.category,
        subcategory: item.subcategory,
        image: item.image || undefined,
        video: item.video || undefined,
      }));

      setRecords((prev) => (append ? [...prev, ...nextRecords] : nextRecords));
      setHasMore(nextRecords.length === PAGE_SIZE);
      setCurrentPage(page);
    } catch (error) {
      console.error("加载更新记录失败:", error);
      if (!append) {
        setRecords([]);
      }
      setHasMore(false);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    loadRecords(1, false);
  }, []);

  async function loadMore() {
    if (loading || loadingMore || !hasMore) return;
    await loadRecords(currentPage + 1, true);
  }

  const grouped: Record<string, GameRecord[]> = {};
  records.forEach((record) => {
    const date = record.updatedate || "未知日期";
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(record);
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
      <div className="popup-text update-record-popup-text">
        <div className="update-records-container">
          {loading ? (
            <div className="update-record-empty">加载中...</div>
          ) : records.length === 0 ? (
            <div className="update-record-empty">暂无更新记录</div>
          ) : (
            <>
              {dates.map((date) => (
                <div key={date}>
                  <div className="update-record-date">{date}</div>
                  <div className="update-record-games">
                    {grouped[date].map((game) => (
                      <div key={game.id} className="update-record-item">
                        <div
                          className="update-record-thumb"
                          style={{ position: "relative", overflow: "hidden" }}
                        >
                          {game.image ? (
                            <img
                              src={game.image}
                              alt={game.name}
                              loading="lazy"
                              decoding="async"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
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
                              background:
                                "linear-gradient(135deg, #9333ea, #d857e8)",
                            }}
                          >
                            {game.name.charAt(0)}
                          </div>
                        </div>
                        <span className="update-record-name">{game.name}</span>
                        <span className="update-record-category">
                          {(game.subcategory || []).join(" / ") ||
                            (game.category || []).join(" / ")}
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
              ))}
              {hasMore && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "16px 0 8px",
                  }}
                >
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{
                      padding: "8px 24px",
                      fontSize: "13px",
                      background: "rgba(216, 87, 232, 0.08)",
                      color: "var(--accent-color)",
                      border: "1px solid rgba(216, 87, 232, 0.2)",
                      borderRadius: "var(--radius-sm)",
                      cursor: loadingMore ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: loadingMore ? 0.6 : 1,
                    }}
                  >
                    {loadingMore ? "加载中..." : "加载更多"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
