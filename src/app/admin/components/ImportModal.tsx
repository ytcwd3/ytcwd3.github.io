"use client";

import { useState, useRef } from "react";
import { supabase, Game } from "@/lib/supabase";
import { SHEET_DB_CAT, UI_CAT_TO_DB } from "./constants";

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

interface DiffResult {
  added: any[];
  modified: { new: any; old: Game }[];
  unchanged: any[];
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

        workbook.SheetNames.forEach((sheetName: string) => {
          const sheetDbCat = SHEET_DB_CAT[sheetName];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
          }) as any[][];

          if (!sheetDbCat) return;

          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row || !row[0]) continue;
            const name = String(row[0] || "").trim();
            if (!name) continue;

            const p1 = String(row[1] || "").trim();
            let dbCat: string;
            if (p1 && UI_CAT_TO_DB[p1]) {
              dbCat = UI_CAT_TO_DB[p1];
            } else {
              dbCat = sheetDbCat;
            }
            const category: string[] = [dbCat];

            const s1 = String(row[2] || "").trim();
            const subcategory: string[] = s1 ? [s1] : [];

            allGames.push({
              name,
              category,
              subcategory,
              code: String(row[3] || "").trim(),
              unzipcode: String(row[4] || "").trim(),
              quarkpan: String(row[5] || "").trim(),
              baidupan: String(row[6] || "").trim(),
              thunderpan: String(row[7] || "").trim(),
              updatedate: String(row[8] || "").trim(),
            });
          }
        });

        setExcelData(allGames);
        await compareData(allGames);
      } catch (err: any) {
        alert("读取Excel失败: " + err.message);
      }
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }

  async function compareData(excelGames: any[]) {
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
    allExisting.forEach((g) => existingMap.set(g.name, g));

    const result: DiffResult = { added: [], modified: [], unchanged: [] };

    excelGames.forEach((excelGame) => {
      const existing = existingMap.get(excelGame.name);
      if (!existing) {
        result.added.push(excelGame);
      } else {
        const changed =
          excelGame.quarkpan !== existing.quarkpan ||
          excelGame.baidupan !== existing.baidupan ||
          excelGame.thunderpan !== existing.thunderpan ||
          excelGame.code !== existing.code ||
          JSON.stringify(excelGame.category) !==
            JSON.stringify(existing.category) ||
          JSON.stringify(excelGame.subcategory) !==
            JSON.stringify(existing.subcategory);

        if (changed) {
          result.modified.push({ new: excelGame, old: existing });
        } else {
          result.unchanged.push(excelGame);
        }
      }
    });

    setDiffResult(result);
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

    for (const item of diffResult.modified) {
      try {
        const { error } = await supabase
          .from("games")
          .update({
            category: item.new.category,
            subcategory: item.new.subcategory,
            code: item.new.code,
            unzipcode: item.new.unzipcode,
            quarkpan: item.new.quarkpan,
            baidupan: item.new.baidupan,
            thunderpan: item.new.thunderpan,
            updatedate: item.new.updatedate,
          })
          .eq("name", item.new.name);

        if (error) throw error;
        success++;
      } catch {
        failed++;
      }
    }

    for (const game of diffResult.added) {
      try {
        const { error } = await supabase.from("games").insert([
          {
            name: game.name,
            category: game.category,
            subcategory: game.subcategory,
            code: game.code,
            unzipcode: game.unzipcode,
            quarkpan: game.quarkpan,
            baidupan: game.baidupan,
            thunderpan: game.thunderpan,
            updatedate: game.updatedate,
          },
        ]);

        if (error) throw error;
        success++;
      } catch {
        failed++;
      }
    }

    setSaving(false);
    alert(`导入完成！成功: ${success}, 失败: ${failed}`);
    onImported();
  }

  const hasData = diffResult.added.length + diffResult.modified.length > 0;

  return (
    <>
      <div className="popup-mask" style={{ display: "flex" }} onClick={onClose}>
        <div
          className="popup-content"
          style={{ maxWidth: 680 }}
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

          <div style={{ marginBottom: 20 }}>
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
            </div>
          )}

          <div
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
                  : "var(--bg-disabled)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: hasData ? "pointer" : "not-allowed",
                fontSize: "13px",
                fontWeight: 600,
                boxShadow: hasData ? "0 3px 8px rgba(129,199,132,0.3)" : "none",
                opacity: !hasData ? 0.6 : 1,
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
