import { Game } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

interface GameCardProps {
  game: Game;
  index: number;
  onOpenQrModal: (src: string, title: string) => void;
}

export default function GameCard({
  game,
  index,
  onOpenQrModal,
}: GameCardProps) {
  return (
    <div className="result-item" data-category={game.category?.[0]}>
      {/* 缩略图 */}
      {game.image ? (
        <div className="game-thumb">
          <img
            src={game.image}
            alt={game.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 6,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="game-thumb game-thumb-placeholder">
          <span style={{ fontSize: 12, color: "#aaa" }}>
            {game.name.charAt(0)}
          </span>
        </div>
      )}

      <div className="qrcode-area">
        {/* 夸克二维码 */}
        <div
          className="qrcode-box"
          style={{
            width: 80,
            height: 80,
            textAlign: "center",
            background: "white",
            padding: 6,
            borderRadius: 6,
            border: "1px solid var(--border-light)",
            cursor: "pointer",
          }}
          onClick={() =>
            game.quarkpan && onOpenQrModal(game.quarkpan, `${game.name} 夸克`)
          }
        >
          {game.quarkpan ? (
            <QRCodeSVG
              value={game.quarkpan}
              size={68}
              level="M"
              includeMargin={false}
            />
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "#999",
                marginTop: 5,
              }}
            >
              无
            </p>
          )}
        </div>

        {/* 百度二维码 */}
        <div
          className="qrcode-box"
          style={{
            width: 80,
            height: 80,
            textAlign: "center",
            background: "white",
            padding: 6,
            borderRadius: 6,
            border: "1px solid var(--border-light)",
            cursor: "pointer",
          }}
          onClick={() =>
            game.baidupan && onOpenQrModal(game.baidupan, `${game.name} 百度`)
          }
        >
          {game.baidupan ? (
            <QRCodeSVG
              value={game.baidupan}
              size={68}
              level="M"
              includeMargin={false}
            />
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "#999",
                marginTop: 5,
              }}
            >
              无
            </p>
          )}
        </div>

        {/* 迅雷二维码 */}
        <div
          className="qrcode-box"
          style={{
            width: 80,
            height: 80,
            textAlign: "center",
            background: "white",
            padding: 6,
            borderRadius: 6,
            border: "1px solid var(--border-light)",
            cursor: "pointer",
          }}
          onClick={() =>
            game.thunderpan &&
            onOpenQrModal(game.thunderpan, `${game.name} 迅雷`)
          }
        >
          {game.thunderpan ? (
            <QRCodeSVG
              value={game.thunderpan}
              size={68}
              level="M"
              includeMargin={false}
            />
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "#999",
                marginTop: 5,
              }}
            >
              无
            </p>
          )}
        </div>
      </div>

      <div className="result-content-wrap">
        <span
          style={{
            color: ["#d857e8", "#f06292", "#9333ea"][index % 3],
            fontWeight: "bold",
          }}
        >
          {index + 1}. {game.name}
        </span>
        <span style={{ color: "#666" }}>
          （{game.category?.[0] || ""} - {game.subcategory?.[0] || ""}）
        </span>
        <div className="code-row">
          <div className="code-item">
            <label style={{ color: "#999" }}>提取码：</label>
            <span>{game.code || "无"}</span>
          </div>
          {game.unzipcode && game.unzipcode !== "无" && (
            <div className="code-item">
              <label style={{ color: "#999" }}>解压密码：</label>
              <span>{game.unzipcode}</span>
            </div>
          )}
          {game.video && (
            <div className="code-item">
              <a
                href={game.video}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#e53935",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                🎬 视频教程
              </a>
            </div>
          )}
        </div>
        <div className="pan-links">
          <div className="pan-link-item">
            <label style={{ color: "#999" }}>夸克：</label>
            <a
              href={game.quarkpan}
              target="_blank"
              style={{ color: "#0078d7" }}
            >
              {game.quarkpan || "无"}
            </a>
          </div>
          <div className="pan-link-item">
            <label style={{ color: "#999" }}>百度：</label>
            <a
              href={game.baidupan}
              target="_blank"
              style={{ color: "#0078d7" }}
            >
              {game.baidupan || "无"}
            </a>
          </div>
          {game.thunderpan && (
            <div className="pan-link-item">
              <label style={{ color: "#999" }}>迅雷：</label>
              <a
                href={game.thunderpan}
                target="_blank"
                style={{ color: "#0078d7" }}
              >
                {game.thunderpan}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
