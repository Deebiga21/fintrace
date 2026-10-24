import React from 'react';
import DitherReveal from './DitherReveal';
import { useTheme } from '../context/ThemeContext';

export default function SiteBackground() {
  const { isDark } = useTheme();

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-200"
      style={{ background: 'var(--bg-app)' }}
      aria-hidden="true"
    >
      {/* 
        Rotated Dither Reveal Canvas:
        Angles the Creation of Adam hand diagonally from bottom-left
        towards the top-right.
      */}
      <div
        className="absolute w-[150vw] h-[150vh] -top-[25vh] -left-[25vw] flex items-center justify-center pointer-events-none select-none"
        style={{
          transform: 'rotate(-24deg)',
          transformOrigin: '50% 50%',
        }}
      >
        <DitherReveal
          image="/creation_of_adam_hand.png"
          ditherStyle="lines"
          dotSize={4}
          revealRadius={150}
          revealSoftness={55}
          wave={true}
          waveSpeed={38}
          waveDensity={22}
          fit="cover"
          style={{
            opacity: isDark ? 0.22 : 0.08,
            mixBlendMode: isDark ? 'screen' : 'multiply',
            filter: isDark ? 'contrast(125%) brightness(108%)' : 'contrast(115%) brightness(100%)',
          }}
        />
      </div>

      {/* Radial Vignette ensuring smooth background border containment */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 50%, rgba(11, 11, 15, 0) 0%, rgba(11, 11, 15, 0.5) 60%, var(--bg-app) 95%)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0) 0%, rgba(245, 247, 250, 0.4) 60%, var(--bg-app) 95%)',
        }}
      />
    </div>
  );
}
