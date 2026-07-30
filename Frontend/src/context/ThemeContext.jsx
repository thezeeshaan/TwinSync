import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Check localStorage for saved theme, default to 'dark'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('twinsync-theme');
    return savedTheme ? savedTheme : 'dark';
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('twinsync-theme', theme);
    
    // Apply dataset attribute to body for CSS overriding
    document.body.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
