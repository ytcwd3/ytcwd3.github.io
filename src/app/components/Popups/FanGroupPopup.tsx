interface FanGroupPopupProps {
  onClose: () => void;
}

const QQ_GROUP = "745804936";
const QQ_GROUP_LINK = `mqqapi://card/show_pslcard?src_type=internal&version=1&uin=${QQ_GROUP}&card_type=group&source=qrcode`;

export default function FanGroupPopup({ onClose }: FanGroupPopupProps) {
  function copyGroupNumber() {
    navigator.clipboard
      ?.writeText(QQ_GROUP)
      .then(() => alert("QQ群号已复制"))
      .catch(() => alert(`QQ群号：${QQ_GROUP}`));
  }

  return (
    <div className="popup-content fan-group-popup" onClick={(e) => e.stopPropagation()}>
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">粉丝交流群</h3>
      <div className="fan-group-panel">
        <div className="fan-group-badge">QQ Group</div>
        <div className="fan-group-number">{QQ_GROUP}</div>
        <p className="fan-group-copy">
          进潜水群后，想聊天可以私信群主申请进入主群。
        </p>
        <div className="fan-group-actions">
          <a className="fan-group-primary" href={QQ_GROUP_LINK}>
            打开 QQ 加群
          </a>
          <button className="fan-group-secondary" type="button" onClick={copyGroupNumber}>
            复制群号
          </button>
        </div>
        <p className="fan-group-hint">
          如果浏览器没有唤起 QQ，请复制群号后在 QQ 内搜索添加。
        </p>
      </div>
    </div>
  );
}
