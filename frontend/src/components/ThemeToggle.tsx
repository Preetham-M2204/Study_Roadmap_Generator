import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * ThemeToggle.tsx - Dark Mode Toggle Button
 * 
 * Switches between light and dark themes
 * Persists theme preference in localStorage
 * Default to dark mode for the futuristic experience
 */

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(true); // Default to dark

  // Load theme from localStorage on mount (default to dark)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to dark mode if no preference saved
    const theme = savedTheme || (prefersDark ? 'dark' : 'dark');
    setIsDark(theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button 
      onClick={toggleTheme}
      className="theme-toggle"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        color: isDark ? 'var(--neon-primary)' : 'var(--neon-secondary)',
        backdropFilter: 'blur(8px)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--neon-primary)';
        e.currentTarget.style.boxShadow = 'var(--shadow-neon-subtle)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--glass-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
