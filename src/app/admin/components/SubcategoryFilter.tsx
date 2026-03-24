"use client";

import {
  CATEGORY_SUBCATEGORIES,
  CAT_RGBA,
  CAT_COLOR,
  CARD_STYLE_SM,
} from "./constants";

interface SubcategoryFilterProps {
  selectedCategory: string;
  selectedSubcategory: string;
  categoryCounts: Record<string, number>;
  subcatCounts: Record<string, number>;
  onSubcategoryClick: (sub: string) => void;
}

export default function SubcategoryFilter({
  selectedCategory,
  selectedSubcategory,
  categoryCounts,
  subcatCounts,
  onSubcategoryClick,
}: SubcategoryFilterProps) {
  return (
    <div style={CARD_STYLE_SM}>
      <div
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
            border: `1px solid ${selectedSubcategory === "all" ? CAT_COLOR[selectedCategory] : "var(--border-light)"}`,
            backgroundColor:
              selectedSubcategory === "all"
                ? `rgba(${CAT_RGBA[selectedCategory]}, 0.15)`
                : "rgba(255,255,255,0.8)",
            color:
              selectedSubcategory === "all"
                ? CAT_COLOR[selectedCategory]
                : "var(--text-secondary)",
            fontWeight: selectedSubcategory === "all" ? 600 : 400,
            transition: "all 0.2s",
          }}
        >
          全部 ({categoryCounts[selectedCategory] || 0})
        </button>

        {(CATEGORY_SUBCATEGORIES[selectedCategory] || []).map(
          (sub) =>
            subcatCounts[sub] > 0 && (
              <button
                key={sub}
                onClick={() => onSubcategoryClick(sub)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11px",
                  cursor: "pointer",
                  border: `1px solid ${selectedSubcategory === sub ? CAT_COLOR[selectedCategory] : "var(--border-light)"}`,
                  backgroundColor:
                    selectedSubcategory === sub
                      ? `rgba(${CAT_RGBA[selectedCategory]}, 0.15)`
                      : "rgba(255,255,255,0.7)",
                  color:
                    selectedSubcategory === sub
                      ? CAT_COLOR[selectedCategory]
                      : "var(--text-secondary)",
                  fontWeight: selectedSubcategory === sub ? 600 : 400,
                  transition: "all 0.2s",
                }}
              >
                {sub} ({subcatCounts[sub]})
              </button>
            ),
        )}
      </div>
    </div>
  );
}
