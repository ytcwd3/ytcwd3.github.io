"use client";

import { CARD_STYLE, INPUT_STYLE } from "./constants";

interface ToolbarProps {
  searchKeyword: string;
  onSearchChange: (v: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onOpenImport: () => void;
  onOpenAdd: () => void;
  onRefresh: () => void;
}

export default function Toolbar({
  searchKeyword,
  onSearchChange,
  onSearch,
  onClearSearch,
  onOpenImport,
  onOpenAdd,
  onRefresh,
}: ToolbarProps) {
  return (
    <div
      style={{
        ...CARD_STYLE,
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
        alignItems: "center",
        padding: "10px 16px",
      }}
    >
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
        <input
          type="text"
          placeholder="搜索游戏名称..."
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          style={{
            ...INPUT_STYLE,
            paddingRight: searchKeyword ? "32px" : "10px",
          }}
        />
        {searchKeyword && (
          <button
            onClick={onClearSearch}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              color: "var(--text-tertiary)",
              padding: "2px 6px",
              lineHeight: 1,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
          >
            ×
          </button>
        )}
      </div>

      <button
        onClick={onOpenImport}
        style={{
          padding: "7px 16px",
          background:
            "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 3px 8px rgba(216,87,232,0.25)",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        📥 导入Excel
      </button>

      <button
        onClick={onOpenAdd}
        style={{
          padding: "7px 16px",
          background:
            "linear-gradient(90deg, var(--secondary-color), var(--primary-color))",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 3px 8px rgba(147,51,234,0.25)",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        + 添加游戏
      </button>

      <button
        onClick={onRefresh}
        style={{
          padding: "7px 16px",
          background: "rgba(255,255,255,0.9)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        🔄 刷新
      </button>
    </div>
  );
}
