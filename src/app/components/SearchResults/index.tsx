import { Game } from "@/lib/supabase";
import GameCard from "./GameCard";

interface SearchResultsProps {
  games: Game[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onClose: () => void;
  onOpenQrModal: (src: string, title: string) => void;
}

export default function SearchResults({
  games,
  loading,
  hasMore,
  onLoadMore,
  onClose,
  onOpenQrModal,
}: SearchResultsProps) {
  return (
    <div className="result-box">
      <div className="result-header">
        搜索结果
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
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

        {/* 加载更多按钮 */}
        {hasMore && games.length > 0 && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <button
              onClick={onLoadMore}
              disabled={loading}
              style={{
                padding: "10px 30px",
                fontSize: "16px",
                backgroundColor: "var(--primary-color, #0078d7)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "加载中..." : "加载更多"}
            </button>
            <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
              已显示 {games.length} 条
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
