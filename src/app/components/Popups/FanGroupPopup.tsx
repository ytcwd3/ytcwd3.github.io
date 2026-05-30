interface FanGroupPopupProps {
  onClose: () => void;
}

export default function FanGroupPopup({ onClose }: FanGroupPopupProps) {
  return (
    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">粉丝交流群</h3>
      <div className="popup-text">
        <p>QQ群：745804936 进潜水群后，想聊天私信群主申请进入主群即可</p>
      </div>
    </div>
  );
}
