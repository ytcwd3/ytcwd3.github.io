import PopupLinkList from "./PopupLinkList";

interface EmulatorPopupProps {
  onClose: () => void;
}

const emulatorLinks = [
  {
    id: 1,
    type: "tool" as const,
    name: "模拟器大全",
    url: "https://pan.quark.cn/s/37749fb7d441 https://pan.baidu.com/s/1sXOTOkot8gR78h4Aj7NCDg?pwd=aty3/ https://pan.xunlei.com/s/VOWZBcb3fFbdEb52GbNxkpFFA1?pwd=kjcq#/",
  },
  {
    id: 2,
    type: "tool" as const,
    name: "RetroArch.v1.21.0",
    url: "https://pan.quark.cn/s/31337e2949a0/",
  },
];

export default function EmulatorPopup({ onClose }: EmulatorPopupProps) {
  return (
    <div
      className="popup-content link-popup-content emulator-popup-content"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">模拟器大全</h3>
      <div className="popup-text">
        <p className="emulator-popup-note">
          这里的模拟器会较长时间不更新，优先使用对应平台标签下的模拟器词条链接，更新更快。
        </p>
        <PopupLinkList links={emulatorLinks} />
      </div>
    </div>
  );
}
