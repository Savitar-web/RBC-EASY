import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .home-page {
  margin: 0;
  padding: 0;
  height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;

  overflow: hidden;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: white;
  background-color: #111;
  position: relative;
  background-image: url('/images/backgrounds/FCC.png');
        }

        .home-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7); z-index: 0;
} .background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/images/backgrounds/FCC.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -1;
  filter: brightness(0.4); }

        .bg-repeat {
          position: absolute;
          inset: 0;
          background-image: url('/images/backgrounds/FCC.png');
          background-size: 320px auto;
          background-repeat: repeat;
          background-position: center;
          z-index: -1;
          filter: brightness(0.4);
        }

        .container {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 40px 24px;
          max-width: 400px;
          width: 100%;
          animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

{/* =========================
   TITULO + BOTONES
========================== */}

  h1 {
    font-size: 2.6rem;
    letter-spacing: 0.18em;
    margin-bottom: 10px;
    text-transform: uppercase;
    color: var(--accent);
    text-shadow:
      0 0 12px var(--glow),
      0 0 30px color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .author {
    font-size: 0.95rem;
    color: var(--text-secondary);
    margin-bottom: 50px;
    letter-spacing: 0.08em;
  }

  .start-button {
    display: inline-block;
    padding: 14px 42px;
    font-size: 1.05rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-decoration: none;
    color: #ffffff;
    background: linear-gradient(
      135deg,
      var(--accent),
      color-mix(in srgb, var(--accent) 70%, #000)
    );
    border-radius: var(--radius, 10px);
    box-shadow:
      0 0 20px var(--glow),
      0 0 50px color-mix(in srgb, var(--accent) 30%, transparent);
    transition: transform 0.25s ease,
                box-shadow 0.25s ease,
                background 0.25s ease;
    border: none;
    cursor: pointer;
  }

  .start-button:hover {
    transform: translateY(-4px) scale(1.03);
    box-shadow:
      0 0 30px var(--glow),
      0 0 70px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  .start-button:active {
    transform: scale(0.97);
  }

  .contact-link {
    margin-top: 35px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.2s ease, text-shadow 0.2s ease;
  }

  .contact-link:hover {
    color: var(--accent);
    text-shadow: 0 0 6px var(--glow);
  }

  @media (max-width: 768px) {
    body {
      align-items: flex-start;
    }
    .container {
      padding-top: 35vh;
      padding-bottom: 40px;
    }
    h1 {
      font-size: 2rem;
    }
    .start-button {
      padding: 12px 34px;
      font-size: 0.95rem;
    }
  }
`}</style>

      <div className="home-page">
        <div className="bg-repeat" />
        <div className="container">
          <h1>RBC-EASY</h1>
          <div className="author">Autor · Savitar</div>

          <button className="start-button" onClick={() => navigate('/proyectos')}>
            Empezar
          </button>

          <div className="contact-link" onClick={() => navigate('/contacto')}>
            Contacto
          </div>
        </div>
      </div>
    </>
  );
}