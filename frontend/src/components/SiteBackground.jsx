import React from 'react';
import DitherReveal from './DitherReveal';

export default function SiteBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ background: '#000000' }}
      aria-hidden="true"
    >
      {/* 
        Rotated Dither Reveal Canvas:
        Angles the Creation of Adam hand diagonally from bottom-left ('left down corner') 
        towards the top-right ('right up corner').
        Uses 150vw / 150vh with -24deg rotation centered to fill viewport without clipping.
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
            opacity: 0.38,
            mixBlendMode: 'screen',
            filter: 'contrast(125%) brightness(108%)',
          }}
        />
      </div>

      {/* Cybernetic Radial Vignette ensuring pure #000000 border containment for HUD panels */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.45) 60%, #000000 95%)',
        }}
      />
    </div>
  );
}
