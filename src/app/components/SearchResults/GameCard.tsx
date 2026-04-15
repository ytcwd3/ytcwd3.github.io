import { Game } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { useState, Component, ReactNode } from "react";

interface GameCardProps {
  game: Game;
  index: number;
  onOpenQrModal: (src: string, title: string) => void;
}

const QuarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill="#ffc000" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">Q</text>
  </svg>
);

const BaiduIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill="#2932e1" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">B</text>
  </svg>
);

const XunleiIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill="#00b42a" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">X</text>
  </svg>
);

const VideoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <polygon points="5,3 19,12 5,21" fill="#e53935" />
  </svg>
);

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// 二维码错误边界：渲染失败时显示纯文字
class QRFallback extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <span style={{ fontSize: 10, color: "#999" }}>二维码加载失败</span>;
    }
    return this.props.children;
  }
}

// 从链接中解析提取码
function parseCodeFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]pwd=([^&\s#]+)/i);
  return match ? match[1] : null;
}

export default function GameCard({ game, index, onOpenQrModal }: GameCardProps) {
  const catColors: Record<string, string> = {
    "PC及安卓": "#9333ea", "任天堂": "#e53935", "索尼": "#1976d2",
    "其他平台": "#666", PC: "#9333ea", NS: "#e53935",
  };
  const catColor = catColors[game.category?.[0] || ""] || "#9333ea";
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function getDisplayCode(url: string, code: string): string {
    return parseCodeFromUrl(url) || code || "8888";
  }

  function handleCopy(id: string, url: string, code: string) {
    const displayCode = getDisplayCode(url, code);
    const text = `${url}\n提取码：${displayCode}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="result-item" data-category={game.category?.[0]}>
      {/* 左侧：缩略图 */}
      <div className="game-thumb">
        {game.image ? (
          <img
            src={game.image}
            alt={game.name}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              const ph = el.parentElement?.querySelector(".thumb-ph") as HTMLElement;
              if (ph) ph.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="thumb-ph"
          style={{
            display: game.image ? "none" : "flex",
            width: "100%", height: "100%",
            alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "white",
            background: `linear-gradient(135deg, ${catColor}, #d857e8)`,
            borderRadius: 8,
          }}
        >
          {game.name.charAt(0)}
        </div>
      </div>

      {/* 中间：二维码 + 信息 */}
      <div className="result-middle">
        {/* 名称 + 分类 */}
        <div className="game-title-row">
          <span className="game-index" style={{ color: catColor }}>{index + 1}.</span>
          <span className="game-name-text">{game.name}</span>
          <span className="game-cat-tag" style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}40` }}>
            {game.category?.[0] || ""}
          </span>
          {game.subcategory?.[0] && (
            <span className="game-cat-tag" style={{ background: "#f0f0f0", color: "#666", border: "1px solid #ddd" }}>
              {game.subcategory[0]}
            </span>
          )}
        </div>

        {/* 三网盘链接（图标+文字） */}
        <div className="game-links-row">
          {game.quarkpan && (
            <div className="drive-item">
              <a
                href={game.quarkpan}
                target="_blank"
                rel="noopener noreferrer"
                className="drive-link drive-link-quark"
              >
                <QuarkIcon /> 夸克
                <span className="drive-code">{getDisplayCode(game.quarkpan, (game as any).quarkcode || "")}</span>
              </a>
              <button
                className={`drive-copy-btn ${copiedId === "quark" ? "copied" : ""}`}
                onClick={() => handleCopy("quark", game.quarkpan, (game as any).quarkcode || "")}
                title="复制链接+提取码"
              >
                {copiedId === "quark" ? "✓" : <CopyIcon />}
              </button>
            </div>
          )}
          {game.baidupan && (
            <div className="drive-item">
              <a
                href={game.baidupan}
                target="_blank"
                rel="noopener noreferrer"
                className="drive-link drive-link-baidu"
              >
                <BaiduIcon /> 百度
                <span className="drive-code">{getDisplayCode(game.baidupan, (game as any).baiducode || "")}</span>
              </a>
              <button
                className={`drive-copy-btn ${copiedId === "baidu" ? "copied" : ""}`}
                onClick={() => handleCopy("baidu", game.baidupan, (game as any).baiducode || "")}
                title="复制链接+提取码"
              >
                {copiedId === "baidu" ? "✓" : <CopyIcon />}
              </button>
            </div>
          )}
          {game.thunderpan && (
            <div className="drive-item">
              <a
                href={game.thunderpan}
                target="_blank"
                rel="noopener noreferrer"
                className="drive-link drive-link-xunlei"
              >
                <XunleiIcon /> 迅雷
                <span className="drive-code">{getDisplayCode(game.thunderpan, (game as any).thundercode || "")}</span>
              </a>
              <button
                className={`drive-copy-btn ${copiedId === "thunder" ? "copied" : ""}`}
                onClick={() => handleCopy("thunder", game.thunderpan, (game as any).thundercode || "")}
                title="复制链接+提取码"
              >
                {copiedId === "thunder" ? "✓" : <CopyIcon />}
              </button>
            </div>
          )}
          {game.video && (
            <a href={game.video} target="_blank" rel="noopener noreferrer" className="drive-link drive-link-video">
              <VideoIcon /> 视频
            </a>
          )}
        </div>

        {/* 解压密码 */}
        {game.unzipcode && game.unzipcode !== "无" && (
          <div className="game-code-row">
            <span style={{ color: "#999", fontSize: 12 }}>解压密码：</span>
            <span className="game-code-value">{game.unzipcode}</span>
          </div>
        )}
      </div>

      {/* 右侧：二维码 */}
      <div className="qrcode-area">
        {game.quarkpan && (
          <div
            className="qrcode-box"
            title="点击放大夸克二维码"
            onClick={() => onOpenQrModal(game.quarkpan!, `${game.name} 夸克`)}
          >
            <div className="qr-label" style={{ color: "#ffc000" }}>夸克</div>
            <QRFallback>
              <QRCodeSVG value={game.quarkpan} size={60} level="M" includeMargin={false} />
            </QRFallback>
          </div>
        )}
        {game.baidupan && (
          <div
            className="qrcode-box"
            title="点击放大百度二维码"
            onClick={() => onOpenQrModal(game.baidupan!, `${game.name} 百度`)}
          >
            <div className="qr-label" style={{ color: "#2932e1" }}>百度</div>
            <QRFallback>
              <QRCodeSVG value={game.baidupan} size={60} level="M" includeMargin={false} />
            </QRFallback>
          </div>
        )}
        {game.thunderpan && (
          <div
            className="qrcode-box"
            title="点击放大迅雷二维码"
            onClick={() => onOpenQrModal(game.thunderpan!, `${game.name} 迅雷`)}
          >
            <div className="qr-label" style={{ color: "#00b42a" }}>迅雷</div>
            <QRFallback>
              <QRCodeSVG value={game.thunderpan} size={60} level="M" includeMargin={false} />
            </QRFallback>
          </div>
        )}
      </div>
    </div>
  );
}
