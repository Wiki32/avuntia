import { initState, getLanguage, setLanguage, SUPPORTED_LANGUAGES } from "./state.js";
import { render, setRoot, navigate, getBasePath } from "./router.js";
import { registerAllRoutes } from "./views/register.js";
import { applyTranslations, preloadTranslations } from "./utils/i18n.js";

initState();

const appRoot = document.getElementById("app");
setRoot(appRoot);

registerAllRoutes();
const basePath = getBasePath();
let translationDepth = 0;

const initialPath = window.location.pathname;
const normalizedInitialPath = normalizePath(initialPath);
const shouldRedirectToHome = normalizedInitialPath === "/";

if (shouldRedirectToHome) {
  navigate("/home", { replace: true });
} else {
  render(normalizedInitialPath);
}

applyBasePathToLinks();
setupGlobalInteractions();
setCurrentYear();
beginTranslation();
Promise.resolve(applyTranslations(document, getLanguage()))
  .catch((error) => {
    console.warn("No se pudo aplicar la traducción inicial", error);
  })
  .finally(() => {
    endTranslation();
    preloadRemainingLanguages(getLanguage());
  });
syncLanguageSelector(getLanguage());

const startingPath = shouldRedirectToHome ? "/home" : normalizedInitialPath;
highlightActiveNav(startingPath);
window.addEventListener("avuntia:navigate", async (event) => {
  const pathname = normalizePath(event.detail?.pathname ?? window.location.pathname);
  highlightActiveNav(pathname);
  beginTranslation();
  try {
    await applyTranslations(appRoot, getLanguage());
  } catch (error) {
    console.warn("No se pudo aplicar la traducción tras la navegación", error);
  } finally {
    endTranslation();
  }
  preloadRemainingLanguages(getLanguage());
});

window.addEventListener("popstate", () => {
  render(window.location.pathname);
});

window.addEventListener("avuntia:language-change", async (event) => {
  const language = event.detail?.language ?? getLanguage();
  syncLanguageSelector(language);
  beginTranslation();
  try {
    await applyTranslations(document, language);
  } catch (error) {
    console.warn("No se pudo aplicar la traducción al cambiar de idioma", error);
  } finally {
    endTranslation();
  }
  const currentPath = normalizePath(window.location.pathname);
  render(currentPath);
  highlightActiveNav(currentPath);
  preloadRemainingLanguages(language);
});

function setupGlobalInteractions() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("a[data-link]");
    if (!target) return;
    if (event.metaKey || event.ctrlKey || event.defaultPrevented) return;
    const hrefAttribute = target.getAttribute("href");
    if (!hrefAttribute) return;
    const normalizedHref = normalizePath(hrefAttribute);
    const destination = normalizedHref === "/" ? "/home" : normalizedHref;
    event.preventDefault();
    document.querySelector(".menu")?.classList.remove("open");
    document.querySelector(".nav-toggle")?.setAttribute("aria-expanded", "false");
    navigate(destination);
  });

  const navToggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".menu");
  if (navToggle && menu) {
    navToggle.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        menu.querySelector("a")?.focus();
      }
    });
  }

  const languageSelector = document.getElementById("language-selector");
  const languagePicker = languageSelector?.closest(".language-picker");
  if (languageSelector && languagePicker) {
    languageSelector.addEventListener("change", () => {
      const selected = languageSelector.value;
      const normalized = setLanguage(selected);
      syncLanguageSelector(normalized);
      preloadRemainingLanguages(normalized);
    });
    languagePicker.addEventListener("click", (event) => {
      if (event.target === languageSelector) return;
      languageSelector.focus({ preventScroll: true });
      if (typeof languageSelector.showPicker === "function") {
        languageSelector.showPicker();
      } else {
        languageSelector.click();
      }
    });
  }
}

function applyBasePathToLinks() {
  if (basePath === "/") return;
  document.querySelectorAll("a[data-link]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    const normalizedHref = normalizePath(href);
    const resolvedHref = buildHrefWithBase(normalizedHref);
    if (resolvedHref && href !== resolvedHref) {
      link.setAttribute("href", resolvedHref);
    }
  });
}

function buildHrefWithBase(path) {
  if (!path) return "/";
  if (basePath === "/" || basePath === "") {
    return path;
  }
  if (path === "/") {
    return `${basePath}/`;
  }
  return `${basePath}${path}`;
}

function setCurrentYear() {
  const yearElement = document.querySelector("[data-current-year]");
  if (!yearElement) return;
  yearElement.textContent = new Date().getFullYear();
}

function highlightActiveNav(pathname) {
  const normalizedPath = normalizePath(pathname);
  document.querySelectorAll(".menu a[data-link]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    const normalizedHref = normalizePath(href);
    const isRoot = normalizedHref === "/";
    const isActive =
      (isRoot && normalizedPath === "/") ||
      (isRoot && normalizedPath === "/home") ||
      normalizedPath === normalizedHref ||
      normalizedPath.startsWith(`${normalizedHref}/`);
    link.classList.toggle("active", isActive);
  });
}

function normalizePath(path) {
  if (!path) return "/";
  let normalized = path;
  try {
    normalized = new URL(path, window.location.origin).pathname;
  } catch {
    normalized = String(path);
  }
  if (normalized.endsWith("/index.html")) {
    normalized = normalized.slice(0, -"/index.html".length);
  }
  normalized = normalized.replace(/\/+$/, "");
  const base = basePath === "/" ? "" : basePath;
  if (base && normalized.startsWith(base)) {
    normalized = normalized.slice(base.length) || "/";
  }
  if (normalized === "" || normalized === "/") {
    return "/";
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function syncLanguageSelector(language) {
  const selector = document.getElementById("language-selector");
  const picker = selector?.closest(".language-picker");
  if (!selector || !picker) return;
  if (selector.value !== language) {
    selector.value = language;
  }
  picker.setAttribute("data-language", language);
}

function preloadRemainingLanguages(currentLanguage) {
  SUPPORTED_LANGUAGES.filter((language) => language !== currentLanguage).forEach((language) => {
    preloadTranslations(language).catch((error) => {
      console.warn(`No se pudo precargar la traducción para ${language}`, error);
    });
  });
}

function beginTranslation() {
  translationDepth += 1;
  if (translationDepth === 1) {
    setTranslating(true);
  }
}

function endTranslation() {
  if (translationDepth === 0) {
    return;
  }
  translationDepth -= 1;
  if (translationDepth === 0) {
    setTranslating(false);
  }
}

function setTranslating(active) {
  if (!appRoot) return;
  if (active) {
    appRoot.setAttribute("data-translating", "true");
  } else {
    appRoot.removeAttribute("data-translating");
  }
}
