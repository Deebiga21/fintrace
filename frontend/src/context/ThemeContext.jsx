import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

/**
 * The product ships exactly one surface: editorial dark.
 *
 * There is no light variant to return to, so this provider no longer flips
 * classes. It stays in place because the graph canvas and the landing page
 * still read `isDark` to pick their colours, and because `index.html` already
 * sets `class="dark"` on <html> before first paint (no flash).
 */
export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    // Drop the legacy preference so a previously stored 'light' value cannot
    // resurrect the old palette on a later visit.
    localStorage.removeItem('fintech_theme');
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme: 'dark', isDark: true, setTheme: () => {}, toggleTheme: () => {} }}
    >
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
