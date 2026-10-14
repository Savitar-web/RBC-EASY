import { Component, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import Home from './pages/Home/Home';
import Projects from './pages/Projects/Projects';
import Contact from './pages/Contact/Contact';
import BibliasMaker from './pages/BibliasMaker/BibliasMaker';
import Writer from './pages/Writer/Writer';
import Calcular from './pages/Calcular/Calcular';
import ModoAscendido from './pages/ModoAscendido/ModoAscendido';
import Conversion from './pages/Conversion/Conversion';
import Balistica from './pages/Balistica/Balistica';
import { registerServiceWorker } from './pwa/offline';
import './pwa/install';

const TITLES: Record<string, string> = {
  '/': 'RBC EASY',
  '/proyectos': 'Proyectos · RBC EASY',
  '/contacto': 'Contacto · RBC EASY',
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

export default function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <DocumentTitle />
        <OfflineBadge />
        <Routes>
          <Route path="/" element={<Home />} />
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
        </Routes>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
