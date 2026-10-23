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
    try{const saved=localStorage.getItem('rbc-theme');return THEMES.some(item=>item.id===saved)?saved as Theme:'cyberpunk';}catch{return 'cyberpunk';}
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try{localStorage.setItem('rbc-theme', theme);}catch{}
    const light=['light','light-academia','minimalismo-escandinavo','neumorphism','corporate-memphis','bauhaus','frutiger-aero','cottagecore'].includes(theme);
    const hues:Partial<Record<Theme,number>>={dark:210,light:218,rainbow:270,'raygun-gothic':170,cluttercore:24,oceancore:195,spacecore:252,goblincore:90,fairycore:288,nightcore:275,'retro-cgi':165,vectorheart:340,windowscore:210,'frutiger-aero':185,vaporwave:292,y2k:228,glassmorphism:210,solarpunk:145,steampunk:35,dieselpunk:30,'cassette-futurism':40,synthwave:300,'brutalismo-digital':15,neumorphism:220,memphis:325,bauhaus:215,'art-deco':42,retrofuturismo:195,'dark-academia':38,'light-academia':30,cottagecore:135,dreamcore:265,weirdcore:325,'liminal-space':45,biopunk:130,techwear:195,'corporate-memphis':218,skeuomorphism:35,'minimalismo-escandinavo':205,maximalismo:320,'ukiyo-e-moderno':355,'cyber-y2k':185};
    const colors=theme==='cyberpunk'?{}:{'--ui-surface':light?'rgba(246,247,249,.95)':'rgba(20,23,29,.94)','--ui-soft':light?'rgba(226,230,237,.9)':'rgba(37,42,51,.85)','--ui-field':light?'rgba(255,255,255,.94)':'rgba(12,15,20,.85)','--ui-text':light?'#1e293b':'#edf0f5','--ui-muted':light?'#475569':'#b5becb','--ui-line':light?'#33415530':'#cbd5e130','--ui-accent':`hsl(${hues[theme]??210} ${light?55:48}% ${light?37:73}%)`,'--ui-accent-ink':light?'#fff':'#11151c'};
    for(const key of ['--ui-surface','--ui-soft','--ui-field','--ui-text','--ui-muted','--ui-line','--ui-accent','--ui-accent-ink']){if(key in colors)document.documentElement.style.setProperty(key,colors[key]);else document.documentElement.style.removeProperty(key);}
    document.documentElement.style.colorScheme=light?'light':'dark';
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