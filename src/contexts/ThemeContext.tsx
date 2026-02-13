import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme | ((prevTheme: Theme) => Theme)) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    const initialTheme =
      savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'light';

    // Apply theme immediately to avoid flash before first paint
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    }

    return initialTheme;
  });
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [isDark, theme]);

  const handleSetTheme = (next: Theme | ((prevTheme: Theme) => Theme)) => {
    setTheme((prev) => (typeof next === 'function' ? next(prev) : next));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
