import React, { useState } from 'react';
import { excelService } from '../services/excelService';

interface ExcelDownloadPopupProps {
  onClose: () => void;
}

const ExcelDownloadPopup: React.FC<ExcelDownloadPopupProps> = ({ onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      await excelService.downloadMonthlyExcel(year, month);
      onClose();
    } catch (err: any) {
      console.error('Error downloading Excel file:', err);
      // Use the specific message from our service, or a fallback
      setError(err.message || 'No excel sheet exists for the month selected.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup excel-download-popup">
        <h3>Download Monthly Excel Report</h3>
        
        <div className="popup-content">
          <div className="form-group">
            <label htmlFor="excel-month">Select Month:</label>
            <input
              type="month"
              id="excel-month"
              value={selectedMonth}
              onChange={handleMonthChange}
              disabled={isDownloading}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </div>
        
        <div className="popup-actions">
          <button 
            className="download-btn" 
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download Excel'}
          </button>
          <button className="cancel-btn" onClick={onClose} disabled={isDownloading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelDownloadPopup;
