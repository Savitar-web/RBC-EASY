import { useNavigate } from 'react-router-dom';

export default function Contact() {
  const navigate = useNavigate();

  const links = [
    { label: 'AminoApps · Venus Art', url: 'http://aminoapps.com/p/6ef8q5', icon: '📚' },
    { label: 'WhatsApp Channel', url: 'https://www.whatsapp.com/channel/0029VaTRAtgInlqW5dnwbG2K', icon: '💬' },
    { label: 'Facebook', url: 'https://www.facebook.com/share/H84WiYzaNQsJgMWR/?mibextid=LQQJ4d', icon: '📘' },
    { label: 'X / Twitter', url: 'https://x.com/IAMSAVITARXENO', icon: '𝕏' },
    { label: 'YouTube', url: 'https://youtube.com/@savitarxeno', icon: '▶️' },
    { label: 'Instagram', url: 'https://www.instagram.com/iamsavitarxeno/', icon: '📷' },
    { label: 'Threads', url: 'https://www.threads.net/@iamsavitarxeno', icon: '🧵' },
    { label: 'TikTok', url: 'https://www.tiktok.com/@savitar.xeno', icon: '🎵' },
  ];

  return (
    <>
      <style>{`
        .contact-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: url('/images/backgrounds/FSH.png') center/cover no-repeat;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }
        .contact-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.68);
          backdrop-filter: blur(2px);
        }
        .glass-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          max-height: calc(100dvh - 40px);
          overflow-y: auto;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          animation: glassIn 0.55s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes glassIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .glass-card h1 {
          margin: 0 0 4px;
          font-size: 1.7rem;
          letter-spacing: 0.08em;
          text-align: center;
          color: var(--accent, #ff0000);
          text-shadow: 0 0 18px var(--glow);
        }
        .subtitle {
          text-align: center;
          color: rgba(255,255,255,0.55);
          font-size: 0.85rem;
          margin-bottom: 20px;
        }
        .email {
          text-align: center;
          margin-bottom: 18px;
          padding: 12px;
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          border: 1px dashed rgba(255,255,255,0.15);
        }
        .email a {
          color: var(--accent);
          font-weight: 600;
          text-decoration: none;
          font-size: 0.95rem;
        }
        .links {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .links a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #fff;
          text-decoration: none;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .links a:hover {
          background: color-mix(in srgb, var(--accent) 18%, transparent);
          border-color: var(--accent);
          transform: translateX(4px);
        }
        .back {
          margin-top: 20px;
          width: 100%;
          padding: 13px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          box-shadow: 0 0 20px var(--glow);
          transition: all 0.25s;
        }
        .back:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 32px var(--glow);
        }
      `}</style>

      <div className="contact-page">
        <div className="glass-card">
          <h1>Contacto</h1>
          <p className="subtitle">Conecta con Savitar</p>

          <div className="email">
            <a href="mailto:savitarxeno@gmail.com">savitarxeno@gmail.com</a>
          </div>

          <div className="links">
            {links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                <span>{l.icon}</span> {l.label}
              </a>
            ))}
          </div>

          <button className="back" onClick={() => navigate('/')}>
            ← Volver a Empezar
          </button>
        </div>
      </div>
    </>
  );
}