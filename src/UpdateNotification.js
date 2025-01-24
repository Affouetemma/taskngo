import React, { useState, useEffect } from 'react';
import { FaInfo } from 'react-icons/fa';

const UpdateNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en'); // Default language set to English

  useEffect(() => {
    console.log('UpdateNotification mounted');

    const initializeWeglot = () => {
      // Check if Weglot is available
      if (window.Weglot) {
        // Set the current language from Weglot
        setCurrentLanguage(window.Weglot.getCurrentLang() || 'en');

        // Attach event listener for language change
        window.Weglot.on('languageChanged', (newLang) => {
          console.log('Language changed:', newLang);
          setCurrentLanguage(newLang);  // Set new language when Weglot changes it
        });
      } else {
        console.error('Weglot is not initialized yet.');
      }
    };

    // Initialize Weglot after a small delay to allow it to load
    const timeoutId = setTimeout(initializeWeglot, 1000);

    return () => {
      // Clean up the event listener when component unmounts
      clearTimeout(timeoutId);
      if (window.Weglot) {
        window.Weglot.off('languageChanged');
      }
    };
  }, []); // Only run this effect once when component mounts

  const handleInfoClick = () => {
    console.log('Info icon clicked');
    setShowNotification(prev => !prev);  // Toggle notification
  };

  const handleUpdate = () => {
    console.log('Update button clicked');
    window.location.reload();  // Reload to apply the update
  };

  const getNotificationText = () => {
    if (currentLanguage === 'fr') {
      return {
        message: 'Une nouvelle version est disponible !',
        buttonText: 'Mettre à jour maintenant'
      };
    } else {
      return {
        message: 'A new version is available!',
        buttonText: 'Update Now'
      };
    }
  };

  const { message, buttonText } = getNotificationText();

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
          marginTop: '10px',
          textAlign: 'center' // Centers the text
        }}>
          <p>{message}</p>
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
              cursor: 'pointer',
              textAlign: 'center' // Centers button text
            }}
          >
            {buttonText}
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateNotification;
