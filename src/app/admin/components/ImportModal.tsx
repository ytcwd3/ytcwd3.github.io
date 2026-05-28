"use client";

import { useState, useRef } from "react";
import { supabase, Game } from "@/lib/supabase";
import { DbCategory, fetchDbCategoryOptions } from "@/lib/categoryTables";

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

interface DiffResult {
  added: any[];
  modified: { new: any; old: Game }[];
  unchanged: any[];
}

type ImportPreviewStatus = "新增" | "修改" | "无变化" | "跳过";

type ImportPreviewRow = {
  key: string;
  status: ImportPreviewStatus;
  sheetName: string;
  rowNumber: number;
  name: string;
  categoryName: string;
  subcategoryName: string;
  categoryId: number | null;
  subcategoryId: number | null;
  updatedate: string;
  quarkpan: string;
  baidupan: string;
  thunderpan: string;
  reason?: string;
};

type CategoryIds = {
  categoryId: number;
  subcategoryId: number | null;
};

function resolveImportCategory(
  dbCategories: DbCategory[],
  sheetName: string,
  categoryCell: string,
  subcategoryName: string,
) {
  const exactCategory =
    dbCategories.find((category) => category.name === categoryCell) ||
    dbCategories.find((category) => category.name === sheetName);
  if (exactCategory) return exactCategory.name;

  if (subcategoryName) {
    const matchedCategories = dbCategories.filter((category) =>
      category.subcategories.some((subcategory) => subcategory.name === subcategoryName),
    );
    if (matchedCategories.length === 1) return matchedCategories[0].name;
  }

  return "";
}

function resolveImportCategoryIds(
  dbCategories: DbCategory[],
  sheetName: string,
  categoryCell: string,
  subcategoryName: string,
): { categoryName: string; ids: CategoryIds | null; reason?: string } {
  const categoryName = resolveImportCategory(dbCategories, sheetName, categoryCell, subcategoryName);
  if (!categoryName) {
    return {
      categoryName: "",
      ids: null,
      reason: `找不到主分类：${categoryCell || sheetName || "空"}`,
    };
  }

  const category = dbCategories.find((item) => item.name === categoryName);
  if (!category) {
    return {
      categoryName,
      ids: null,
      reason: `主分类不在数据库中：${categoryName}`,
    };
  }

  if (!subcategoryName) {
    return {
      categoryName,
      ids: { categoryId: category.id, subcategoryId: null },
    };
  }

  const subcategory = category.subcategories.find((item) => item.name === subcategoryName);
  if (!subcategory) {
    return {
      categoryName,
      ids: null,
      reason: `「${categoryName}」下面找不到子分类：${subcategoryName}`,
    };
  }

  return {
    categoryName,
    ids: {
      categoryId: category.id,
      subcategoryId: subcategory.id,
    },
  };
}

function normalizeUpdateDate(value: string) {
  const normalized = value.trim().replace(/\./g, "-").replace(/\//g, "-");
  const parts = normalized.split("-").map((part) => Number(part));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    return value.trim();
  }
  const [year, month, day] = parts;
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeText(item)).filter(Boolean);
      }
    } catch {
      return [text];
    }
    return [text];
  }
  return [];
}

