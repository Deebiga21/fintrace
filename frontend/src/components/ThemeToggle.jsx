import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '', showLabel = true, size = 'md' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
      className={`group relative inline-flex items-center gap-2 rounded-full p-1 transition-all duration-200 border ${
        isDark
          ? 'bg-[#15161D] border-[rgba(255,255,255,0.14)] text-[#9CA3AF] hover:border-[#1FC8DB]/50 hover:text-[#FFFFFF]'
          : 'bg-[#0B0B0F] border-[rgba(255,255,255,0.12)] text-[#6B7280] hover:border-[#1FC8DB]/50 hover:text-[#0B0B0F]'
      } ${className}`}
    >
      {/* Sliding indicator */}
      <div
        className={`flex items-center justify-center rounded-full transition-transform duration-300 ${
          size === 'sm' ? 'w-6 h-6' : 'w-7 h-7'
        } ${
          isDark
            ? 'bg-[#1FC8DB] text-[#0B0B0F] shadow-[0_0_12px_rgba(31,200,219,0.5)] translate-x-0'
            : 'bg-[#FFD23F] text-[#0B0B0F] shadow-[0_0_12px_rgba(255,210,63,0.4)] translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} stroke-[2.2]`} />
        ) : (
          <Sun className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} stroke-[2.2]`} />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold pr-2.5 font-mono select-none">
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      )}
    </button>
  );
}
