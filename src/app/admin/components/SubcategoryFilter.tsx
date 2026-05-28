"use client";

import {
  CAT_RGBA,
  CAT_COLOR,
  CARD_STYLE_SM,
} from "./constants";
import type { DbCategory } from "@/lib/categoryTables";

interface SubcategoryFilterProps {
  selectedCategory: DbCategory | null;
  selectedSubcategoryId: number | "all";
  onSubcategoryClick: (subcategoryId: number | "all") => void;
  className?: string;
}

export default function SubcategoryFilter({
  selectedCategory,
  selectedSubcategoryId,
  onSubcategoryClick,
  className,
}: SubcategoryFilterProps) {
  const styleKey = "pc";

  return (
    <div className={`subcat-filter ${className || ""}`} style={CARD_STYLE_SM}>
      <div
        className="filter-scroll"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          子分类：
        </span>

        <button
          onClick={() => onSubcategoryClick("all")}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            cursor: "pointer",
            border: `1px solid ${selectedSubcategoryId === "all" ? CAT_COLOR[styleKey] : "var(--border-light)"}`,
            backgroundColor:
              selectedSubcategoryId === "all"
                ? `rgba(${CAT_RGBA[styleKey]}, 0.15)`
                : "rgba(255,255,255,0.8)",
            color:
              selectedSubcategoryId === "all"
                ? CAT_COLOR[styleKey]
                : "var(--text-secondary)",
            fontWeight: selectedSubcategoryId === "all" ? 600 : 400,
            transition: "all 0.2s",
          }}
        >
          全部 ({selectedCategory?.gameCount || 0})
        </button>

        {(selectedCategory?.subcategories || []).map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSubcategoryClick(sub.id)}
            style={{
              padding: "3px 8px",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              cursor: "pointer",
              border: `1px solid ${selectedSubcategoryId === sub.id ? CAT_COLOR[styleKey] : "var(--border-light)"}`,
              backgroundColor:
                selectedSubcategoryId === sub.id
                  ? `rgba(${CAT_RGBA[styleKey]}, 0.15)`
                  : "rgba(255,255,255,0.7)",
              color:
                selectedSubcategoryId === sub.id
                  ? CAT_COLOR[styleKey]
                  : "var(--text-secondary)",
              fontWeight: selectedSubcategoryId === sub.id ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            {sub.name} ({sub.gameCount})
          </button>
        ))}
      </div>
    </div>
  );
}
