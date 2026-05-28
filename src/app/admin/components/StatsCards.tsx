"use client";

import {
  CAT_COLOR,
  GRADIENT,
} from "./constants";
import type { DbCategory } from "@/lib/categoryTables";

interface StatsCardsProps {
  categories: DbCategory[];
  selectedCategoryId: number | null;
  onCategoryClick: (categoryId: number) => void;
  className?: string;
}

const FALLBACK_STYLE_KEYS = ["pc", "ns", "handheld", "console", "sony", "other"];

export default function StatsCards({
  categories,
  selectedCategoryId,
  onCategoryClick,
  className,
}: StatsCardsProps) {
  return (
    <div
      className={`stats-cards ${className || ""}`}
      style={{
        display: "flex",
        gap: "8px",
        marginBottom: "16px",
        flexWrap: "wrap",
      }}
    >
      {categories.map((category, index) => {
        const isActive = selectedCategoryId === category.id;
        const styleKey = FALLBACK_STYLE_KEYS[index % FALLBACK_STYLE_KEYS.length];
        const textColor = isActive ? "white" : CAT_COLOR[styleKey];

        return (
          <div
            key={category.id}
            onClick={() => onCategoryClick(category.id)}
            style={{
              flex: 1,
              minWidth: 100,
              cursor: "pointer",
              borderRadius: "var(--radius-md)",
              padding: "8px 6px",
              textAlign: "center",
              background: isActive ? GRADIENT[styleKey] : "rgba(255,255,255,0.95)",
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
              {category.gameCount || 0}
            </div>
            <div
              style={{ fontSize: "11px", fontWeight: 600, color: textColor }}
            >
              {category.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
