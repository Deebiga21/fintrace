import './ElectricLogo.css';

export default function ElectricLogo({
  src = '/logo.svg',
  color = '#ecc7ff',
  glowColor = '#000000',
  scale = 0.7,
  strands = 4,
  bend = 0.6,
  crackle = 1.5,
  arcs = 1,
  speed = 2.5,
  interactive = true,
  className = '',
}) {
  const strandCount = Math.max(1, Math.min(8, Math.round(strands)));
  const arcCount = Math.max(0, Math.min(4, Math.round(arcs)));
  const electricStyle = {
    '--electric-color': color,
    '--electric-glow': glowColor === '#000000' ? color : glowColor,
    '--electric-scale': scale,
    '--electric-bend': bend,
    '--electric-crackle': Math.min(3, Math.max(0, crackle)),
    '--electric-speed': `${Math.max(0.4, 4 / Math.max(0.4, speed))}s`,
  };

  return (
    <span
      className={`electric-logo ${interactive ? 'electric-logo--interactive' : ''} ${className}`.trim()}
      style={electricStyle}
      role="img"
      aria-label="FinTrace"
    >
      <span className="electric-logo__glow electric-logo__mask" style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }} />
      <span className="electric-logo__ink electric-logo__mask" style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }} />
      <svg className="electric-logo__arcs" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: strandCount }, (_, index) => {
          const y = 8 + index * (48 / Math.max(1, strandCount - 1));
          const offset = (index % 2 ? -1 : 1) * (8 + bend * 8);
          return (
            <path
              key={`strand-${index}`}
              className="electric-logo__strand"
              d={`M${4 + index * 3} ${y} C${70 + offset} ${y - 12}, ${140 - offset} ${y + 14}, ${218 + index * 2} ${y - 2}`}
              style={{ animationDelay: `${index * 90}ms` }}
            />
          );
        })}
        {Array.from({ length: arcCount }, (_, index) => (
          <path
            key={`arc-${index}`}
            className="electric-logo__arc"
            d={`M${35 + index * 72} ${54 - index * 4} Q${70 + index * 64} ${-8 + index * 5} ${110 + index * 60} ${49 - index * 3}`}
            style={{ animationDelay: `${index * 160}ms` }}
          />
        ))}
      </svg>
    </span>
  );
}
