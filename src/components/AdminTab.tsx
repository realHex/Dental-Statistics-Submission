import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { DentalStatistics, UserProfile } from '../types';
import ExcelDownloadPopup from './ExcelDownloadPopup';

interface AdminTabProps {
  user: User | null;
}

interface MonthlyData {
  [day: number]: DentalStatistics;
}

const AdminTab: React.FC<AdminTabProps> = ({ user }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showExcelPopup, setShowExcelPopup] = useState(false);

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

  // Fetch all users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch data for selected user and month
  useEffect(() => {
    if (selectedUserId) {
      fetchUserData();
    }
  }, [selectedUserId, selectedMonth]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name')
        .order('name');

      if (error) throw error;

      setUsers(data || []);
      
      if (data && data.length > 0) {
        setSelectedUserId(data[0].id);
        setSelectedUserName(data[0].name);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchUserData = async () => {
    if (!selectedUserId) return;
    
    setIsLoadingData(true);
    setError(null);
    
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      
      // Calculate end date (last day of the month)
      const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
      const nextMonthYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
      const endDate = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('dental_statistics')
        .select('*')
        .eq('user_id', selectedUserId)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date');

      if (error) throw error;

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
      console.error('Error fetching user data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    setSelectedUserId(userId);
    
    // Update selected user name
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUserName(user.name);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
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

  // Generate array of days for table headers
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="admin-tab">
      <h2>Admin Dashboard</h2>
      <p className="admin-description">View statistics for all users</p>
      
      <div className="admin-controls">
        <div className="user-selector-container">
          <label htmlFor="user-select">User:</label>
          <select 
            id="user-select"
            value={selectedUserId}
            onChange={handleUserChange}
            disabled={isLoadingUsers || isLoadingData}
          >
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
        
        <div className="month-selector">
          <label htmlFor="admin-month">Month:</label>
          <input
            type="month"
            id="admin-month"
            value={selectedMonth}
            onChange={handleMonthChange}
            disabled={isLoadingData}
          />
        </div>
        
        <button 
          className="excel-download-btn" 
          onClick={() => setShowExcelPopup(true)}
          disabled={isLoadingUsers || isLoadingData}
        >
          Download Excel
        </button>
      </div>

      {isLoadingUsers ? (
        <div className="loading">Loading users...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : isLoadingData ? (
        <div className="loading">Loading data...</div>
      ) : (
        <div className="table-container">
          <h3 className="selected-user-title">
            Data for: <span className="selected-user-name">{selectedUserName}</span>
          </h3>
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

      {showExcelPopup && (
        <ExcelDownloadPopup onClose={() => setShowExcelPopup(false)} />
      )}
    </div>
  );
};

export default AdminTab;
