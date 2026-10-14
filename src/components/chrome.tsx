import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const MODULES = [
  { to: "/balistica", name: "Balística", blurb: "Trayectoria, arrastre, viento y tabla de caída." },
  { to: "/conversion", name: "Conversión", blurb: "Longitud, energía, datos, electricidad y más." },
  { to: "/modo-ascendido", name: "Modo ascendido", blurb: "Gráfica, matrices, cálculo y geometría." },
] as const;

export function TopBar({ title, tools }: { title: string; tools?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <header className="topbar">
      {path !== "/" ? (
        <Link to="/" className="icon-btn" aria-label="Volver a la calculadora">
          <ArrowLeft size={18} />
        </Link>
      ) : (
        <span className="icon-btn" aria-hidden="true" style={{ opacity: 0.35 }}>
          <ArrowLeft size={18} />
        </span>
      )}
      <div className="brand">{title}</div>
      <div className="spacer" />
      {tools}
      <div className="menu-wrap">
        <button type="button" className="pill" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          Módulos
        </button>
        {open ? (
          <div className="menu" role="menu">
            <Link to="/" data-active={path === "/" ? "true" : "false"}>
              <strong>Calculadora</strong>
              <span>Teclado científico y Science Mode.</span>
            </Link>
            {MODULES.map((m) => (
              <Link key={m.to} to={m.to} data-active={path === m.to ? "true" : "false"}>
                <strong>{m.name}</strong>
                <span>{m.blurb}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" className="icon-btn" aria-label="Menú" onClick={() => setOpen((v) => !v)}>
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
    </header>
  );
}

export function Scene({ children }: { children: ReactNode }) {
  return <div className="scene">{children}</div>;
}
