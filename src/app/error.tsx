"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        color: "#666",
        fontFamily: "微软雅黑, Arial, sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #fce4ec, #f3e5f5)",
      }}
    >
      <h2
        style={{
          color: "#d857e8",
          marginBottom: "10px",
          fontSize: "24px",
        }}
      >
        页面加载遇到问题
      </h2>
      <p style={{ fontSize: "14px", color: "#999", marginBottom: "20px" }}>
        请尝试刷新页面或使用其他浏览器访问
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px",
          background: "linear-gradient(90deg, #d857e8, #f06292)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "20px",
        }}
      >
        重试
      </button>
      <details
        style={{
          textAlign: "left",
          fontSize: "12px",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            color: "#999",
            padding: "4px 0",
          }}
        >
          技术信息（仅供调试）
        </summary>
        <pre
          style={{
            background: "#f5f5f5",
            padding: "10px",
            borderRadius: "4px",
            overflow: "auto",
            fontSize: "11px",
            marginTop: "8px",
            color: "#c00",
          }}
        >
          {error.message}
          {"\n"}
          {error.stack?.split("\n").slice(0, 5).join("\n")}
        </pre>
      </details>
    </div>
  );
}
