"use client";

import { useEffect } from "react";

interface ConfirmModalProps {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="popup-mask modal-overlay" style={{ display: "flex" }} onClick={onCancel}>
      <div
        className="popup-content modal-content"
        style={{ maxWidth: 400, textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "28px 24px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: danger ? "rgba(229,57,53,0.1)" : "rgba(33,150,243,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            {danger ? "⚠️" : "💡"}
          </div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "0 24px 24px",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "9px 20px",
              background: "rgba(255,255,255,0.9)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "9px 20px",
              background: danger
                ? "linear-gradient(90deg, #e53935, #c62828)"
                : "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: danger
                ? "0 3px 10px rgba(229,57,53,0.35)"
                : "0 3px 8px rgba(216,87,232,0.25)",
              transition: "all 0.2s",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
