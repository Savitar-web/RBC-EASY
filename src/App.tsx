import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import Home from './pages/Home/Home';
import Projects from './pages/Projects/Projects';
import Contact from './pages/Contact/Contact';
import BibliasMaker from './pages/BibliasMaker/BibliasMaker';
import Writer from './pages/Writer/Writer';

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/proyectos" element={<Projects />} />
        <Route path="/contacto" element={<Contact />} />

        <Route path="/proyectos" element={<Projects />} />
        <Route path="/biblias" element={<BibliasMaker />} />
        <Route path="/Writer" element={<Writer />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;