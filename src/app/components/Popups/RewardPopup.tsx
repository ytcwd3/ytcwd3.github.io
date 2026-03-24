interface RewardPopupProps {
  onClose: () => void;
  onOpenQrModal: (src: string, title: string) => void;
}

export default function RewardPopup({
  onClose,
  onOpenQrModal,
}: RewardPopupProps) {
  return (
    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">打赏捐赠</h3>
      <div className="popup-text">
        <p style={{ textAlign: "center", marginBottom: 0 }}>感谢您的支持！</p>
        <div className="reward-qrcode">
          <div className="qrcode-item">
            <img
              className="reward-qrcode-img"
              src="https://pic1.zhimg.com/100/v2-4cdf5265a1d612f1acb8cd9e6baa6c26_r.jpg"
              alt="微信"
              width={180}
              onClick={() =>
                onOpenQrModal(
                  "https://pic1.zhimg.com/100/v2-4cdf5265a1d612f1acb8cd9e6baa6c26_r.jpg",
                  "微信",
                )
              }
            />
          </div>
          <div className="qrcode-item">
            <img
              className="reward-qrcode-img"
              src="https://pic3.zhimg.com/100/v2-10e23bad10b7782f15bfa7bac9b8079e_r.jpg"
              alt="支付宝"
              width={180}
              onClick={() =>
                onOpenQrModal(
                  "https://pic3.zhimg.com/100/v2-10e23bad10b7782f15bfa7bac9b8079e_r.jpg",
                  "支付宝",
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
