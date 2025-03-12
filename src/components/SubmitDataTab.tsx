import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DentalStatistics } from '../types';
import { User } from '@supabase/supabase-js';
import SuccessPopup from './SuccessPopup';
import { excelService } from '../services/excelService';

interface SubmitDataTabProps {
  user: User | null;
}

const SubmitDataTab: React.FC<SubmitDataTabProps> = ({ user }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [userName, setUserName] = useState<string>("");
  
  // Initial state for form fields
  const initialFormState = {
    extractions: 0,
    oro_facial_pain_relief: 0,
    dento_alveolar_trauma: 0,
    soft_tissue_injuries: 0,
    post_op_infections_bleeding: 0,
    tf: 0,
    gic: 0,
    composite: 0,
    scaling: 0,
    opmd: 0,
    minor_oral_surgery: 0,
    referrals: 0,
    others: 0,
    total_attendance: 0,
    pregnant_mothers: 0,
    age_under_3: 0,
    age_13_19: 0,
    inward_patients: 0,
  };

  const [formData, setFormData] = useState<Omit<DentalStatistics, 'id' | 'user_id' | 'date' | 'created_at'>>(initialFormState);

  useEffect(() => {
    if (user) {
      // Check if there is already data for the selected date
      fetchExistingData();
      fetchUserName();
    }
  }, [user, date]);

  const fetchExistingData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dental_statistics')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no record exists

      if (error) {
        console.error('Error fetching data:', error);
        setFormData(initialFormState);
        return;
      }
      
      if (!data) {
        console.log('No existing data for this date');
        setFormData(initialFormState);
        return;
      }

      console.log('Found existing data:', data);
      // Load existing data into form
      const {
        id,
        user_id,
        date: _date,
        created_at,
        ...statistics
      } = data;
      setFormData(statistics);
    } catch (err) {
      console.error('Unexpected error during data fetch:', err);
      setFormData(initialFormState);
    }
  };

  const fetchUserName = async () => {
    if (!user) return;

    // First try to get the name from auth metadata
    const userName = user.user_metadata?.full_name;
    if (userName) {
      setUserName(userName);
      return;
    }

    // If not in metadata, try from the profiles table
    const { data, error } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setUserName(data.name);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseInt(value) || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Check if a record already exists for this date
      const { data: existingRecord, error: findError } = await supabase
        .from('dental_statistics')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle(); // Use maybeSingle() instead of single()
        
      if (findError) {
        console.error('Error checking for existing record:', findError);
        throw findError;
      }

      let result;
      let savedData: DentalStatistics | null = null;
      
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('dental_statistics')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id)
          .select();
          
        if (result.data && result.data.length > 0) {
          savedData = result.data[0] as DentalStatistics;
        }
      } else {
        // Create new record
        result = await supabase
          .from('dental_statistics')
          .insert([
            {
              user_id: user.id,
              date,
              ...formData,
            },
          ])
          .select();
          
        if (result.data && result.data.length > 0) {
          savedData = result.data[0] as DentalStatistics;
        }
      }

      if (result.error) {
        throw result.error;
      }

      // Update Excel file after successful database update
      if (savedData) {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1; // JavaScript months are 0-indexed
        
        try {
          await excelService.generateMonthlyExcel(
            year,
            month,
            user.id,
            userName || 'Unknown User',
            savedData
          );
        } catch (excelError) {
          console.error('Error updating Excel file:', excelError);
          // Don't throw here as the database update succeeded
        }
      }

      const successMsg = existingRecord ? 'Statistics updated successfully!' : 'Statistics submitted successfully!';
      setMessage({
        text: successMsg,
        type: 'success',
      });
      
      // Show success popup
      setSuccessMessage(successMsg);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000); // Hide after 3 seconds
      
    } catch (error: any) {
      console.error('Error submitting data:', error);
      setMessage({
        text: `Error: ${error.message || 'Failed to submit data'}`,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
  };

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

  return (
    <div>
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="statistics-form">
        <div className="form-header">
          <div className="date-picker">
            <label htmlFor="date">Select Date:</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-fields">
          {formFields.map(field => (
            <div className="form-group" key={field.id}>
              <label htmlFor={field.id}>{field.label}</label>
              <input
                type="number"
                id={field.id}
                name={field.id}
                value={formData[field.id as keyof typeof formData]}
                onChange={handleInputChange}
                min="0"
              />
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-btn" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          <button 
            type="button" 
            className="reset-btn" 
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </form>

      {showSuccessPopup && (
        <SuccessPopup message={successMessage} onClose={() => setShowSuccessPopup(false)} />
      )}
    </div>
  );
};

export default SubmitDataTab;
