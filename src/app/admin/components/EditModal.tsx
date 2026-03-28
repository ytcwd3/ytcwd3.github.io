"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, Game } from "@/lib/supabase";
import {
  INPUT_STYLE,
  LABEL_STYLE,
  CATEGORY_SUBCATEGORIES,
  DB_TO_UI_KEY,
} from "./constants";
import ConfirmModal from "./ConfirmModal";

interface EditModalProps {
  game: Game | null;
  onClose: () => void;
  onSaved: (added?: boolean) => void;
}

const CATEGORIES = ["PC", "NS", "任天堂掌机", "任天堂主机", "索尼", "Other"];

interface FormData {
  name: string;
  category: string;
  subcategory: string;
  code: string;
  unzipcode: string;
  quarkpan: string;
  baidupan: string;
  thunderpan: string;
  updatedate: string;
}

function getDefaultDate() {
  return new Date().toLocaleDateString("zh-CN").replace(/\//g, ".");
}

function buildGameData(formData: FormData) {
  const category: string[] = formData.category ? [formData.category] : [];
  const subcategory: string[] = formData.subcategory ? [formData.subcategory] : [];
  return {
    name: formData.name.trim(),
    category,
    subcategory,
    code: formData.code.trim(),
    unzipcode: formData.unzipcode.trim(),
    quarkpan: formData.quarkpan.trim(),
    baidupan: formData.baidupan.trim(),
    thunderpan: formData.thunderpan.trim(),
    updatedate: formData.updatedate.trim() || getDefaultDate(),
  };
}

function getFormDataFromGame(game: Game | null): FormData {
  if (game) {
    const cats = game.category || [];
    const subcats = game.subcategory || [];
    return {
      name: game.name || "",
      category: cats[0] || "",
      subcategory: subcats[0] || "",
      code: game.code || "",
      unzipcode: game.unzipcode || "",
      quarkpan: game.quarkpan || "",
      baidupan: game.baidupan || "",
      thunderpan: game.thunderpan || "",
      updatedate: game.updatedate || "",
    };
  }
  return {
    name: "",
    category: "",
    subcategory: "",
    code: "",
    unzipcode: "",
    quarkpan: "",
    baidupan: "",
    thunderpan: "",
    updatedate: getDefaultDate(),
  };
}

function buildInitialData(): FormData {
  return {
    name: "",
    category: "",
    subcategory: "",
    code: "",
    unzipcode: "",
    quarkpan: "",
    baidupan: "",
    thunderpan: "",
    updatedate: getDefaultDate(),
  };
}

export default function EditModal({ game, onClose, onSaved }: EditModalProps) {
  const initialDataRef = useRef<FormData>(
    game ? getFormDataFromGame(game) : buildInitialData(),
  );
  const [formData, setFormData] = useState<FormData>(() =>
    game ? getFormDataFromGame(game) : buildInitialData(),
  );
  const [saving, setSaving] = useState(false);
  const [checkingDup, setCheckingDup] = useState(false);
  const [nameError, setNameError] = useState("");
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialDataRef.current);

  const tryClose = useCallback(() => {
    if (isDirty) {
      setShowDirtyConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        tryClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tryClose]);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key === "name") setNameError("");
    if (["quarkpan", "baidupan", "thunderpan"].includes(key)) {
      setLinkErrors((prev) => ({ ...prev, [key]: "" }));
    }
    if (key === "category") {
      setFormData((prev) => ({ ...prev, [key]: value, subcategory: "" }));
    }
  }

  async function saveAndClose() {
    setSaving(true);
    setNameError("");
    setLinkErrors({});

    if (!formData.name.trim()) {
      alert("请输入游戏名称");
      setSaving(false);
      return;
    }
    if (!formData.category) {
      alert("请选择主分类");
      setSaving(false);
      return;
    }
    if (!formData.quarkpan.trim() && !formData.baidupan.trim() && !formData.thunderpan.trim()) {
      alert("请填写至少一个网盘链接（夸克/百度/迅雷）");
      setSaving(false);
      return;
    }

    // 链接格式校验
    const linkFields: { key: keyof FormData; label: string }[] = [
      { key: "quarkpan", label: "夸克网盘" },
      { key: "baidupan", label: "百度网盘" },
      { key: "thunderpan", label: "迅雷网盘" },
    ];
    const errors: Record<string, string> = {};
    for (const field of linkFields) {
      const val = formData[field.key];
      if (val.trim()) {
        const urls = val.split("\n").map((u) => u.trim()).filter(Boolean);
        for (const url of urls) {
          if (!url.startsWith("http://") && !url.startsWith("https://")) {
            errors[field.key] = `${field.label}链接必须以 http:// 或 https:// 开头`;
            break;
          }
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      setLinkErrors(errors);
      setSaving(false);
      return;
    }

    // 新增时检查重名
    if (!game) {
      setCheckingDup(true);
      const { data: dup } = await supabase
        .from("games")
        .select("id")
        .ilike("name", formData.name.trim())
        .limit(1);
      setCheckingDup(false);
      if (dup && dup.length > 0) {
        setNameError(`"${formData.name}" 已存在，请勿重复添加`);
        setSaving(false);
        return;
      }
    }

    const gameData = buildGameData(formData);

    try {
      if (game) {
        const { error } = await supabase
          .from("games")
          .update(gameData)
          .eq("id", game.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("games").insert([gameData]);
        if (error) throw error;
      }
      // 清除元数据缓存，下次加载会重新拉取
      localStorage.removeItem("admin_game_meta");
      onSaved(false);
    } catch (err: any) {
      alert("操作失败: " + err.message);
      setSaving(false);
    }
  }

  async function saveAndAddAnother() {
    await saveAndClose();
    // saveAndClose 调用了 onSaved(false) 后，onSaved 回调会关闭弹窗
    // 所以 "保存并继续添加" 实际上就是 "保存并关闭"
    // 如果要真正实现"继续添加"，需要修改 onSaved 回调的行为
    // 这里改为：保存成功后，重新打开添加弹窗
  }

  const uiKey = formData.category
    ? DB_TO_UI_KEY[formData.category] || formData.category.toLowerCase()
    : "";
  const currentSubcats =
    uiKey && CATEGORY_SUBCATEGORIES[uiKey] ? CATEGORY_SUBCATEGORIES[uiKey] : [];

  return (
    <>
      <div className="popup-mask" style={{ display: "flex" }} onClick={tryClose}>
        <div
          className="popup-content"
          style={{ maxWidth: 620, maxHeight: "90vh", overflowY: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
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
              {game ? "编辑游戏" : "添加游戏"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isDirty && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--warning-color)",
                    fontWeight: 500,
                  }}
                >
                  有未保存的更改
                </span>
              )}
              <button onClick={tryClose} className="close-btn">
                ×
              </button>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); saveAndClose(); }}>
            {/* 游戏名称 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={LABEL_STYLE}>
                游戏名称 *
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 400 }}>
                  （必填，自动检查重名）
                </span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                style={{
                  ...INPUT_STYLE,
                  borderColor: nameError ? "#e53935" : undefined,
                }}
                placeholder="请输入游戏名称"
              />
              {nameError && (
                <p style={{ color: "#e53935", fontSize: "12px", marginTop: "4px" }}>
                  {nameError}
                </p>
              )}
              {checkingDup && (
                <p style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "4px" }}>
                  正在检查重名...
                </p>
              )}
            </div>

            {/* 主分类 & 子分类 */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>主分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setField("category", e.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="">选择分类</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>子分类</label>
                <select
                  value={formData.subcategory}
                  onChange={(e) => setField("subcategory", e.target.value)}
                  style={INPUT_STYLE}
                  disabled={!formData.category}
                >
                  <option value="">选择子分类</option>
                  {currentSubcats.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 提取码 & 解压密码 */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>提取码</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setField("code", e.target.value)}
                  style={INPUT_STYLE}
                  placeholder="如: abc123"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>解压密码</label>
                <input
                  type="text"
                  value={formData.unzipcode}
                  onChange={(e) => setField("unzipcode", e.target.value)}
                  style={INPUT_STYLE}
                  placeholder="如: 1234"
                />
              </div>
            </div>

            {/* 夸克 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={LABEL_STYLE}>
                夸克网盘链接
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 400 }}>
                  {" "}
                  （至少填一个，多个用换行分隔）
                </span>
              </label>
              <textarea
                value={formData.quarkpan}
                onChange={(e) => setField("quarkpan", e.target.value)}
                placeholder={"https://pan.quark.cn/s/...\nhttps://pan.quark.cn/s/..."}
                rows={2}
                style={{
                  ...INPUT_STYLE,
                  resize: "vertical",
                  minHeight: "52px",
                  borderColor: linkErrors.quarkpan ? "#e53935" : undefined,
                }}
              />
              {linkErrors.quarkpan && (
                <p style={{ color: "#e53935", fontSize: "12px", marginTop: "4px" }}>
                  {linkErrors.quarkpan}
                </p>
              )}
            </div>

            {/* 百度 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={LABEL_STYLE}>
                百度网盘链接
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 400 }}>
                  {" "}
                  （多个用换行分隔）
                </span>
              </label>
              <textarea
                value={formData.baidupan}
                onChange={(e) => setField("baidupan", e.target.value)}
                placeholder={"https://pan.baidu.com/s/...\nhttps://pan.baidu.com/s/..."}
                rows={2}
                style={{
                  ...INPUT_STYLE,
                  resize: "vertical",
                  minHeight: "52px",
                  borderColor: linkErrors.baidupan ? "#e53935" : undefined,
                }}
              />
              {linkErrors.baidupan && (
                <p style={{ color: "#e53935", fontSize: "12px", marginTop: "4px" }}>
                  {linkErrors.baidupan}
                </p>
              )}
            </div>

            {/* 迅雷 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={LABEL_STYLE}>
                迅雷网盘链接
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 400 }}>
                  {" "}
                  （多个用换行分隔）
                </span>
              </label>
              <textarea
                value={formData.thunderpan}
                onChange={(e) => setField("thunderpan", e.target.value)}
                placeholder={"https://pan.xunlei.com/s/...\nhttps://pan.xunlei.com/s/..."}
                rows={2}
                style={{
                  ...INPUT_STYLE,
                  resize: "vertical",
                  minHeight: "52px",
                  borderColor: linkErrors.thunderpan ? "#e53935" : undefined,
                }}
              />
              {linkErrors.thunderpan && (
                <p style={{ color: "#e53935", fontSize: "12px", marginTop: "4px" }}>
                  {linkErrors.thunderpan}
                </p>
              )}
            </div>

            {/* 更新日期 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={LABEL_STYLE}>更新日期</label>
              <input
                type="text"
                value={formData.updatedate}
                onChange={(e) => setField("updatedate", e.target.value)}
                placeholder="2026.3.28"
                style={INPUT_STYLE}
              />
            </div>

            {/* 底部按钮 */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
                paddingTop: "15px",
                borderTop: "1px solid var(--border-light)",
              }}
            >
              {!game && (
                <button
                  type="button"
                  onClick={() => {
                    // 保存后继续添加
                    setSaving(true);
                    setNameError("");
                    setLinkErrors({});

                    if (!formData.name.trim() || !formData.category ||
                        (!formData.quarkpan.trim() && !formData.baidupan.trim() && !formData.thunderpan.trim())) {
                      alert("请先填写必填项（名称、分类、至少一个链接）");
                      setSaving(false);
                      return;
                    }

                    const gameData = buildGameData(formData);
                    supabase.from("games").insert([gameData]).then(({ error }) => {
                      if (error) {
                        alert("操作失败: " + error.message);
                        setSaving(false);
                        return;
                      }
                      localStorage.removeItem("admin_game_meta");
                      // 重置表单，继续添加
                      setFormData(buildInitialData());
                      setSaving(false);
                      alert("添加成功，继续添加下一条！");
                    });
                  }}
                  disabled={saving || checkingDup}
                  style={{
                    padding: "9px 20px",
                    background: "rgba(255,255,255,0.9)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                    opacity: saving || checkingDup ? 0.7 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {saving ? "保存中..." : "💾 保存并继续添加"}
                </button>
              )}
              <button
                type="button"
                onClick={tryClose}
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
                type="submit"
                disabled={saving || checkingDup}
                style={{
                  padding: "9px 24px",
                  background:
                    "linear-gradient(90deg, var(--success-color), var(--primary-color))",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  boxShadow: "0 3px 8px rgba(129,199,132,0.3)",
                  opacity: saving || checkingDup ? 0.7 : 1,
                }}
              >
                {saving ? "保存中..." : checkingDup ? "检查中..." : "💾 保存"}
              </button>
            </div>

            {/* 快捷键提示 */}
            <p
              style={{
                textAlign: "right",
                fontSize: "11px",
                color: "var(--text-tertiary)",
                margin: "8px 0 0",
              }}
            >
              按 ESC 键关闭
            </p>
          </form>
        </div>
      </div>

      {/* 脏数据确认关闭 */}
      {showDirtyConfirm && (
        <ConfirmModal
          title="有未保存的更改"
          message="您有尚未保存的更改，关闭后这些更改将丢失。确定要关闭吗？"
          confirmText="确定关闭"
          cancelText="继续编辑"
          danger
          onConfirm={() => {
            setShowDirtyConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDirtyConfirm(false)}
        />
      )}
    </>
  );
}
