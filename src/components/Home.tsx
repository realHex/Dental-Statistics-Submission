import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import SubmitDataTab from './SubmitDataTab';
import PastDataTab from './PastDataTab';
import AdminTab from './AdminTab';

const Home = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [activeTab, setActiveTab] = useState<'submit' | 'past' | 'admin'>('submit');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      // Fetch user's name and role
      fetchUserNameAndRole();
    }
  }, [user, navigate]);

  const fetchUserNameAndRole = async () => {
    if (!user) return;

    // First try to get the name from auth metadata
    const userName = user.user_metadata?.full_name;
    if (userName) {
      setUserName(userName);
    }

    // Fetch user profile to get role
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      // Set name if not already set from metadata
      if (!userName && data?.name) {
        setUserName(data.name);
      }
      
      // Set user role
      if (data?.role) {
        setUserRole(data.role as UserRole);
      }
    } catch (err) {
      console.error('Error in fetchUserNameAndRole:', err);
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
          {userRole === 'admin' && <p className="admin-badge">Administrator</p>}
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
        
        {/* Show Admin tab only for admin users */}
        {userRole === 'admin' && (
          <button 
            className={`tab-btn admin-tab-btn ${activeTab === 'admin' ? 'active' : ''}`} 
            onClick={() => setActiveTab('admin')}
          >
            Admin
          </button>
        )}
      </div>

      <div className="tab-content">
        {activeTab === 'submit' ? (
          <SubmitDataTab user={user} />
        ) : activeTab === 'past' ? (
          <PastDataTab user={user} />
        ) : (
          <AdminTab user={user} />
        )}
      </div>
    </div>
  );
};

export default Home;
