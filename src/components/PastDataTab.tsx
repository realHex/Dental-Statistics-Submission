import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { DentalStatistics } from '../types';
import { excelService } from '../services/excelService';

interface PastDataTabProps {
  user: User | null;
}

interface MonthlyData {
  [day: number]: DentalStatistics;
}

const PastDataTab: React.FC<PastDataTabProps> = ({ user }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isExcelDownloading, setIsExcelDownloading] = useState<boolean>(false);

  const formFields = [
    { id: 'extractions', label: 'Extractions' },
    { id: 'oro_facial_pain_relief', label: 'Oro-Facial pain relief' },
    { id: 'dento_alveolar_trauma', label: 'Dento-alveolar trauma' },
    { id: 'soft_tissue_injuries', label: 'Soft tissue injuries' },
    { id: 'post_op_infections_bleeding', label: 'Post Op Infections/bleeding' },
    { id: 'tf', label: 'TF' },
    { id: 'gic', label: 'GIC' },
    { id: 'composite', label: 'Composite' },
    { id: 'scaling', label: 'Scaling' },
    { id: 'opmd', label: 'OPMD' },
    { id: 'minor_oral_surgery', label: 'Minor Oral Surgery' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'others', label: 'Others' },
    { id: 'total_attendance', label: 'Total attendance' },
    { id: 'pregnant_mothers', label: 'Pregnant Mothers' },
    { id: 'age_under_3', label: 'Age under 3' },
    { id: 'age_13_19', label: 'Age 13-19' },
    { id: 'inward_patients', label: 'Inward Patients' },
  ];

  useEffect(() => {
    if (user) {
      fetchMonthlyData();
    }
  }, [user, selectedMonth]);

  const fetchMonthlyData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    
    // Calculate end date (last day of the month)
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
    const nextMonthYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
    const endDate = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    try {
      const { data, error } = await supabase
        .from('dental_statistics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date');

      if (error) {
        throw error;
      }

      const dataByDay: MonthlyData = {};
      
      if (data) {
        data.forEach((record) => {
          // Extract day number from the date
          const day = parseInt(record.date.split('-')[2]);
          dataByDay[day] = record;
        });
      }
      
      setMonthlyData(dataByDay);
    } catch (err: any) {
      console.error('Error fetching monthly data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const calculateTotals = (fieldId: string): number => {
    let total = 0;
    Object.values(monthlyData).forEach((dayData) => {
      total += dayData[fieldId as keyof typeof dayData] as number || 0;
    });
    return total;
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const handleDownloadExcel = async () => {
    if (!selectedMonth || !user) return;
    
    setIsExcelDownloading(true);
    
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      await excelService.downloadMonthlyExcel(year, month);
    } catch (error) {
      console.error('Failed to download Excel file:', error);
      setError('Failed to download Excel file. Please try again later.');
    } finally {
      setIsExcelDownloading(false);
    }
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(year, month);
  
  // Generate array of days for table headers
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="past-data">
      <div className="month-selector-container">
        <div className="month-selector">
          <label htmlFor="month-year">Select Month:</label>
          <input
            type="month"
            id="month-year"
            value={selectedMonth}
            onChange={handleMonthChange}
          />
        </div>
        <button 
          className="download-excel-btn" 
          onClick={handleDownloadExcel}
          disabled={isExcelDownloading}
        >
          {isExcelDownloading ? 'Downloading...' : 'Download Excel'}
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Loading data...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parameter</th>
                {days.map(day => (
                  <th key={day}>{day}</th>
                ))}
                <th className="total-column">Total</th>
              </tr>
            </thead>
            <tbody>
              {formFields.map(field => (
                <tr key={field.id}>
                  <td className="field-name">{field.label}</td>
                  {days.map(day => (
                    <td key={day}>
                      {monthlyData[day] ? 
                        monthlyData[day][field.id as keyof DentalStatistics] as number : 
                        '-'}
                    </td>
                  ))}
                  <td className="total-value">{calculateTotals(field.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PastDataTab;
