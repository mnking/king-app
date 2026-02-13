export default function App() {
  return (
    <main style={styles.page}>
      {/* Decorative corner icons */}
      <div style={{ ...styles.floating, ...styles.floatTL }} aria-hidden>
        <SparkleIcon />
      </div>
      <div style={{ ...styles.floating, ...styles.floatTR }} aria-hidden>
        <LanternIcon />
      </div>
      <div style={{ ...styles.floating, ...styles.floatBL }} aria-hidden>
        <FireworkIcon />
      </div>
      <div style={{ ...styles.floating, ...styles.floatBR }} aria-hidden>
        <SparkleIcon />
      </div>

      <section style={styles.card}>
        <div style={styles.headerRow}>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            <span>KING APP</span>
          </div>
          <div style={styles.emojiRow} aria-hidden>
            <span style={styles.emoji}>🧧</span>
            <span style={styles.emoji}>🎉</span>
            <span style={styles.emoji}>🪭</span>
          </div>
        </div>

        <h1 style={styles.h1}>
          Chúc mừng năm mới <span style={styles.h1Accent}>—</span> An khang,
          thịnh vượng
        </h1>

        <p style={styles.p}>
          Chúc Vuong và gia đình một năm mới nhiều sức khỏe, nhiều niềm vui, công
          việc hanh thông và tiền vào như nước.
        </p>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statIcon} aria-hidden>
              ✨
            </span>
            <div>
              <div style={styles.statLabel}>May mắn</div>
              <div style={styles.statValue}>Đầy nhà</div>
            </div>
          </div>
          <div style={styles.stat}>
            <span style={styles.statIcon} aria-hidden>
              💼
            </span>
            <div>
              <div style={styles.statLabel}>Công việc</div>
              <div style={styles.statValue}>Hanh thông</div>
            </div>
          </div>
          <div style={styles.stat}>
            <span style={styles.statIcon} aria-hidden>
              💰
            </span>
            <div>
              <div style={styles.statLabel}>Tài lộc</div>
              <div style={styles.statValue}>Tăng đều</div>
            </div>
          </div>
        </div>

        <div style={styles.row}>
          <a style={{ ...styles.btn, ...styles.btnPrimary }} href="#">
            Bắt đầu
          </a>
          <a
            style={{ ...styles.btn, ...styles.btnGhost }}
            href="https://github.com/mnking/king-app"
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
        </div>

        <div style={styles.footer}>
          <span aria-hidden>🌸</span> Chúc bạn một ngày vui vẻ.
        </div>
      </section>
    </main>
  );
}

function SparkleIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l1.2 6.2L20 12l-6.8 3.8L12 22l-1.2-6.2L4 12l6.8-3.8L12 2Z"
        stroke="#dc2626"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 3.5l.5 2.5 2.5.5-2.5.5-.5 2.5-.5-2.5-2.5-.5 2.5-.5.5-2.5Z"
        fill="#f59e0b"
      />
    </svg>
  );
}

function LanternIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3c3 0 5 2 5 5v6c0 3-2 5-5 5s-5-2-5-5V8c0-3 2-5 5-5Z"
        fill="#ef4444"
      />
      <path d="M9 8h6" stroke="#7f1d1d" strokeWidth="1.2" />
      <path d="M9 12h6" stroke="#7f1d1d" strokeWidth="1.2" />
      <path d="M9 16h6" stroke="#7f1d1d" strokeWidth="1.2" />
      <path
        d="M12 2v2"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M12 19v3"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="22" r="1" fill="#f59e0b" />
    </svg>
  );
}

function FireworkIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12l-7 7"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M12 3v4" stroke="#f59e0b" strokeWidth="1.6" />
      <path d="M12 17v4" stroke="#f59e0b" strokeWidth="1.6" />
      <path d="M3 12h4" stroke="#f59e0b" strokeWidth="1.6" />
      <path d="M17 12h4" stroke="#f59e0b" strokeWidth="1.6" />
      <path d="M5.2 5.2l2.8 2.8" stroke="#f59e0b" strokeWidth="1.6" />
      <path d="M16 16l2.8 2.8" stroke="#f59e0b" strokeWidth="1.6" />
      <path d="M18.8 5.2L16 8" stroke="#f59e0b" strokeWidth="1.6" />
      <path d="M8 16l-2.8 2.8" stroke="#f59e0b" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2" fill="#dc2626" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background:
      'radial-gradient(900px 500px at 20% 10%, rgba(239,68,68,0.10), transparent 60%),\n       radial-gradient(800px 500px at 80% 20%, rgba(245,158,11,0.14), transparent 55%),\n       linear-gradient(180deg, #fff7ed, #fff1f2)',
    color: '#0f172a',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    width: 'min(760px, 100%)',
    background: 'rgba(255,255,255,0.86)',
    border: '1px solid rgba(226,232,240,1)',
    borderRadius: 18,
    padding: 28,
    boxShadow: '0 12px 36px rgba(15,23,42,0.10)',
    backdropFilter: 'blur(8px)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(220,38,38,0.08)',
    color: '#b91c1c',
    fontWeight: 800,
    letterSpacing: 0.8,
    fontSize: 12,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: '#dc2626',
    boxShadow: '0 0 0 4px rgba(220,38,38,0.15)',
  },
  emojiRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 18,
  },
  h1: {
    margin: '14px 0 0',
    fontSize: 34,
    lineHeight: 1.15,
    letterSpacing: -0.2,
  },
  h1Accent: {
    color: '#dc2626',
  },
  p: {
    margin: '14px 0 0',
    fontSize: 16,
    lineHeight: 1.65,
    color: '#334155',
  },
  stats: {
    marginTop: 18,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },
  stat: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    border: '1px solid rgba(226,232,240,1)',
    background: 'rgba(255,255,255,0.7)',
  },
  statIcon: {
    fontSize: 18,
    width: 34,
    height: 34,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(245,158,11,0.12)',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 700,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 800,
    color: '#0f172a',
  },
  row: {
    marginTop: 20,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 800,
    fontSize: 14,
  },
  btnPrimary: {
    background: '#dc2626',
    color: 'white',
  },
  btnGhost: {
    background: 'white',
    color: '#0f172a',
    border: '1px solid rgba(226,232,240,1)',
  },
  footer: {
    marginTop: 18,
    fontSize: 12,
    color: '#64748b',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  floating: {
    position: 'absolute',
    opacity: 0.85,
    filter: 'drop-shadow(0 10px 14px rgba(15,23,42,0.12))',
  },
  floatTL: { top: 18, left: 18, transform: 'rotate(-10deg)' },
  floatTR: { top: 16, right: 16, transform: 'rotate(12deg)' },
  floatBL: { bottom: 14, left: 14, transform: 'rotate(6deg)' },
  floatBR: { bottom: 18, right: 18, transform: 'rotate(-8deg)' },
};