function normalizeForCompare(game: any) {
  return {
    name: normalizeText(game.name),
    category: normalizeArray(game.category),
    subcategory: normalizeArray(game.subcategory),
    category_id: game.category_id ?? null,
    subcategory_id: game.subcategory_id ?? null,
    code: normalizeText(game.code),
    unzipcode: normalizeText(game.unzipcode),
    quarkpan: normalizeText(game.quarkpan),
    quarkcode: normalizeText(game.quarkcode),
    baidupan: normalizeText(game.baidupan),
    baiducode: normalizeText(game.baiducode),
    thunderpan: normalizeText(game.thunderpan),
    thundercode: normalizeText(game.thundercode),
    updatedate: normalizeText(game.updatedate),
    image: normalizeText(game.image),
    video: normalizeText(game.video),
  };
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [diffResult, setDiffResult] = useState<DiffResult>({
    added: [],
    modified: [],
    unchanged: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const XLSX = await import("xlsx");
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const allGames: any[] = [];
        const nextWarnings: string[] = [];
        const skippedPreviewRows: ImportPreviewRow[] = [];
        const dbCategories = await fetchDbCategoryOptions();

        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
          }) as any[][];

          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row || !row[0]) continue;
            const name = String(row[0] || "").trim();
            if (!name) continue;

            const p1 = String(row[1] || "").trim();
            const s1 = String(row[2] || "").trim();
            const resolved = resolveImportCategoryIds(dbCategories, sheetName, p1, s1);
            if (!resolved.ids) {
              nextWarnings.push(`${sheetName} 第 ${i + 1} 行「${name}」跳过：${resolved.reason}`);
              skippedPreviewRows.push({
                key: `${sheetName}-${i + 1}-${name}-skipped`,
                status: "跳过",
                sheetName,
                rowNumber: i + 1,
                name,
                categoryName: resolved.categoryName || p1 || sheetName,
                subcategoryName: s1,
                categoryId: null,
                subcategoryId: null,
                updatedate: normalizeUpdateDate(String(row[10] || "").trim()),
                quarkpan: String(row[4] || "").trim(),
                baidupan: String(row[6] || "").trim(),
                thunderpan: String(row[8] || "").trim(),
                reason: resolved.reason,
              });
              continue;
            }
            const category: string[] = [resolved.categoryName];
            const subcategory: string[] = s1 ? [s1] : [];

            allGames.push({
              name,
              category,
              subcategory,
              category_id: resolved.ids.categoryId,
              subcategory_id: resolved.ids.subcategoryId,
              code: "",
              unzipcode: String(row[3] || "").trim(),
              quarkpan: String(row[4] || "").trim(),
              quarkcode: String(row[5] || "").trim(),
              baidupan: String(row[6] || "").trim(),
              baiducode: String(row[7] || "").trim(),
              thunderpan: String(row[8] || "").trim(),
              thundercode: String(row[9] || "").trim(),
              updatedate: normalizeUpdateDate(String(row[10] || "").trim()),
              image: String(row[11] || "").trim(),
              video: String(row[12] || "").trim(),
              __sheetName: sheetName,
              __rowNumber: i + 1,
            });
          }
        });

        setWarnings(nextWarnings);
        setExcelData(allGames);
        await compareData(allGames, skippedPreviewRows);
      } catch (err: any) {
        alert("读取Excel失败: " + err.message);
      }
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }

  async function compareData(excelGames: any[], skippedRows: ImportPreviewRow[] = []) {
    const allExisting: Game[] = [];
    const PAGE_SIZE_FETCH = 1000;
    let page = 0;

    while (true) {
      const from = page * PAGE_SIZE_FETCH;
      const to = from + PAGE_SIZE_FETCH - 1;
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to);

      if (error || !data || data.length === 0) break;
      allExisting.push(...(data as Game[]));
      if (data.length < PAGE_SIZE_FETCH) break;
      page++;
    }

    const existingMap = new Map<string, Game>();
    allExisting.forEach((g) => existingMap.set(normalizeText(g.name), g));

    const result: DiffResult = { added: [], modified: [], unchanged: [] };
    const nextPreviewRows: ImportPreviewRow[] = [...skippedRows];

    excelGames.forEach((excelGame) => {
      const existing = existingMap.get(normalizeText(excelGame.name));
      let status: ImportPreviewStatus = "新增";
      if (!existing) {
        result.added.push(excelGame);
      } else {
        const normalizedExcel = normalizeForCompare(excelGame);
        const normalizedExisting = normalizeForCompare(existing);
        const changed =
          normalizedExcel.code !== normalizedExisting.code ||
          normalizedExcel.unzipcode !== normalizedExisting.unzipcode ||
          normalizedExcel.quarkpan !== normalizedExisting.quarkpan ||
          normalizedExcel.quarkcode !== normalizedExisting.quarkcode ||
          normalizedExcel.baidupan !== normalizedExisting.baidupan ||
          normalizedExcel.baiducode !== normalizedExisting.baiducode ||
          normalizedExcel.thunderpan !== normalizedExisting.thunderpan ||
          normalizedExcel.thundercode !== normalizedExisting.thundercode ||
          normalizedExcel.updatedate !== normalizedExisting.updatedate ||
          normalizedExcel.image !== normalizedExisting.image ||
          normalizedExcel.video !== normalizedExisting.video ||
          normalizedExcel.category_id !== normalizedExisting.category_id ||
          normalizedExcel.subcategory_id !== normalizedExisting.subcategory_id ||
          JSON.stringify(normalizedExcel.category) !== JSON.stringify(normalizedExisting.category) ||
          JSON.stringify(normalizedExcel.subcategory) !==
            JSON.stringify(normalizedExisting.subcategory);

        if (changed) {
          status = "修改";
          result.modified.push({ new: excelGame, old: existing });
        } else {
          status = "无变化";
          result.unchanged.push(excelGame);
        }
      }

      nextPreviewRows.push({
        key: `${excelGame.__sheetName || "Excel"}-${excelGame.__rowNumber || excelGame.name}-${excelGame.name}`,
        status,
        sheetName: excelGame.__sheetName || "Excel",
        rowNumber: excelGame.__rowNumber || 0,
        name: normalizeText(excelGame.name),
        categoryName: normalizeArray(excelGame.category)[0] || "",
        subcategoryName: normalizeArray(excelGame.subcategory)[0] || "",
        categoryId: excelGame.category_id ?? null,
        subcategoryId: excelGame.subcategory_id ?? null,
        updatedate: normalizeText(excelGame.updatedate),
        quarkpan: normalizeText(excelGame.quarkpan),
        baidupan: normalizeText(excelGame.baidupan),
        thunderpan: normalizeText(excelGame.thunderpan),
      });
    });

    setDiffResult(result);
    setPreviewRows(
      nextPreviewRows.sort((a, b) => {
        if (a.sheetName !== b.sheetName) return a.sheetName.localeCompare(b.sheetName);
        return a.rowNumber - b.rowNumber;
      }),
    );
  }

  async function doImport() {
    const total = diffResult.added.length + diffResult.modified.length;
    if (total === 0) {
      alert("没有需要导入的数据");
      return;
    }

    if (
      !confirm(
        `确定要导入 ${total} 条数据吗？\n新增: ${diffResult.added.length}, 修改: ${diffResult.modified.length}`,
      )
    ) {
      return;
    }

    setSaving(true);
    let success = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const item of diffResult.modified) {
      try {
        if (!item.new.category_id) {
          throw new Error("缺少 category_id");
        }
        const subcategoryIds = item.new.subcategory_id ?? null;
        const { error } = await supabase
          .from("games")
          .update({
            category: normalizeArray(item.new.category),
            subcategory: normalizeArray(item.new.subcategory),
            category_id: item.new.category_id,
            subcategory_id: subcategoryIds,
            code: normalizeText(item.new.code),
            unzipcode: normalizeText(item.new.unzipcode),
            quarkpan: normalizeText(item.new.quarkpan),
            quarkcode: normalizeText(item.new.quarkcode),
            baidupan: normalizeText(item.new.baidupan),
            baiducode: normalizeText(item.new.baiducode),
            thunderpan: normalizeText(item.new.thunderpan),
            thundercode: normalizeText(item.new.thundercode),
            updatedate: normalizeText(item.new.updatedate),
            image: normalizeText(item.new.image),
            video: normalizeText(item.new.video),
          })
          .eq("name", item.new.name);

        if (error) throw error;
        success++;
      } catch (error: any) {
        failed++;
        failures.push(`修改「${item.new.name}」失败：${error.message || "未知错误"}`);
      }
    }

    for (const game of diffResult.added) {
      try {
        if (!game.category_id) {
          throw new Error("缺少 category_id");
        }
        const { error } = await supabase.from("games").insert([
          {
            name: normalizeText(game.name),
            category: normalizeArray(game.category),
            subcategory: normalizeArray(game.subcategory),
            category_id: game.category_id,
            subcategory_id: game.subcategory_id ?? null,
            code: normalizeText(game.code),
            unzipcode: normalizeText(game.unzipcode),
            quarkpan: normalizeText(game.quarkpan),
            quarkcode: normalizeText(game.quarkcode),
            baidupan: normalizeText(game.baidupan),
            baiducode: normalizeText(game.baiducode),
            thunderpan: normalizeText(game.thunderpan),
            thundercode: normalizeText(game.thundercode),
            updatedate: normalizeText(game.updatedate),
            image: normalizeText(game.image),
            video: normalizeText(game.video),
          },
        ]);

        if (error) throw error;
        success++;
      } catch (error: any) {
        failed++;
        failures.push(`新增「${game.name}」失败：${error.message || "未知错误"}`);
      }
    }

    setSaving(false);
    alert(
      `导入完成！成功: ${success}, 失败: ${failed}` +
        (failures.length > 0 ? `\n\n${failures.slice(0, 10).join("\n")}` : ""),
    );
    onImported();
  }

  const hasData = diffResult.added.length + diffResult.modified.length > 0;
  const skippedCount = previewRows.filter((row) => row.status === "跳过").length;
  const statusStyles: Record<ImportPreviewStatus, { color: string; background: string }> = {
    新增: { color: "#166534", background: "#dcfce7" },
    修改: { color: "#9a3412", background: "#ffedd5" },
    无变化: { color: "#475569", background: "#f1f5f9" },
    跳过: { color: "#991b1b", background: "#fee2e2" },
  };

  return (
    <>
      <div className="popup-mask modal-overlay" style={{ display: "flex" }} onClick={onClose}>
        <div
          className="popup-content modal-content"
          style={{ width: "min(1180px, 96vw)", maxWidth: "96vw" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 15,
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                background:
                  "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              📥 导入Excel数据
            </h2>
            <button onClick={onClose} className="close-btn">
              ×
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: "13px",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              选择Excel文件（.xlsx）
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx"
              onChange={handleFileSelect}
              style={{
                padding: 10,
                border: "2px dashed var(--border-light)",
                borderRadius: "var(--radius-md)",
                width: "100%",
                boxSizing: "border-box" as const,
                fontSize: "13px",
                background: "rgba(255,255,255,0.9)",
              }}
            />
          </div>

          {excelData.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "15px",
                marginBottom: 15,
                padding: "12px",
                background: "rgba(216,87,232,0.05)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(216,87,232,0.1)",
              }}
            >
              <span
                style={{
                  color: "var(--success-color)",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                🆕 新增: {diffResult.added.length}
              </span>
              <span
                style={{
                  color: "var(--warning-color)",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                ✏️ 修改: {diffResult.modified.length}
              </span>
              <span style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>
                无变化: {diffResult.unchanged.length}
              </span>
              {skippedCount > 0 && (
                <span style={{ color: "#991b1b", fontSize: "13px", fontWeight: 600 }}>
                  跳过: {skippedCount}
                </span>
              )}
            </div>
          )}

          {warnings.length > 0 && (
            <div
              style={{
                maxHeight: 140,
                overflowY: "auto",
                marginBottom: 15,
                padding: "10px 12px",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "var(--radius-sm)",
                color: "#9a3412",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              <strong>有 {warnings.length} 行没有导入：</strong>
              {warnings.slice(0, 20).map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          )}

          {previewRows.length > 0 && (
            <div style={{ marginBottom: 15 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 10,
                }}
              >
                <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                  导入确认表
                </strong>
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                  共 {previewRows.length} 行，确认后只写入新增和修改
                </span>
              </div>
              <div
                style={{
                  maxHeight: 320,
                  overflow: "auto",
                  border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255,255,255,0.94)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    minWidth: 920,
                    borderCollapse: "collapse",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "状态",
                        "位置",
                        "游戏名称",
                        "主分类",
                        "子分类",
                        "关联ID",
                        "更新日期",
                        "网盘",
                        "说明",
                      ].map((header) => (
                        <th
                          key={header}
                          style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                            padding: "9px 10px",
                            textAlign: "left",
                            borderBottom: "1px solid var(--border-light)",
                            background: "#fff",
                            color: "var(--text-primary)",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const netdiskCount = [row.quarkpan, row.baidupan, row.thunderpan].filter(
                        Boolean,
                      ).length;
                      return (
                        <tr key={row.key}>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 48,
                                padding: "3px 8px",
                                borderRadius: 999,
                                fontWeight: 700,
                                color: statusStyles[row.status].color,
                                background: statusStyles[row.status].background,
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.sheetName} / {row.rowNumber}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              minWidth: 180,
                              color: "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {row.name}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.categoryName || "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.subcategoryName || "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              whiteSpace: "nowrap",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {row.categoryId ?? "-"} / {row.subcategoryId ?? "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.updatedate || "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {netdiskCount > 0 ? `${netdiskCount} 个` : "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              borderBottom: "1px solid rgba(0,0,0,0.05)",
                              minWidth: 160,
                              color: row.reason ? "#991b1b" : "var(--text-tertiary)",
                            }}
                          >
                            {row.reason || (row.status === "修改" ? "将覆盖同名游戏" : "-")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div
            className="form-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: 20,
            }}
          >
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "9px 20px",
                background: "rgba(255,255,255,0.9)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              取消
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || saving}
              style={{
                padding: "9px 20px",
                background:
                  "linear-gradient(90deg, var(--secondary-color), var(--primary-color))",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                boxShadow: "0 3px 8px rgba(147,51,234,0.25)",
                opacity: loading || saving ? 0.7 : 1,
              }}
            >
              {excelData.length > 0 ? "重新选择" : "选择文件"}
            </button>
            <button
              onClick={doImport}
              disabled={!hasData || saving}
              style={{
                padding: "9px 24px",
                background: hasData
                  ? "linear-gradient(90deg, var(--success-color), var(--primary-color))"
                  : "rgba(245,245,245,0.95)",
                color: hasData ? "white" : "var(--text-tertiary)",
                border: hasData ? "none" : "1px solid var(--border-light)",
                borderRadius: "var(--radius-sm)",
                cursor: hasData ? "pointer" : "not-allowed",
                fontSize: "13px",
                fontWeight: 600,
                boxShadow: hasData ? "0 3px 8px rgba(129,199,132,0.3)" : "none",
                opacity: 1,
              }}
            >
              {saving ? "导入中..." : "确认导入"}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div
          className="popup-mask"
          style={{ display: "flex", background: "rgba(255,255,255,0.92)" }}
        >
          <div style={{ textAlign: "center" }}>
            <div className="loading" style={{ justifyContent: "center" }} />
            <p
              style={{
                color: "var(--text-secondary)",
                marginTop: "12px",
                fontSize: "14px",
              }}
            >
              处理中，请稍候...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
