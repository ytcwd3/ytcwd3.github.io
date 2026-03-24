interface QrCodeModalProps {
  src: string;
  title: string;
  onClose: () => void;
}

export default function QrCodeModal({ src, title, onClose }: QrCodeModalProps) {
  return (
    <div className="qrcode-modal" style={{ display: "flex" }} onClick={onClose}>
      <div className="qrcode-modal-mask" />
      <div
        className="qrcode-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="qrcode-modal-close" onClick={onClose}>
          ×
        </button>
        <div className="qrcode-modal-title">{title}</div>
        <div className="qrcode-big-container">
          <img
            src={src}
            alt={title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
        </div>
        <p className="qrcode-modal-tip">点击二维码外区域关闭</p>
      </div>
    </div>
  );
}
