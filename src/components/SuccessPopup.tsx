import React, { useEffect } from 'react';

interface SuccessPopupProps {
  message: string;
  onClose: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ message, onClose }) => {
  useEffect(() => {
    // Automatically close the popup after 3 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    // Cleanup timer on unmount
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="popup-overlay">
      <div className="popup">
        <div className="popup-content">
          <div className="popup-icon">✓</div>
          <p>{message}</p>
        </div>
        <button className="close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default SuccessPopup;
