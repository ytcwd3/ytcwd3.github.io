import { Game } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

interface GameCardProps {
  game: Game;
  index: number;
  onOpenQrModal: (src: string, title: string) => void;
}

// 各平台图标 SVG
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

export default function GameCard({ game, index, onOpenQrModal }: GameCardProps) {
  const catColors: Record<string, string> = {
    "PC及安卓": "#9333ea",
    "任天堂": "#e53935",
    "索尼": "#1976d2",
    "其他平台": "#666",
    PC: "#9333ea",
    NS: "#e53935",
  };
  const catColor = catColors[game.category?.[0] || ""] || "#9333ea";

  return (
    <div className="result-item" data-category={game.category?.[0]}>
      {/* 左侧：缩略图 */}
      <div className="game-thumb">
        {game.image ? (
          <img
            src={game.image}
            alt={game.name}
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
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            color: "white",
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

        {/* 提取码 + 解压密码 */}
        <div className="game-code-row">
          {(game as any).quarkcode && (
            <span><span style={{ color: "#999", fontSize: 12 }}>夸克码：</span><span className="game-code-value">{((game as any).quarkcode)}</span></span>
          )}
          {(game as any).baiducode && (
            <span><span style={{ color: "#999", fontSize: 12 }}>百度码：</span><span className="game-code-value">{((game as any).baiducode)}</span></span>
          )}
          {(game as any).thundercode && (
            <span><span style={{ color: "#999", fontSize: 12 }}>迅雷码：</span><span className="game-code-value">{((game as any).thundercode)}</span></span>
          )}
          {game.unzipcode && game.unzipcode !== "无" && (
            <span><span style={{ color: "#999", fontSize: 12 }}>解压密码：</span><span className="game-code-value">{game.unzipcode}</span></span>
          )}
        </div>

        {/* 三网盘链接（图标+文字） */}
        <div className="game-links-row">
          {game.quarkpan && (
            <a href={game.quarkpan} target="_blank" rel="noopener noreferrer" className="drive-link drive-link-quark">
              <QuarkIcon /> 夸克
              {(game as any).quarkcode && <span className="drive-code">{(game as any).quarkcode}</span>}
            </a>
          )}
          {game.baidupan && (
            <a href={game.baidupan} target="_blank" rel="noopener noreferrer" className="drive-link drive-link-baidu">
              <BaiduIcon /> 百度
              {(game as any).baiducode && <span className="drive-code">{(game as any).baiducode}</span>}
            </a>
          )}
          {game.thunderpan && (
            <a href={game.thunderpan} target="_blank" rel="noopener noreferrer" className="drive-link drive-link-xunlei">
              <XunleiIcon /> 迅雷
              {(game as any).thundercode && <span className="drive-code">{(game as any).thundercode}</span>}
            </a>
          )}
          {game.video && (
            <a href={game.video} target="_blank" rel="noopener noreferrer" className="drive-link drive-link-video">
              <VideoIcon /> 视频
            </a>
          )}
        </div>
      </div>

      {/* 右侧：二维码（可点击放大） */}
      <div className="qrcode-area">
        {game.quarkpan && (
          <div
            className="qrcode-box"
            title="点击放大夸克二维码"
            onClick={() => onOpenQrModal(game.quarkpan!, `${game.name} 夸克`)}
          >
            <QRCodeSVG value={game.quarkpan} size={60} level="M" includeMargin={false} />
          </div>
        )}
        {game.baidupan && (
          <div
            className="qrcode-box"
            title="点击放大百度二维码"
            onClick={() => onOpenQrModal(game.baidupan!, `${game.name} 百度`)}
          >
            <QRCodeSVG value={game.baidupan} size={60} level="M" includeMargin={false} />
          </div>
        )}
        {game.thunderpan && (
          <div
            className="qrcode-box"
            title="点击放大迅雷二维码"
            onClick={() => onOpenQrModal(game.thunderpan!, `${game.name} 迅雷`)}
          >
            <QRCodeSVG value={game.thunderpan} size={60} level="M" includeMargin={false} />
          </div>
        )}
      </div>
    </div>
  );
}
