import React, { useState, useEffect } from 'react';
import { FaInfo } from 'react-icons/fa';

const UpdateNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        const data = await response.json();
        setUpdateAvailable(data.version !== window.__APP_VERSION__);
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    checkVersion();
    
    if (window.Weglot) {
      setCurrentLanguage(window.Weglot.getCurrentLang() || 'en');
      window.Weglot.on('languageChanged', setCurrentLanguage);
    }

    return () => window.Weglot?.off('languageChanged');
  }, []);

  const getNotificationText = () => ({
    upToDate: currentLanguage === 'fr' ? 'Votre application est à jour' : 'Your app is up to date',
    updateAvailable: currentLanguage === 'fr' ? 'Une nouvelle version est disponible !' : 'A new version is available!',
    buttonText: currentLanguage === 'fr' ? 'Mettre à jour maintenant' : 'Update Now'
  });

  const { upToDate, updateAvailable: updateText, buttonText } = getNotificationText();

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
      <FaInfo 
        size={24} 
        color="#666" 
        style={{ cursor: 'pointer' }}
        onClick={() => setShowNotification(prev => !prev)}
      />
      
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
          textAlign: 'center'
        }}>
          <p>{updateAvailable ? updateText : upToDate}</p>
          {updateAvailable && (
            <button 
              onClick={() => window.location.reload()}
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
              {buttonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UpdateNotification;