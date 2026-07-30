import React from 'react';
import { Button, Icon } from 'semantic-ui-react';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from 'react-router-dom';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Hide the theme toggle on chat pages to avoid overlapping the input bar
  if (location.pathname.startsWith('/community/chat/') || location.pathname.startsWith('/counselor/chat/')) {
    return null;
  }

  return (
    <Button
      icon
      circular
      size="large"
      onClick={toggleTheme}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
        color: theme === 'dark' ? '#facc15' : '#475569'
      }}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </Button>
  );
}

export default ThemeToggle;
