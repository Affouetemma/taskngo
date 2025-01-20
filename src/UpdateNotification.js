import React, { useState, useEffect } from 'react';
import { FaInfo } from 'react-icons/fa';

const UpdateNotification = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    console.log('UpdateNotification mounted');
    // Force showUpdateBanner to true for testing
    setShowUpdateBanner(true);
  }, []);

  const handleInfoClick = () => {
    console.log('Info icon clicked');
    console.log('Previous showNotification state:', showNotification);
    setShowNotification(prev => {
      console.log('Setting showNotification to:', !prev);
      return !prev;
    });
  };

  const handleUpdate = () => {
    console.log('Update button clicked');
    window.location.reload();
  };

  console.log('Rendering with states:', { showNotification, showUpdateBanner });

  return (
    <div style={{
      position: 'relative',
      marginLeft: 'auto',
      width: '40px',
      height: '40px',
      border: '2px solid orange',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <button
        onClick={handleInfoClick}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <FaInfo size={24} color="#666" />
      </button>
      {showNotification && (
        <div style={{
          position: 'absolute',
          right: '0',
          top: '100%',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000,
          width: '200px',
          marginTop: '10px'
        }}>
          <p>A new version is available!</p>
          <button 
            onClick={handleUpdate}
            style={{
              backgroundColor: 'white',
              color: '#4CAF50',
              padding: '8px 16px',
              borderRadius: '4px',
              width: '100%',
              marginTop: '10px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Update Now
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateNotification;