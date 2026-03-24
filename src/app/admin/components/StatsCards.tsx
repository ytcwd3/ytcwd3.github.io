"use client";

import {
  CATEGORY_NAMES,
  CATEGORY_DISPLAY,
  CAT_COLOR,
  GRADIENT,
} from "./constants";

interface StatsCardsProps {
  selectedCategory: string;
  categoryCounts: Record<string, number>;
  onCategoryClick: (cat: string) => void;
}

export default function StatsCards({
  selectedCategory,
  categoryCounts,
  onCategoryClick,
}: StatsCardsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        marginBottom: "16px",
        flexWrap: "wrap",
      }}
    >
      {Object.keys(CATEGORY_NAMES).map((key) => {
        const isActive = selectedCategory === key;
        const textColor = isActive ? "white" : CAT_COLOR[key];

        return (
          <div
            key={key}
            onClick={() => onCategoryClick(key)}
            style={{
              flex: 1,
              minWidth: 100,
              cursor: "pointer",
              borderRadius: "var(--radius-md)",
              padding: "8px 6px",
              textAlign: "center",
              background: isActive ? GRADIENT[key] : "rgba(255,255,255,0.95)",
              border: `2px solid ${isActive ? "transparent" : "rgba(255,255,255,0.6)"}`,
              boxShadow: isActive
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "var(--shadow-sm)",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: textColor,
                marginBottom: "2px",
              }}
            >
              {categoryCounts[key] || 0}
            </div>
            <div
              style={{ fontSize: "11px", fontWeight: 600, color: textColor }}
            >
              {CATEGORY_DISPLAY[key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
