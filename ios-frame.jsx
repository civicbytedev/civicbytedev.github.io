// ios-frame.jsx — iPhone hardware shell component
// Wraps any screen content in a realistic iOS device chrome

function IOSDevice({ width = 402, height = 874, children }) {
  const bezelH = 18;   // horizontal bezel thickness
  const bezelT = 16;   // top bezel
  const bezelB = 20;   // bottom bezel
  const r = 52;        // outer corner radius (device)
  const rInner = 40;   // inner screen corner radius

  const outerW = width  + bezelH * 2;
  const outerH = height + bezelT + bezelB;

  return (
    <div style={{
      position: 'relative',
      width:  outerW,
      height: outerH,
      borderRadius: r,
      background: 'linear-gradient(160deg,#2a2a2e 0%,#1a1a1e 60%,#111115 100%)',
      boxShadow: [
        '0 0 0 1px rgba(255,255,255,0.08)',
        '0 40px 80px -20px rgba(0,0,0,0.55)',
        'inset 0 1px 0 rgba(255,255,255,0.14)',
        'inset 0 -1px 0 rgba(255,255,255,0.06)',
      ].join(','),
      flexShrink: 0,
    }}>

      {/* Side button — right power */}
      <div style={{
        position: 'absolute', right: -3, top: 130,
        width: 3, height: 72,
        background: 'linear-gradient(180deg,#3a3a3e,#2a2a2e)',
        borderRadius: '0 3px 3px 0',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.08)',
      }} />

      {/* Left volume up */}
      <div style={{
        position: 'absolute', left: -3, top: 120,
        width: 3, height: 52,
        background: 'linear-gradient(180deg,#3a3a3e,#2a2a2e)',
        borderRadius: '3px 0 0 3px',
        boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08)',
      }} />

      {/* Left volume down */}
      <div style={{
        position: 'absolute', left: -3, top: 186,
        width: 3, height: 52,
        background: 'linear-gradient(180deg,#3a3a3e,#2a2a2e)',
        borderRadius: '3px 0 0 3px',
        boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08)',
      }} />

      {/* Left silent toggle */}
      <div style={{
        position: 'absolute', left: -3, top: 70,
        width: 3, height: 36,
        background: 'linear-gradient(180deg,#3a3a3e,#2a2a2e)',
        borderRadius: '3px 0 0 3px',
        boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08)',
      }} />

      {/* Screen area */}
      <div style={{
        position: 'absolute',
        top: bezelT, left: bezelH,
        width, height,
        borderRadius: rInner,
        overflow: 'hidden',
        background: '#F4F1E9',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)',
      }}>
        {/* Status bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 58, zIndex: 10,
          display: 'flex', alignItems: 'flex-end',
          padding: '0 28px 10px',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}>
          {/* Time */}
          <span style={{
            fontFamily: "'Inter Tight', system-ui, sans-serif",
            fontWeight: 600, fontSize: 15,
            letterSpacing: '-0.01em', color: '#14110D',
          }}>9:41</span>

          {/* Dynamic island */}
          <div style={{
            position: 'absolute', top: 10, left: '50%',
            transform: 'translateX(-50%)',
            width: 120, height: 34,
            background: '#111115',
            borderRadius: 20,
          }} />

          {/* Status icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Signal bars */}
            <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
              <rect x="0"  y="7" width="3" height="5" rx="0.8" fill="#14110D"/>
              <rect x="4.5" y="4.5" width="3" height="7.5" rx="0.8" fill="#14110D"/>
              <rect x="9"  y="2" width="3" height="10" rx="0.8" fill="#14110D"/>
              <rect x="13.5" y="0" width="3" height="12" rx="0.8" fill="#14110D" opacity="0.3"/>
            </svg>
            {/* WiFi */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="#14110D">
              <path d="M8 9.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z"/>
              <path d="M8 6.5C6.34 6.5 4.84 7.18 3.75 8.27l1.06 1.06A4.49 4.49 0 0 1 8 8c1.24 0 2.36.5 3.18 1.32l1.07-1.06A5.98 5.98 0 0 0 8 6.5z" opacity="0.7"/>
              <path d="M8 3C5.28 3 2.82 4.1 1.03 5.93l1.07 1.07A8.46 8.46 0 0 1 8 4.5c2.34 0 4.46.95 5.99 2.49l1.06-1.06A9.96 9.96 0 0 0 8 3z" opacity="0.35"/>
            </svg>
            {/* Battery */}
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#14110D" strokeOpacity="0.35"/>
              <rect x="22" y="3.5" width="2.5" height="5" rx="1.5" fill="#14110D" fillOpacity="0.35"/>
              <rect x="2" y="2" width="15" height="8" rx="2" fill="#14110D"/>
            </svg>
          </div>
        </div>

        {/* Screen content */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {children}
        </div>
      </div>

      {/* Home indicator */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: '50%', transform: 'translateX(-50%)',
        width: 130, height: 5,
        background: 'rgba(255,255,255,0.40)',
        borderRadius: 3,
      }} />
    </div>
  );
}
