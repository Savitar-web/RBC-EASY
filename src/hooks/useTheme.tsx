import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme =
  | 'cyberpunk' | 'dark' | 'light' | 'rainbow' | 'raygun-gothic' | 'cluttercore'
  | 'oceancore' | 'spacecore' | 'goblincore' | 'fairycore' | 'nightcore'
  | 'retro-cgi' | 'vectorheart' | 'windowscore' | 'frutiger-aero' | 'vaporwave'
  | 'y2k' | 'glassmorphism' | 'solarpunk' | 'steampunk' | 'dieselpunk'
  | 'cassette-futurism' | 'synthwave' | 'brutalismo-digital' | 'neumorphism'
  | 'memphis' | 'bauhaus' | 'art-deco' | 'retrofuturismo' | 'dark-academia'
  | 'light-academia' | 'cottagecore' | 'dreamcore' | 'weirdcore' | 'liminal-space'
  | 'biopunk' | 'techwear' | 'corporate-memphis' | 'skeuomorphism'
  | 'minimalismo-escandinavo' | 'maximalismo' | 'ukiyo-e-moderno' | 'cyber-y2k';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  themes: { id: Theme; name: string }[];
}

const THEMES: { id: Theme; name: string }[] = [
  { id: 'cyberpunk', name: 'Red (Default)' },
  { id: 'dark', name: 'Modo Oscuro' },
  { id: 'light', name: 'Modo Claro' },
  { id: 'rainbow', name: 'Arcoíris' },
  { id: 'raygun-gothic', name: 'Raygun Gothic' },
  { id: 'cluttercore', name: 'Cluttercore' },
  { id: 'oceancore', name: 'Oceancore' },
  { id: 'spacecore', name: 'Spacecore' },
  { id: 'goblincore', name: 'Goblincore' },
  { id: 'fairycore', name: 'Fairycore' },
  { id: 'nightcore', name: 'Nightcore Aesthetic' },
  { id: 'retro-cgi', name: 'Retro CGI' },
  { id: 'vectorheart', name: 'Vectorheart' },
  { id: 'windowscore', name: 'Windowscore' },
  { id: 'frutiger-aero', name: 'Frutiger Aero' },
  { id: 'vaporwave', name: 'Vaporwave' },
  { id: 'y2k', name: 'Y2K' },
  { id: 'glassmorphism', name: 'Glassmorphism' },
  { id: 'solarpunk', name: 'Solarpunk' },
  { id: 'steampunk', name: 'Steampunk' },
  { id: 'dieselpunk', name: 'Dieselpunk' },
  { id: 'cassette-futurism', name: 'Cassette Futurism' },
  { id: 'synthwave', name: 'Synthwave' },
  { id: 'brutalismo-digital', name: 'Brutalismo Digital' },
  { id: 'neumorphism', name: 'Neumorphism' },
  { id: 'memphis', name: 'Memphis Design' },
  { id: 'bauhaus', name: 'Bauhaus' },
  { id: 'art-deco', name: 'Art Deco' },
  { id: 'retrofuturismo', name: 'Retrofuturismo' },
  { id: 'dark-academia', name: 'Dark Academia' },
  { id: 'light-academia', name: 'Light Academia' },
  { id: 'cottagecore', name: 'Cottagecore' },
  { id: 'dreamcore', name: 'Dreamcore' },
  { id: 'weirdcore', name: 'Weirdcore' },
  { id: 'liminal-space', name: 'Liminal Space' },
  { id: 'biopunk', name: 'Biopunk' },
  { id: 'techwear', name: 'Techwear' },
  { id: 'corporate-memphis', name: 'Corporate Memphis' },
  { id: 'skeuomorphism', name: 'Skeuomorphism' },
  { id: 'minimalismo-escandinavo', name: 'Minimalismo Escandinavo' },
  { id: 'maximalismo', name: 'Maximalismo' },
  { id: 'ukiyo-e-moderno', name: 'Ukiyo-e Moderno' },
  { id: 'cyber-y2k', name: 'Cyber Y2K' },
];

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('rbc-theme') as Theme) || 'cyberpunk';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rbc-theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return ctx;
}