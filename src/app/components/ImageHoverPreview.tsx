"use client";

import { useEffect, useState } from "react";

type PreviewState = {
  src: string;
  alt: string;
  x: number;
  y: number;
};

export default function ImageHoverPreview() {
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    function getTarget(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      return target?.closest(".zoomable-game-image") as HTMLImageElement | null;
    }

    function handleMouseOver(event: MouseEvent) {
      const image = getTarget(event);
      if (!image || !image.src) return;

      setPreview({
        src: image.src,
        alt: image.alt || "",
        x: event.clientX,
        y: event.clientY,
      });
    }

    function handleMouseMove(event: MouseEvent) {
      setPreview((current) =>
        current
          ? {
              ...current,
              x: event.clientX,
              y: event.clientY,
            }
          : current,
      );
    }

    function handleMouseOut(event: MouseEvent) {
      const image = getTarget(event);
      if (!image) return;

      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && image.contains(nextTarget)) return;
      setPreview(null);
    }

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  if (!preview) return null;

  const leftSide = preview.x > window.innerWidth / 2;
  const topSide = preview.y > window.innerHeight / 2;

  return (
    <div
      className="image-hover-preview"
      style={{
        left: leftSide ? "auto" : preview.x + 18,
        right: leftSide ? window.innerWidth - preview.x + 18 : "auto",
        top: topSide ? "auto" : preview.y + 18,
        bottom: topSide ? window.innerHeight - preview.y + 18 : "auto",
      }}
    >
      <img src={preview.src} alt={preview.alt} />
    </div>
  );
}
