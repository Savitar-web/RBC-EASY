var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/components/BackNavigation.tsx
var BackNavigation_exports = {};
__export(BackNavigation_exports, {
  default: () => BackNavigation,
  parentPage: () => parentPage
});
module.exports = __toCommonJS(BackNavigation_exports);
var import_react = require("react");
var import_react_router_dom = require("react-router-dom");

// mock:native
var isNativeAndroid = () => false;
var nativeShortcuts = {};

// src/components/BackNavigation.tsx
function parentPage(path) {
  if (/^\/(perfil|publicacion)\//i.test(path)) return "/explorar";
  if (["/modo-ascendido", "/conversion", "/balistica"].includes(path.toLowerCase())) return "/calcular";
  if (path.toLowerCase() === "/proyectos") return "/";
  return path === "/" ? null : "/proyectos";
}
function closeTopDialog() {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).filter((d) => d.getClientRects().length);
  const dialog = dialogs.at(-1);
  if (!dialog) return false;
  const close = Array.from(dialog.querySelectorAll("button")).find((b) => !b.disabled && (/cerrar|cancelar/i.test(b.getAttribute("aria-label") || "") || /^[×✕✖]$/.test(b.textContent?.trim() || "") || b.textContent?.trim() === "Cancelar"));
  if (close) {
    close.click();
    return true;
  }
  return true;
}
function BackNavigation() {
  const location = (0, import_react_router_dom.useLocation)(), navigate = (0, import_react_router_dom.useNavigate)(), current = (0, import_react.useRef)(location), backIndex = (0, import_react.useRef)(Number(history.state?.idx) || 0);
  current.current = location;
  (0, import_react.useEffect)(() => {
    if (!isNativeAndroid() && Number(history.state?.idx || 0) === 0 && location.pathname !== "/") {
      const state = history.state, chain = [];
      let path = location.pathname;
      while (path !== null) {
        chain.unshift(path);
        path = parentPage(path);
      }
      chain.forEach((path2, index) => {
        const url = index === chain.length - 1 ? location.pathname + location.search + location.hash : path2;
        const next = { ...state, idx: index };
        if (index === 0) history.replaceState(next, "", url);
        else history.pushState(next, "", url);
      });
    }
    backIndex.current = Number(history.state?.idx) || 0;
  }, [location.key]);
  (0, import_react.useEffect)(() => {
    const go = () => {
      if (closeTopDialog()) return;
      const parent = parentPage(current.current.pathname);
      if (parent) navigate(parent, { replace: true });
      else if (isNativeAndroid()) void nativeShortcuts.background();
    };
    const native = nativeShortcuts;
    const listener = isNativeAndroid() ? native.addListener("backButton", go) : null;
    const pop = (event) => {
      const index = Number(event.state?.idx) || 0;
      if (index >= backIndex.current) return;
      const before = current.current, modal = closeTopDialog(), parent = parentPage(before.pathname);
      if (!modal && !parent) return;
      event.stopImmediatePropagation();
      if (modal) {
        history.pushState({ ...event.state, idx: index + 1 }, "", before.pathname + before.search + before.hash);
        backIndex.current = index + 1;
      } else {
        backIndex.current = index;
        navigate(parent, { replace: true });
      }
    };
    window.addEventListener("popstate", pop, true);
    window.addEventListener("rbc-back", go);
    return () => {
      window.removeEventListener("popstate", pop, true);
      window.removeEventListener("rbc-back", go);
      void listener?.then((h) => h.remove());
    };
  }, [navigate]);
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parentPage
});
