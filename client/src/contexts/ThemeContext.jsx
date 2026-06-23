import { createContext, useContext, useState, useEffect } from 'react';
import { getTodaysTeamTheme } from '../themes/todaysTeamTheme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const todaysTheme = getTodaysTeamTheme();
    setTheme(todaysTheme);

    document.documentElement.style.setProperty('--theme-primary', todaysTheme.primary);
    document.documentElement.style.setProperty('--theme-secondary', todaysTheme.secondary);
  }, []);

  return (
    <ThemeContext.Provider value={null}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}