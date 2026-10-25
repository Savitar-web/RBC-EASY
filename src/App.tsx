import BackNavigation from './components/BackNavigation';
import DownloadCenter from './components/DownloadCenter';
import FirstInstall from './pwa/FirstInstall';
import Administration from './community/Administration';
import AuthorProfile from './community/AuthorProfile';
import NeuralReader from './audio/NeuralReader';
import {AuthProvider,Account} from './community/Auth';
import {Explore,PublicationPage,Publisher} from './community/Community';
import './community/community.css';
import {ReadingNotice} from './components/StudioControls';
import { Component, lazy, Suspense, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import Home from './pages/Home/Home';
const Projects=lazy(()=>import('./pages/Projects/Projects'));
import Contact from './pages/Contact/Contact';
const BibliasMaker=lazy(()=>import('./pages/BibliasMaker/BibliasMaker'));
const Writer=lazy(()=>import('./pages/Writer/Writer'));
const Calcular=lazy(()=>import('./pages/Calcular/Calcular'));
const ModoAscendido=lazy(()=>import('./pages/ModoAscendido/ModoAscendido'));
const Conversion=lazy(()=>import('./pages/Conversion/Conversion'));
const Balistica=lazy(()=>import('./pages/Balistica/Balistica'));
import { registerServiceWorker } from './pwa/offline';
import { isNativeAndroid, nativeShortcuts, promptInstall, onInstallReady, deviceKind, isStandalone } from './pwa/install';
import layoutCSS from './styles/calculator-layout.css?inline';
import viewportCSS from './styles/viewport.css?inline';
import comfortCSS from './styles/comfort.css?inline';
import Ambience from './audio/Ambience';
import ShortcutManager from './components/ShortcutManager';
import { PageBackground } from './components/BackgroundSettings';

const TITLES: Record<string, string> = {
  '/': 'RBC EASY',
  '/proyectos': 'Proyectos · RBC EASY',
  '/contacto': 'Contacto · RBC EASY',
  '/cuenta': 'Cuenta · RBC EASY',
  '/explorar': 'Explorar · RBC EASY',
  '/biblias': 'Biblias Maker · RBC EASY',
  '/Writer': 'Escritor · RBC EASY',
  '/calcular': 'Calculadora · RBC EASY',
  '/modo-ascendido': 'Modo ascendido · RBC EASY',
  '/conversion': 'Conversión · RBC EASY',
  '/balistica': 'Balística · RBC EASY',
};

class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error?.message || 'Error inesperado' };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#07070c',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, letterSpacing: '0.08em' }}>RBC EASY</h1>
          <p>Esta pantalla falló. El resto de la app sigue en el dispositivo.</p>
          <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.75, fontSize: 13 }}>{this.state.message}</pre>
          <button
            type="button"
            onClick={() => {
              this.setState({ message: null });
              window.location.assign('/');
            }}
            style={{
              marginTop: 8,
              padding: '12px 18px',
              borderRadius: 12,
              border: 0,
              background: '#e11d2e',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }
}

function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = TITLES[pathname] ?? 'RBC EASY';
  }, [pathname]);
  return null;
}

function PageViewport() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const editor = /^\/(biblias|writer)\/?$/i.test(pathname);
    const html = document.documentElement;
    html.dataset.appViewport = editor ? 'editor' : 'page';
    html.dataset.appPage = pathname.toLowerCase();
    if (!editor) {
      // Safari can retain the scroll offset from the keyboard or a previous route.
      document.getElementById('root')?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    }
    return () => { delete html.dataset.appViewport; };
  }, [pathname]);
  return null;
}

function OfflineBadge() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  if (online) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        pointerEvents: 'none',
        padding: '6px 12px',
        borderRadius: 999,
        background: 'rgba(8,8,12,0.88)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.2)',
        fontSize: 12,
        letterSpacing: '0.04em',
      }}
    >
      Sin conexión · usando lo guardado en el dispositivo
    </div>
  );
}

function PlatformAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => onInstallReady(setReady), []);
  useEffect(() => {
    if (!isNativeAndroid()) return;
    let disposed = false;
    const listener = nativeShortcuts.addListener('openRoute', ({ path }) => { if (!disposed) navigate(path); });
    nativeShortcuts.launchRoute().then(({ path }) => { if (path && !disposed) navigate(path); }).catch(console.warn);
    return () => { disposed = true; listener.then(handle => handle.remove()); };
  }, [navigate]);
  useEffect(()=>{const queue=(window as any).launchQueue;if(!queue?.setConsumer)return;queue.setConsumer((launch:{targetURL?:string})=>{if(!launch.targetURL)return;try{const url=new URL(launch.targetURL);if(url.origin===window.location.origin&&(Object.hasOwn(TITLES,url.pathname)||/^\/(perfil|publicacion)\/[^/]+$/.test(url.pathname)))navigate(url.pathname+url.search+url.hash);}catch{}});return()=>queue.setConsumer(()=>{});},[navigate]);
  useEffect(()=>{const bridge=(window as any).rbcDesktop;if(!bridge?.onNavigate)return;return bridge.onNavigate((path:string)=>{if(Object.hasOwn(TITLES,path))navigate(path);});},[navigate]);
  const params=new URLSearchParams(location.search);
  if(!params.has('install'))return null;
  const title=TITLES[location.pathname]?.split(' · ')[0]||'RBC EASY';
  return <ShortcutManager initialPage={{name:title,path:location.pathname}} installation={params.get('install')==='web'?'web':'pwa'} onClose={()=>navigate(location.pathname+(params.has('web')?'?web=1':''),{replace:true})}/>;

}

export default function App() {
  const installing=new URLSearchParams(useLocation().search).has('install');
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ThemeProvider>
      <ErrorBoundary><AuthProvider>
        <BackNavigation/><PageViewport /><PageBackground />
        <DocumentTitle />
        <PlatformAccess />
        <DownloadCenter/><FirstInstall/><Publisher/><NeuralReader/><OfflineBadge /><Ambience /><ReadingNotice/>
        <style>{layoutCSS + viewportCSS + comfortCSS}</style>
        <Suspense fallback={<div role="status" style={{minHeight:'100dvh',display:'grid',placeItems:'center',color:'var(--ui-text)'}}>Abriendo tu espacio…</div>}>{installing?<div style={{minHeight:'100dvh',background:'var(--ui-field)'}}/>:<Routes>
          <Route path="/administracion" element={<Administration/>}/><Route path="/" element={<Home />} /><Route path="/cuenta" element={<Account/>}/><Route path="/explorar" element={<Explore/>}/><Route path="/perfil/:username" element={<AuthorProfile/>}/><Route path="/publicacion/:id" element={<PublicationPage/>}/>
          <Route path="/proyectos" element={<Projects />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/biblias" element={<BibliasMaker />} />
          <Route path="/Writer" element={<Writer />} />
          <Route path="/writer" element={<Writer />} />
          <Route path="/calcular" element={<Calcular />} />
          <Route path="/modo-ascendido" element={<ModoAscendido />} />
          <Route path="/conversion" element={<Conversion />} />
          <Route path="/balistica" element={<Balistica />} />

          <Route path="/Projects" element={<Navigate to="/proyectos" replace />} />
          <Route path="/projects" element={<Navigate to="/proyectos" replace />} />
          <Route path="/Biblias" element={<Navigate to="/biblias" replace />} />
          <Route path="/conversor" element={<Navigate to="/conversion" replace />} />
          <Route path="/ascendido" element={<Navigate to="/modo-ascendido" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>}</Suspense>
      </AuthProvider></ErrorBoundary>
    </ThemeProvider>
  );
}
