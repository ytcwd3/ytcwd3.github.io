"use client";

import { SiteLink } from "@/lib/site_links";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function splitTextWithUrls(value: string) {
  const parts: Array<{ type: "text" | "url"; value: string }> = [];
  let lastIndex = 0;

  for (const match of value.matchAll(URL_PATTERN)) {
    const url = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: value.slice(lastIndex, index) });
    }
    parts.push({ type: "url", value: url });
    lastIndex = index + url.length;
  }

  if (lastIndex < value.length) {
    parts.push({ type: "text", value: value.slice(lastIndex) });
  }

  return parts;
}

function getUrlLabel(url: string) {
  if (url.includes("pan.quark.cn")) return "夸克";
  if (url.includes("pan.baidu.com")) return "百度";
  if (url.includes("pan.xunlei.com")) return "迅雷";
  return "打开链接";
}

export default function PopupLinkList({ links }: { links: SiteLink[] }) {
  return (
    <div className="popup-link-list">
      {links.map((link, index) => (
        <div className="popup-link-row" key={link.id}>
          <span className="popup-link-index">{index + 1}</span>
          <span className="popup-link-name">{link.name}</span>
          <span className="popup-link-separator">：</span>
          <span className="popup-link-content">
            {splitTextWithUrls(link.url).map((part, partIndex) =>
              part.type === "url" ? (
                <a
                  className="popup-inline-link"
                  href={part.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={`${link.id}-${part.value}-${partIndex}`}
                  title={part.value}
                >
                  {getUrlLabel(part.value)}
                </a>
              ) : (
                <span key={`${link.id}-text-${partIndex}`}>{part.value}</span>
              ),
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
