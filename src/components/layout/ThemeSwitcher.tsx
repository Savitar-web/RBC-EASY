// src/components/layout/ThemeSwitcher.tsx
import { useTheme, type Theme } from '../../hooks/useTheme';

interface ThemeSwitcherProps {
  onClose?: () => void;
}

const THEME_LABELS: Record<string, string> = {
  cyberpunk: 'Red (Default)',
  dark: 'Modo Oscuro',
  light: 'Modo Claro',
  rainbow: 'Arcoíris',
  'raygun-gothic': 'Raygun Gothic',
  cluttercore: 'Cluttercore',
  oceancore: 'Oceancore',
  spacecore: 'Spacecore',
  goblincore: 'Goblincore',
  fairycore: 'Fairycore',
  nightcore: 'Nightcore Aesthetic',
  'retro-cgi': 'Retro CGI',
  vectorheart: 'Vectorheart',
  windowscore: 'Windowscore',
  'frutiger-aero': 'Frutiger Aero',
  vaporwave: 'Vaporwave',
  y2k: 'Y2K',
  glassmorphism: 'Glassmorphism',
  solarpunk: 'Solarpunk',
  steampunk: 'Steampunk',
  dieselpunk: 'Dieselpunk',
  'cassette-futurism': 'Cassette Futurism',
  synthwave: 'Synthwave',
  'brutalismo-digital': 'Brutalismo Digital',
  neumorphism: 'Neumorphism',
  memphis: 'Memphis',
  bauhaus: 'Bauhaus',
  'art-deco': 'Art Deco',
  retrofuturismo: 'Retrofuturismo',
  'dark-academia': 'Dark Academia',
  'light-academia': 'Light Academia',
  cottagecore: 'Cottagecore',
  dreamcore: 'Dreamcore',
  weirdcore: 'Weirdcore',
  'liminal-space': 'Liminal Space',
  biopunk: 'Biopunk',
  techwear: 'Techwear',
  'corporate-memphis': 'Corporate Memphis',
  skeuomorphism: 'Skeuomorphism',
  'minimalismo-escandinavo': 'Minimalismo Escandinavo',
  maximalismo: 'Maximalismo',
  'ukiyo-e-moderno': 'Ukiyo-e Moderno',
  'cyber-y2k': 'Cyber Y2K',
};

export default function ThemeSwitcher({ onClose }: ThemeSwitcherProps) {
  const { theme, setTheme, themes } = useTheme();

  // themes viene como { id: Theme; name: string }[]
  // Si no hay temas, generamos la lista desde THEME_LABELS
  const list =
    themes && themes.length > 0
      ? themes
      : Object.keys(THEME_LABELS).map((id) => ({
          id: id as Theme,
          name: THEME_LABELS[id],
        }));

  return (
    <div className="theme-switcher">
      <style>{`
        .theme-switcher {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius, 12px);
          padding: 16px;
          max-height: 70vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.45);
          min-width: 280px;
          max-width: 360px;
        }
        .theme-switcher h3 {
          margin: 0 0 14px;
          color: var(--accent);
          font-size: 16px;
          text-align: center;
          font-family: 'Lora', serif;
        }
        .theme-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .theme-item {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          font-family: 'Lora', serif;
          transition: all 0.15s ease;
        }
        .theme-item:hover {
          background: color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .theme-item.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
          box-shadow: 0 0 12px var(--glow);
        }
        .theme-switcher::-webkit-scrollbar {
          width: 5px;
        }
        .theme-switcher::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .theme-switcher::-webkit-scrollbar-thumb {
          background: #333;
          border: 1px solid var(--accent);
          border-radius: 4px;
        }
        .close-theme {
          margin-top: 14px;
          width: 100%;
          padding: 11px;
          border: none;
          border-radius: 8px;
          background: var(--accent);
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-family: 'Lora', serif;
        }
        .close-theme:hover {
          background: var(--accent-hover);
        }
      `}</style>

      <h3>Elegir tema</h3>

      <div className="theme-list">
        {list.map((item) => {
          const id = typeof item === 'string' ? item : item.id;
          const label =
            typeof item === 'string'
              ? THEME_LABELS[item] || item
              : item.name || THEME_LABELS[item.id] || item.id;

          return (
            <button
              key={id}
              className={`theme-item ${theme === id ? 'active' : ''}`}
              onClick={() => {
                setTheme(id as Theme);
                onClose?.();
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {onClose && (
        <button className="close-theme" onClick={onClose}>
          Cerrar
        </button>
      )}
    </div>
  );
} 