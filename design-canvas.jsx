// design-canvas.jsx — design-tool-style artboard canvas
// Provides DesignCanvas, DCSection, DCArtboard

function DesignCanvas({ children }) {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#e8e6e1',
      padding: '48px 0 80px',
      overflowX: 'auto',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 48px' }}>
        {children}
      </div>
    </div>
  );
}

function DCSection({ id, title, subtitle, children }) {
  return (
    <section id={id} style={{ marginBottom: 80 }}>
      {/* Section header */}
      <div style={{
        marginBottom: 40,
        paddingBottom: 20,
        borderBottom: '1px solid rgba(20,17,13,0.16)',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#B33E16',
          marginBottom: 8,
        }}>
          Design Canvas
        </div>
        <h1 style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          color: '#14110D',
          margin: '0 0 10px',
        }}>{title}</h1>
        {subtitle && (
          <p style={{
            fontFamily: "'Inter Tight', system-ui, sans-serif",
            fontSize: 14,
            lineHeight: 1.5,
            color: '#6B6660',
            margin: 0,
          }}>{subtitle}</p>
        )}
      </div>

      {/* Artboards row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 64,
        alignItems: 'flex-start',
      }}>
        {children}
      </div>
    </section>
  );
}

function DCArtboard({ id, label, width, height, children }) {
  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Label above */}
      <div style={{
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: '#6B6660',
        alignSelf: 'flex-start',
      }}>
        <span style={{ color: '#14110D', fontWeight: 500 }}>{label}</span>
        {' '}
        <span style={{ color: '#94908A' }}>· {width} × {height}</span>
      </div>

      {/* Artboard frame */}
      <div style={{
        position: 'relative',
        background: 'rgba(20,17,13,0.06)',
        borderRadius: 6,
        padding: 2,
      }}>
        {children}
      </div>
    </div>
  );
}
