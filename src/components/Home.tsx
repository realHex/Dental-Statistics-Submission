import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DentalStatistics } from '../types';
import SubmitDataTab from './SubmitDataTab';
import PastDataTab from './PastDataTab';

const Home = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'submit' | 'past'>('submit');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      // Fetch user's name
      fetchUserName();
    }
  }, [user, navigate]);

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

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="home-container">
      <div className="header">
        <div>
          <h1>Monthly Return of Hospital - OPD Dental Clinic</h1>
          {userName && <p className="welcome-message">Welcome, {userName}!</p>}
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`} 
          onClick={() => setActiveTab('submit')}
        >
          Submit Data
        </button>
        <button 
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`} 
          onClick={() => setActiveTab('past')}
        >
          Monthly Data
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'submit' ? (
          <SubmitDataTab user={user} />
        ) : (
          <PastDataTab user={user} />
        )}
      </div>
    </div>
  );
};

export default Home;
