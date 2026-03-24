interface UpdateRecordPopupProps {
  onClose: () => void;
  hasData: boolean;
}

export default function UpdateRecordPopup({
  onClose,
  hasData,
}: UpdateRecordPopupProps) {
  return (
    <div
      className="popup-content update-record-popup"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">资源更新一览表</h3>
      <div className="popup-text">
        <div className="update-records-container">
          {hasData ? (
            <div className="update-record-date">📅 最新更新</div>
          ) : (
            <div className="update-record-empty">暂无更新记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
