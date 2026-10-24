import { useEffect, useState } from 'react';

function DedsecMark() {
  return (
    <svg viewBox="0 0 240 240" className="dedsec-mark-svg" aria-hidden="true">
      <path className="dedsec-skull" d="m48 66 22-25 26 12 12-9 12 9 26-12 22 25-11 26 12 18-8 24-13 9-5 29-20-11-15 11-15-11-20 11-5-29-13-9-8-24 12-18z" />
      <path d="M79 99h31v23H79zm51 0h31v23h-31zM108 122l-8 18h18m13-18 8 18h-18m-19 24h36m-29 0v10m11-10v10m11-10v10" />
      <path d="m70 76-20-8m120 8 20-8M95 52l-4-17m54 17 4-17M58 151l-17 8m141-8 17 8" />
      <circle cx="94" cy="110" r="3" className="dedsec-eye" />
      <circle cx="146" cy="110" r="3" className="dedsec-eye" />
    </svg>
  );
}

export default function DedsecBackground() {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    let timeout;
    const triggerGlitch = () => {
      setGlitch(true);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setGlitch(false), 520);
    };

    window.addEventListener('dedsec:glitch', triggerGlitch);
    return () => {
      window.removeEventListener('dedsec:glitch', triggerGlitch);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={`dedsec-backdrop${glitch ? ' dedsec-backdrop--glitch' : ''}`} aria-hidden="true">
      <svg className="dedsec-network" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <g className="dedsec-network-lines">
          <path d="M72 190 250 110 392 220 570 130 735 235 924 120 1115 215 1360 115" />
          <path d="M72 190 160 410 392 220 480 500 735 235 820 480 1115 215 1240 465 1360 115" />
          <path d="M160 410 330 690 480 500 650 760 820 480 1000 720 1240 465 1360 700" />
          <path d="M330 690 520 835 650 760 845 850 1000 720 1185 840 1360 700" />
        </g>
        <g className="dedsec-network-packets">
          <path d="M72 190 250 110 392 220 570 130 735 235 924 120 1115 215 1360 115" />
          <path d="M160 410 392 220 480 500 735 235 820 480 1115 215 1240 465 1360 115" />
          <path d="M330 690 480 500 650 760 820 480 1000 720 1240 465 1360 700" />
        </g>
        <g className="dedsec-network-nodes">
          {[ [72,190], [250,110], [392,220], [570,130], [735,235], [924,120], [1115,215], [1360,115], [160,410], [480,500], [820,480], [1240,465], [330,690], [650,760], [1000,720], [1360,700] ].map(([cx, cy], index) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={index % 4 === 0 ? 3 : 2} style={{ '--node-delay': `${(index % 7) * -0.45}s` }} />
          ))}
        </g>
      </svg>

      <div className="dedsec-mark" aria-hidden="true">
        <div className="dedsec-mark-layer dedsec-mark-layer--base"><DedsecMark /></div>
        <div className="dedsec-mark-layer dedsec-mark-layer--cyan"><DedsecMark /></div>
        <div className="dedsec-mark-layer dedsec-mark-layer--red"><DedsecMark /></div>
        <span className="dedsec-wordmark">DEDSEC</span>
        <span className="dedsec-coordinates">SAN FRANCISCO // ctOS NETWORK</span>
      </div>
      <div className="dedsec-scan-band" />
      <div className="dedsec-vignette" />
    </div>
  );
}
