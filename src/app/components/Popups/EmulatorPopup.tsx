interface EmulatorPopupProps {
  onClose: () => void;
}

export default function EmulatorPopup({ onClose }: EmulatorPopupProps) {
  return (
    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">模拟器大全</h3>
      <div className="popup-text">
        <p>1. 夸克：https://pan.quark.cn/s/03d883257f8f/</p>
        <p>
          2. 百度：https://pan.baidu.com/s/1sXOTOkot8gR78h4Aj7NCDg?pwd=aty3/
        </p>
        <p>
          3.
          迅雷：https://pan.xunlei.com/s/VOWZBcb3fFbdEb52GbNxkpFFA1?pwd=kjcq#/
        </p>
        <p>4. RetroArch.v1.21.0：https://pan.quark.cn/s/31337e2949a0/</p>
      </div>
    </div>
  );
}
