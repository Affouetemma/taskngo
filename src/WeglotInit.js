import { useEffect } from 'react';

const WeglotInit = () => {
  useEffect(() => {
    window.Weglot.initialize({
      api_key: process.env.REACT_APP_WEGLOT_API_KEY,
      languages: [
        {
          from: 'en',
          to: ['fr']
        }
      ]
    });
  }, []);

  return null;
};

export default WeglotInit;