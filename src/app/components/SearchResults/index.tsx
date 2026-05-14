import { Game } from "@/lib/supabase";
import GameCard from "./GameCard";

interface SearchResultsProps {
  games: Game[];
  loading: boolean;
  currentPage: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
  onOpenQrModal: (src: string, title: string) => void;
  sortBy?: "updatedate" | "hot";
  onSortChange?: (sort: "updatedate" | "hot") => void;
}

export default function SearchResults({
  games,
  loading,
  currentPage,
  totalCount,
  totalPages,
  onPageChange,
  onClose,
  onOpenQrModal,
  sortBy = "updatedate",
  onSortChange,
}: SearchResultsProps) {
  return (
    <div className="result-box">
      <div className="result-header">
        <span>搜索结果</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          {/* 排序选择器 */}
          {onSortChange && (
            <div style={{ display: "flex", gap: "4px" }}>
              {([
                { key: "updatedate", label: "更新时间" },
                { key: "hot", label: "热度排序" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onSortChange(key)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    border: "1px solid",
                    borderColor: sortBy === key ? "var(--primary-color, #0078d7)" : "var(--border-light)",
                    background: sortBy === key ? "var(--primary-color, #0078d7)" : "rgba(255,255,255,0.8)",
                    color: sortBy === key ? "white" : "var(--text-secondary)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontWeight: sortBy === key ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      <div className="loading" style={{ display: loading ? "flex" : "none" }}>
        正在检索资源...
      </div>

      <div id="resultContent">
        {games.map((game, idx) => (
          <GameCard
            key={game.id}
            game={game}
            index={idx}
            onOpenQrModal={onOpenQrModal}
          />
        ))}

        {games.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">未找到相关资源</div>
          </div>
        )}

        {/* 翻页控件 */}
        {totalCount > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
              padding: "20px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                background: currentPage === 1 ? "#e0e0e0" : "var(--primary-color, #0078d7)",
                color: currentPage === 1 ? "#aaa" : "white",
                border: "none",
                borderRadius: "6px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              上一页
            </button>

            <div
              style={{
                fontSize: "14px",
                color: "var(--text-secondary)",
                padding: "4px 12px",
                background: "rgba(255,255,255,0.8)",
                borderRadius: "6px",
                border: "1px solid var(--border-light)",
                minWidth: "120px",
                textAlign: "center",
              }}
            >
              第 {currentPage} / {totalPages} 页 · 共 {totalCount} 条
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                background: currentPage === totalPages ? "#e0e0e0" : "var(--primary-color, #0078d7)",
                color: currentPage === totalPages ? "#aaa" : "white",
                border: "none",
                borderRadius: "6px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
