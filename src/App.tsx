export default function App() {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>KING APP</p>
        <h1 style={styles.h1}>Chúc mừng năm mới — An khang, thịnh vượng</h1>
        <p style={styles.p}>
          Chúc Vuong và gia đình một năm mới nhiều sức khỏe, nhiều niềm vui,
          công việc hanh thông và tiền vào như nước.
        </p>
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
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: 'linear-gradient(180deg, #fff7ed, #fff1f2)',
    color: '#0f172a',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  card: {
    width: 'min(720px, 100%)',
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(226,232,240,1)',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
    backdropFilter: 'blur(6px)',
  },
  kicker: {
    margin: 0,
    fontWeight: 800,
    letterSpacing: 1,
    color: '#b91c1c',
    fontSize: 12,
  },
  h1: {
    margin: '10px 0 0',
    fontSize: 34,
    lineHeight: 1.15,
  },
  p: {
    margin: '14px 0 0',
    fontSize: 16,
    lineHeight: 1.6,
    color: '#334155',
  },
  row: {
    marginTop: 22,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: 700,
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
};
