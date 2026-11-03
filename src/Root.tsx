import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  random,
} from 'remotion';

const SCENES = [
  { start: 0, duration: 4, text: "What if the Earth suddenly stopped spinning for just five seconds?" },
  { start: 4, duration: 4, text: "At the equator, everything would fly east at sixteen hundred kilometers per hour." },
  { start: 8, duration: 4, text: "Oceans would merge into mile-high mega tsunamis, swallowing entire continents." },
  { start: 12, duration: 4, text: "And when Earth restarts, the crust would shatter into an apocalyptic wasteland." }
];

const W = 1080;
const H = 1920;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const Starfield: React.FC = () => {
  const frame = useCurrentFrame();
  const stars = Array.from({ length: 100 }, (_, i) => {
    const x = random(`star-x-${i}`) * W;
    const y = random(`star-y-${i}`) * H;
    const size = 1 + random(`star-size-${i}`) * 3;
    const drift = 0.4 + random(`star-drift-${i}`) * 1.8;
    const alpha = 0.2 + random(`star-alpha-${i}`) * 0.65;
    const twinkle = 0.7 + Math.sin(frame * 0.035 + i * 2.1) * 0.25;
    return (
      <circle
        key={i}
        cx={x}
        cy={(y + frame * drift) % H}
        r={size}
        fill={i % 8 === 0 ? '#8cecff' : '#d5eaff'}
        opacity={alpha * twinkle}
      />
    );
  });

  const motes = Array.from({ length: 32 }, (_, i) => {
    const x = random(`mote-x-${i}`) * W;
    const y = random(`mote-y-${i}`) * H;
    const drift = 0.8 + random(`mote-drift-${i}`) * 2;
    const size = 2 + random(`mote-size-${i}`) * 5;
    return (
      <circle
        key={`m-${i}`}
        cx={(x + Math.sin(frame * 0.018 + i) * 36) % W}
        cy={(y + frame * drift) % H}
        r={size}
        fill={i % 3 === 0 ? '#ff814d' : '#9db9ce'}
        opacity={0.12 + random(`mote-alpha-${i}`) * 0.24}
      />
    );
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 1 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {stars}
        {motes}
      </svg>
    </AbsoluteFill>
  );
};

const HudCorners: React.FC<{ color?: string }> = ({ color = '#69eaff' }) => (
  <svg
    width="100%"
    height="100%"
    viewBox={`0 0 ${W} ${H}`}
    style={{ position: 'absolute', inset: 0, opacity: 0.45 }}
  >
    <g fill="none" stroke={color} strokeWidth="3">
      <path d="M64 250V170h90M1016 250v-80h-90M64 1670v80h90M1016 1670v80h-90" />
      <path d="M64 330h30M64 350h18M1016 330h-30M1016 350h-18M64 1580h30M1016 1580h-30" />
    </g>
  </svg>
);

const CameraRig: React.FC<{
  children: React.ReactNode;
  sceneIndex: number;
}> = ({ children, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 90, mass: 0.8 },
  });
  const zoom = interpolate(entry, [0, 1], [1.14, 1]);
  const beat = sceneIndex === 0
    ? interpolate(frame, [110, 150, 240], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : sceneIndex === 1
      ? interpolate(frame, [8, 36, 220], [0, 1, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : sceneIndex === 2
        ? interpolate(frame, [20, 100, 230], [0.1, 1, 0.55], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        : interpolate(frame, [0, 28, 240], [0.3, 1, 0.7], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const intensity = sceneIndex === 0 ? 12 : sceneIndex === 1 ? 18 : sceneIndex === 2 ? 10 : 22;
  const shakeX = Math.sin(frame * 1.7) * intensity * beat;
  const shakeY = Math.cos(frame * 1.31) * intensity * beat * 0.72;
  const panX = sceneIndex === 1
    ? interpolate(frame, [0, 240], [18, -22], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : sceneIndex === 2
      ? interpolate(frame, [0, 240], [-12, 14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : 0;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `translate(${panX + shakeX}px, ${shakeY}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const EarthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rotation = interpolate(frame, [0, 144, 150, 240], [0, 260, 260, 260], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const alert = spring({ frame: Math.max(0, frame - 148), fps, config: { damping: 10, stiffness: 140 } });
  const ringOpacity = interpolate(frame, [0, 120, 145, 240], [0.55, 0.9, 0.2, 0.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shock = interpolate(frame, [145, 150, 224], [0.35, 1.4, 2.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 44%, rgba(15,52,92,0.48) 0%, rgba(5,10,25,0.15) 38%, transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 790,
          height: 790,
          left: 145,
          top: 425,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(51,197,255,0.2), rgba(17,92,190,0.08) 48%, transparent 70%)',
          filter: 'drop-shadow(0 0 48px rgba(53,194,255,.45))',
        }}
      />
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="ocean">
            <stop offset="0%" stopColor="#237cc3" />
            <stop offset="70%" stopColor="#0b3c77" />
            <stop offset="100%" stopColor="#07182f" />
          </radialGradient>
          <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8be0a6" />
            <stop offset="100%" stopColor="#247d76" />
          </linearGradient>
          <radialGradient id="atmosphere">
            <stop offset="76%" stopColor="rgba(58,195,255,0)" />
            <stop offset="88%" stopColor="rgba(67,202,255,0.08)" />
            <stop offset="96%" stopColor="rgba(80,216,255,0.65)" />
            <stop offset="100%" stopColor="rgba(31,116,255,0.08)" />
          </radialGradient>
          <clipPath id="earthClip">
            <circle cx="540" cy="845" r="306" />
          </clipPath>
        </defs>
        <ellipse
          cx="540"
          cy="845"
          rx="445"
          ry="150"
          fill="none"
          stroke="#54ddff"
          strokeWidth="4"
          opacity={ringOpacity}
          transform={`rotate(-18 540 845)`}
          style={{ filter: 'drop-shadow(0 0 12px #2ddcff)' }}
        />
        <ellipse
          cx="540"
          cy="845"
          rx="395"
          ry="110"
          fill="none"
          stroke="#9f75ff"
          strokeWidth="2"
          opacity={ringOpacity * 0.65}
          transform={`rotate(28 540 845)`}
        />
        <g style={{ transformOrigin: '540px 845px', transform: `rotate(${rotation}deg)` }}>
          <circle cx="540" cy="845" r="338" fill="url(#atmosphere)" />
          <circle
            cx="540"
            cy="845"
            r="306"
            fill="url(#ocean)"
            stroke="#6de7ff"
            strokeWidth="4"
            style={{ filter: 'drop-shadow(0 0 26px rgba(65,205,255,.7))' }}
          />
          <g clipPath="url(#earthClip)">
            <path
              d="M340 657l42-45 58-13 33 22 8 43-29 31 9 44-42 43-10 58-45 28-35-30 7-48-32-32 8-46-29-27zM508 785l52-31 59 11 25 40-22 33 15 39-26 61-41 10-22-47-36-10-24-44 17-29zM658 658l59-26 57 27 24 52-42 28-45-23-44 10-23-33zM685 931l54-15 40 40-21 48-45 3-37-33z"
              fill="url(#land)"
              stroke="#a8f5bd"
              strokeWidth="3"
              opacity="0.95"
            />
            <path d="M235 855c180-70 480-95 650-10" fill="none" stroke="#70d9ff" strokeWidth="2" opacity="0.22" />
            <path d="M275 930c140-42 395-48 530 1" fill="none" stroke="#70d9ff" strokeWidth="2" opacity="0.18" />
            <path d="M540 535c-45 110-42 505 0 620" fill="none" stroke="#70d9ff" strokeWidth="2" opacity="0.18" />
          </g>
          <path d="M250 844h580M540 540v610" stroke="#a7eaff" strokeWidth="1.5" opacity="0.17" />
        </g>
        <circle
          cx="540"
          cy="845"
          r={Math.max(0, shock * 250)}
          fill="none"
          stroke="#ff3b4f"
          strokeWidth="10"
          opacity={interpolate(frame, [145, 153, 214, 240], [0, 0.9, 0.35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          style={{ filter: 'drop-shadow(0 0 18px #ff243f)' }}
        />
        <path d="M150 1230h780M220 1260h640" stroke="#50dfff" strokeWidth="2" opacity="0.25" />
      </svg>
      <div style={{ position: 'absolute', top: 290, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ color: '#8beaff', fontSize: 24, letterSpacing: 9, fontWeight: 800 }}>PLANETARY ROTATION // LIVE</div>
        <div style={{ color: '#f4fbff', fontSize: 53, fontWeight: 900, letterSpacing: 4, marginTop: 18, textShadow: '0 0 22px rgba(68,209,255,.5)' }}>
          THE WORLD STOPS
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1290,
          left: 180,
          width: 720,
          padding: '26px 30px',
          boxSizing: 'border-box',
          border: '2px solid rgba(255,59,79,.8)',
          background: 'rgba(35,5,15,.78)',
          color: '#ff5b68',
          textAlign: 'center',
          fontSize: 31,
          fontWeight: 900,
          letterSpacing: 5,
          opacity: alert,
          transform: `scale(${0.85 + alert * 0.15})`,
          boxShadow: '0 0 30px rgba(255,30,55,.35), inset 0 0 24px rgba(255,30,55,.12)',
        }}
      >
        ⚠ ROTATION HALTED // 00:05
      </div>
      <HudCorners color="#60dfff" />
    </AbsoluteFill>
  );
};

const CityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const counter = interpolate(frame, [0, 182], [0, 1670], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const blast = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 18, stiffness: 65 } });
  const streaks = Array.from({ length: 24 }, (_, i) => {
    const y = 515 + i * 34;
    const x = ((frame * (18 + (i % 7) * 5) + i * 97) % 1300) - 150;
    return (
      <line
        key={i}
        x1={x}
        y1={y}
        x2={x + 110 + (i % 5) * 36}
        y2={y - 15 - (i % 4) * 8}
        stroke={i % 4 === 0 ? '#ffcd66' : '#77dcff'}
        strokeWidth={i % 3 === 0 ? 4 : 2}
        opacity={0.2 + blast * 0.55}
      />
    );
  });
  const debris = Array.from({ length: 34 }, (_, i) => {
    const vx = (random(`city-vx-${i}`) - 0.5) * 680;
    const vy = random(`city-vy-${i}`) * 460 - 180;
    const x = 540 + vx * (frame / 240);
    const y = 900 + vy * (frame / 240) + 0.5 * (frame / 60) ** 2 * 72;
    const size = 5 + random(`city-size-${i}`) * 18;
    return (
      <rect
        key={`d-${i}`}
        x={x}
        y={y}
        width={size}
        height={size * 0.7}
        fill={i % 3 === 0 ? '#ff9f55' : '#8499ac'}
        opacity={0.88 - (frame / 240) * 0.25}
        transform={`rotate(${frame * 5 + i * 26} ${x} ${y})`}
      />
    );
  });

  const buildings = [
    { x: 30, w: 112, h: 440 }, { x: 150, w: 135, h: 590 }, { x: 305, w: 104, h: 380 },
    { x: 427, w: 135, h: 680 }, { x: 585, w: 116, h: 490 }, { x: 718, w: 145, h: 620 },
    { x: 883, w: 160, h: 440 },
  ];

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0a1325 0%, #102642 52%, #090d17 100%)' }} />
      <div style={{ position: 'absolute', left: -100, right: -100, top: 470, height: 520, background: 'linear-gradient(90deg, transparent, rgba(79,194,255,.1), transparent)', transform: `translateX(${Math.sin(frame * 0.05) * 80}px)` }} />
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
        <g>{streaks}</g>
        <path d="M0 1290h1080v630H0z" fill="#070b12" />
        <path d="M0 1280h1080" stroke="#8cecff" strokeWidth="3" opacity=".6" />
        {buildings.map((b, i) => {
          const snap = interpolate(frame, [18 + i * 3, 75 + i * 4, 240], [0, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const shear = snap * (i % 2 === 0 ? -1 : 1) * (18 + (i % 3) * 8);
          const top = 1280 - b.h;
          return (
            <g key={i} transform={`translate(${shear * snap} ${snap * (i % 2 === 0 ? 12 : -18)}) rotate(${shear * 0.025} ${b.x + b.w / 2} ${top + b.h})`}>
              <path d={`M${b.x} ${top + 65}l${b.w * 0.18} -65h${b.w * 0.64}l${b.w * 0.18} 65v${b.h - 65}h-${b.w}z`} fill={i % 2 ? '#1b3047' : '#17273b'} stroke="#3a6683" strokeWidth="3" />
              <path d={`M${b.x + b.w * 0.18} ${top + 8}h${b.w * 0.64}v12h-${b.w * 0.64}z`} fill="#70ddf5" opacity=".75" />
              {Array.from({ length: Math.floor(b.h / 52) }, (_, row) =>
                Array.from({ length: Math.floor(b.w / 29) }, (_, col) => {
                  const lit = random(`window-${i}-${row}-${col}`) > 0.38;
                  return (
                    <rect
                      key={`${row}-${col}`}
                      x={b.x + 12 + col * 27}
                      y={top + 95 + row * 48}
                      width="10"
                      height="18"
                      fill={lit ? (row % 3 === 0 ? '#ffd27d' : '#64c8ea') : '#09111d'}
                      opacity={lit ? 0.76 : 0.7}
                    />
                  );
                }),
              )}
              {snap > 0.25 && (
                <path d={`M${b.x + b.w * .1} ${top + b.h * .43}l${b.w * .34} 16-18 27 ${b.w * .43} 11`} fill="none" stroke="#ffb65e" strokeWidth="5" opacity={snap} />
              )}
            </g>
          );
        })}
        <g>{debris}</g>
      </svg>
      <div style={{ position: 'absolute', top: 310, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ color: '#7feaff', fontSize: 24, fontWeight: 800, letterSpacing: 8 }}>INERTIA EVENT // EQUATOR</div>
        <div style={{ color: '#f4f8ff', fontSize: 48, fontWeight: 900, letterSpacing: 4, marginTop: 20 }}>EVERYTHING KEEPS MOVING</div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 60,
          top: 650,
          width: 350,
          padding: '22px 24px',
          color: '#ecfaff',
          border: '2px solid rgba(103,225,255,.8)',
          background: 'rgba(2,13,26,.82)',
          boxShadow: '0 0 30px rgba(68,210,255,.3)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 20, letterSpacing: 5, color: '#81eaff', fontWeight: 800 }}>GROUND SPEED</div>
        <div style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 18px #4bdcff' }}>
          {Math.round(counter).toLocaleString('en-US')}
        </div>
        <div style={{ fontSize: 24, color: '#ffb75e', fontWeight: 900, letterSpacing: 4 }}>KM/H</div>
        <div style={{ height: 8, background: '#152a3d', marginTop: 16 }}>
          <div style={{ width: `${(counter / 1670) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#4adfff,#ffb44d)', boxShadow: '0 0 14px #4adfff' }} />
        </div>
      </div>
      <HudCorners />
    </AbsoluteFill>
  );
};

const TsunamiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const waveX = interpolate(frame, [0, 240], [1150, -250], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const height = interpolate(frame, [0, 120, 240], [0, 110, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const foam = Array.from({ length: 54 }, (_, i) => {
    const x = ((random(`foam-x-${i}`) * 1000 + frame * (2 + random(`foam-d-${i}`) * 5)) % 1080);
    const y = 805 + random(`foam-y-${i}`) * 220 - height * 0.25;
    const r = 2 + random(`foam-r-${i}`) * 8;
    return <circle key={i} cx={x} cy={y} r={r} fill="#d7ffff" opacity={0.4 + random(`foam-o-${i}`) * 0.6} />;
  });
  const structures = [
    { x: 62, y: 1030, w: 130, h: 440 }, { x: 220, y: 860, w: 105, h: 610 },
    { x: 350, y: 980, w: 145, h: 490 }, { x: 527, y: 795, w: 116, h: 675 },
    { x: 678, y: 940, w: 126, h: 530 }, { x: 835, y: 850, w: 172, h: 620 },
  ];

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#081426 0%,#10324c 48%,#07121d 100%)' }} />
      <div style={{ position: 'absolute', inset: '48% 0 0', background: 'linear-gradient(180deg,rgba(15,98,140,.18),rgba(3,20,34,.9))' }} />
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
        <path d="M0 1470h1080v450H0z" fill="#080d14" />
        <path d="M0 1470h1080" stroke="#55dfff" strokeWidth="4" opacity=".5" />
        {structures.map((b, i) => (
          <g key={i}>
            <path d={`M${b.x} ${b.y}h${b.w}v${b.h}h-${b.w}z`} fill="#172b40" stroke="#5186a3" strokeWidth="3" />
            <path d={`M${b.x + b.w * .25} ${b.y}v-28h${b.w * .5}v28`} fill="#203c54" stroke="#5186a3" strokeWidth="3" />
            {Array.from({ length: Math.floor(b.h / 42) }, (_, row) =>
              Array.from({ length: Math.floor(b.w / 28) }, (_, col) => (
                <rect
                  key={`${row}-${col}`}
                  x={b.x + 11 + col * 25}
                  y={b.y + 22 + row * 37}
                  width="9"
                  height="14"
                  fill={random(`coastal-win-${i}-${row}-${col}`) > 0.45 ? '#ffd079' : '#16354a'}
                  opacity=".83"
                />
              )),
            )}
          </g>
        ))}
        <path d="M0 1470c120-32 180-22 278-5 150 26 247-31 384-16 135 15 255 46 418 9v462H0z" fill="#0b577b" opacity=".8" />
        <path
          d={`M${waveX - 1200} 1120 C${waveX - 820} ${850 - height}, ${waveX - 470} ${1050 - height}, ${waveX - 230} ${770 - height} C${waveX - 30} ${510 - height}, ${waveX + 90} ${625 - height}, ${waveX + 175} ${735 - height} C${waveX + 270} ${860 - height}, ${waveX + 330} 940, ${waveX + 520} 870 C${waveX + 720} 790, ${waveX + 910} 950, ${waveX + 1200} 900 L${waveX + 1200} 1470 L${waveX - 1200} 1470Z`}
          fill="url(#waveFill)"
          stroke="#80f6ff"
          strokeWidth="9"
          style={{ filter: 'drop-shadow(0 0 24px rgba(28,207,255,.72))' }}
        />
        <defs>
          <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9bffff" />
            <stop offset="15%" stopColor="#25c9ef" />
            <stop offset="50%" stopColor="#0878ad" />
            <stop offset="100%" stopColor="#053c69" />
          </linearGradient>
        </defs>
        <path
          d={`M${waveX - 150} 760 Q${waveX + 12} 665 ${waveX + 175} 735 Q${waveX + 52} 753 ${waveX - 56} 836 Q${waveX - 126} 820 ${waveX - 150} 760Z`}
          fill="#e8ffff"
          opacity=".92"
          style={{ filter: 'drop-shadow(0 0 15px #75efff)' }}
        />
        <g>{foam}</g>
        <path d="M0 1530c220-80 370 50 560-8s337-23 520 20" fill="none" stroke="#54dfff" strokeWidth="5" opacity=".58" />
      </svg>
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ color: '#8ceeff', fontSize: 24, letterSpacing: 8, fontWeight: 800 }}>OCEAN DISPLACEMENT // EXTREME</div>
        <div style={{ color: '#f4fbff', fontSize: 52, fontWeight: 900, letterSpacing: 5, marginTop: 16, textShadow: '0 0 24px rgba(69,220,255,.5)' }}>A WALL OF WATER</div>
      </div>
      <div style={{ position: 'absolute', top: 425, left: 90, color: '#bcefff', fontSize: 24, fontWeight: 800, letterSpacing: 5, textShadow: '0 0 18px #00cfff' }}>
        COASTLINE // EVACUATE
      </div>
      <HudCorners color="#7beaff" />
    </AbsoluteFill>
  );
};

const CrustScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const crack = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 22, stiffness: 60 } });
  const counter = interpolate(frame, [0, 30, 180], [100, 0.01, 0.01], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const embers = Array.from({ length: 46 }, (_, i) => {
    const startX = random(`ember-x-${i}`) * W;
    const startY = 1150 + random(`ember-y-${i}`) * 750;
    const rise = (frame * (1.2 + random(`ember-speed-${i}`) * 2.4)) % 1000;
    const x = startX + Math.sin(frame * 0.035 + i) * 42;
    const y = startY - rise;
    const size = 3 + random(`ember-size-${i}`) * 8;
    return <circle key={i} cx={x} cy={y} r={size} fill={i % 3 === 0 ? '#ffd267' : '#ff592e'} opacity={0.25 + random(`ember-opacity-${i}`) * 0.65} style={{ filter: 'drop-shadow(0 0 8px #ff542a)' }} />;
  });

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 77%, #35120e 0%, #170b12 35%, #070912 75%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 260, height: 480, background: 'linear-gradient(0deg, rgba(255,71,28,.2), transparent)' }} />
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="planet" cx="50%" cy="34%">
            <stop offset="0%" stopColor="#4e5663" />
            <stop offset="58%" stopColor="#262a34" />
            <stop offset="100%" stopColor="#0b0d13" />
          </radialGradient>
          <clipPath id="planetClip"><circle cx="540" cy="1050" r="470" /></clipPath>
        </defs>
        <circle cx="540" cy="1050" r="497" fill="none" stroke="#ff612b" strokeWidth="5" opacity=".42" />
        <circle cx="540" cy="1050" r="470" fill="url(#planet)" stroke="#a4a9ad" strokeWidth="4" />
        <g clipPath="url(#planetClip)">
          <path d="M95 1080l145-95 116 24 43-95 71 45 45-72 55 128-54 77 39 75-82 61-92-20-73 81-119-48-43-77z" fill="#424650" opacity=".9" />
          <path d="M560 720l34 157-66 90 76 102-28 83 68 77-28 176" fill="none" stroke="#ff571f" strokeWidth={12 * crack} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 15px #ff3b1f)' }} />
          <path d="M325 900l126 66-35 101 84 55-68 106 12 145" fill="none" stroke="#ff6b29" strokeWidth={9 * crack} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 13px #ff4b22)' }} />
          <path d="M745 830l-91 93 79 74-85 102 43 102-69 104" fill="none" stroke="#ff4c23" strokeWidth={10 * crack} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 15px #ff3b1f)' }} />
          <path d="M270 1120l120-24 49 53 78-29M650 1010l-79 44 25 78-72 37M475 1260l83-62 92 38" fill="none" stroke="#ffc05c" strokeWidth={5 * crack} opacity=".9" />
        </g>
        <path d="M80 1510c190-80 320 38 470-18 185-69 304-25 450 42v386H80z" fill="#11141a" />
        <path d="M80 1510c190-80 320 38 470-18 185-69 304-25 450 42" fill="none" stroke="#ff592d" strokeWidth="8" opacity=".7" />
        <g>{embers}</g>
        <path d="M110 1340l68-42 42 18 39-58M900 1390l-65-54-52 20-49-76" fill="none" stroke="#ff622c" strokeWidth="6" opacity={crack} />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 265,
          left: 78,
          right: 78,
          padding: '24px 26px',
          border: '2px solid rgba(255,79,55,.8)',
          background: 'rgba(30,8,11,.84)',
          boxShadow: '0 0 28px rgba(255,57,34,.28), inset 0 0 20px rgba(255,57,34,.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ff715a',
          fontWeight: 900,
          letterSpacing: 3,
        }}
      >
        <span style={{ fontSize: 22 }}>SURVIVAL CHANCE</span>
        <span style={{ fontSize: 38, color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 16px #ff422d' }}>
          {counter < 0.1 ? '0.01' : counter.toFixed(2)}%
        </span>
      </div>
      <div style={{ position: 'absolute', top: 390, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ color: '#ffb18b', fontSize: 23, fontWeight: 800, letterSpacing: 8 }}>ROTATIONAL RESTART // CRITICAL</div>
        <div style={{ color: '#fff1e8', fontSize: 48, fontWeight: 900, letterSpacing: 5, marginTop: 16, textShadow: '0 0 24px rgba(255,74,35,.55)' }}>THE CRUST GIVES WAY</div>
      </div>
      <HudCorners color="#ff7045" />
    </AbsoluteFill>
  );
};

const KineticCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneIndex = Math.min(SCENES.length - 1, Math.floor(frame / (4 * fps)));
  const scene = SCENES[sceneIndex];
  const sceneStartFrame = scene.start * fps;
  const localFrame = frame - sceneStartFrame;
  const words = scene.text.split(' ');
  const activeWordIndex = Math.min(
    words.length - 1,
    Math.floor(clamp01(localFrame / (scene.duration * fps)) * words.length),
  );
  const lines: string[][] = [];
  for (let i = 0; i < words.length; i += 4) lines.push(words.slice(i, i + 4));

  let wordCursor = 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        right: 70,
        bottom: 220,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        pointerEvents: 'none',
      }}
    >
      {lines.map((line, lineIndex) => (
        <div
          key={`${sceneIndex}-${lineIndex}`}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            maxWidth: 940,
          }}
        >
          {line.map((word) => {
            const currentIndex = wordCursor++;
            const active = currentIndex === activeWordIndex;
            const wordStart = Math.floor((currentIndex / words.length) * scene.duration * fps);
            const pop = spring({
              frame: Math.max(0, localFrame - wordStart),
              fps,
              config: { damping: 11, stiffness: 190, mass: 0.55 },
            });
            return (
              <span
                key={`${sceneIndex}-${currentIndex}`}
                style={{
                  display: 'inline-block',
                  padding: active ? '8px 14px 10px' : '3px 5px',
                  borderRadius: 8,
                  background: active
                    ? sceneIndex === 3
                      ? 'rgba(255,67,43,.96)'
                      : 'rgba(255,224,67,.97)'
                    : 'rgba(2,5,12,.56)',
                  color: active ? '#11131a' : '#ffffff',
                  fontSize: active ? 42 : 37,
                  lineHeight: 1.08,
                  fontWeight: 1000,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  transform: `scale(${active ? 0.88 + pop * 0.18 : 1}) translateY(${active ? (1 - pop) * 10 : 0}px)`,
                  WebkitTextStroke: active ? '1px rgba(0,0,0,.8)' : '2px #05070f',
                  textShadow: active
                    ? '0 3px 0 rgba(0,0,0,.7), 0 0 18px rgba(255,220,67,.55)'
                    : '0 4px 3px #000, 2px 2px 0 #000, -2px -2px 0 #000',
                  boxShadow: active ? '0 0 22px rgba(255,214,55,.35)' : 'none',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const PostProcessing: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 12 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.18) 72%, rgba(0,0,0,.78) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.085,
          background: 'repeating-linear-gradient(0deg, rgba(185,229,255,.28) 0px, rgba(185,229,255,.28) 1px, transparent 1px, transparent 5px)',
          transform: `translateY(${frame % 5}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(44,175,255,.035), transparent 18%, transparent 82%, rgba(255,83,45,.035))',
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};

const ApocalypseReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#05070f', overflow: 'hidden', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <Starfield />
      {SCENES.map((scene, index) => (
        <Sequence key={index} from={scene.start * 60} durationInFrames={scene.duration * 60}>
          <CameraRig sceneIndex={index}>
            {index === 0 ? <EarthScene /> : index === 1 ? <CityScene /> : index === 2 ? <TsunamiScene /> : <CrustScene />}
          </CameraRig>
        </Sequence>
      ))}
      <Audio src={staticFile('voice.mp3')} />
      <PostProcessing />
      <KineticCaptions />
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Reel"
      component={ApocalypseReel}
      durationInFrames={960}
      fps={60}
      width={1080}
      height={1920}
    />
  );
