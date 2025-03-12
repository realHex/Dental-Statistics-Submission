import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DentalStatistics } from '../types';

const Home = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [userName, setUserName] = useState<string>("");
  
  // Initial state for form fields
  const [formData, setFormData] = useState<Omit<DentalStatistics, 'id' | 'user_id' | 'date' | 'created_at'>>({
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
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      // Fetch user's name
      fetchUserName();
      // Check if there is already data for the selected date
      fetchExistingData();
    }
  }, [user, navigate, date]);

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

  const fetchExistingData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('dental_statistics')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (error) {
      console.log('No existing data for this date');
      // Reset form data if no record exists
      setFormData({
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
      });
    } else {
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
      const { data: existingRecord } = await supabase
        .from('dental_statistics')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .single();

      let result;
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('dental_statistics')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id);
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
          ]);
      }

      if (result.error) {
        throw result.error;
      }

      setMessage({
        text: existingRecord ? 'Statistics updated successfully!' : 'Statistics submitted successfully!',
        type: 'success',
      });
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

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
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
    <div className="home-container">
      <div className="header">
        <div>
          <h1>Dental Statistics Submission</h1>
          {userName && <p className="welcome-message">Welcome, {userName}!</p>}
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

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

        <button 
          type="submit" 
          className="submit-btn" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
};

export default Home;
