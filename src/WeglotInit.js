import { useEffect } from 'react';
import { fetchAverageRating } from './firebase.js';

const WeglotInit = () => {
  useEffect(() => {
    if (!window.Weglot) {
      console.error('Weglot is not available on the window object.');
      return;
    }

    try {
      // Initialize Weglot
      window.Weglot.initialize({
        api_key: process.env.REACT_APP_WEGLOT_API_KEY || '',
        languages: [
          {
            from: 'en',
            to: ['fr'],
          },
        ],
        onLanguageChanged: async (newLang) => {
          console.log('Language changed to:', newLang);

          try {
            const rating = await fetchAverageRating(newLang);
            console.log('New rating:', rating);

            // Dispatch custom event
            window.dispatchEvent(
              new CustomEvent('weglotLanguageChanged', {
                detail: { language: newLang, rating },
              })
            );
          } catch (error) {
            console.error('Error fetching average rating:', error);
          }
        },
      });

      console.log('Weglot initialized successfully.');
    } catch (error) {
      console.error('Error initializing Weglot:', error);
    }

    // Cleanup function
    return () => {
      try {
        // Remove Weglot-related listeners or reset any manually added elements
        const weglotListeners = window.Weglot?._eventListeners || {};
        Object.keys(weglotListeners).forEach((eventName) => {
          document.removeEventListener(eventName, weglotListeners[eventName]);
        });

        console.log('Weglot listeners cleaned up.');
      } catch (error) {
        console.error('Error during Weglot cleanup:', error);
      }
    };
  }, []);

  return null;
};

export default WeglotInit;
