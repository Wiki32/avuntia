const routes = new Map();
let notFoundRoute = null;
let currentPath = "/";
let rootElement = null;

export function setRoot(element) {
  rootElement = element;
}

export function registerRoute(path, renderFn) {
  routes.set(path, renderFn);
}

export function registerRoutes(map) {
  Object.entries(map).forEach(([path, handler]) => registerRoute(path, handler));
}

export function registerNotFound(renderFn) {
  notFoundRoute = renderFn;
}

export function navigate(path, { replace = false } = {}) {
  const targetPath = normalizePathname(path);
  if (targetPath === currentPath) {
    render(targetPath);
    return;
  }
  currentPath = targetPath;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", targetPath);
  render(targetPath);
}

function matchRoute(pathname) {
  if (routes.has(pathname)) {
    return { handler: routes.get(pathname), params: {} };
  }

  for (const [routePath, handler] of routes.entries()) {
    const { regexp, keys } = compilePath(routePath);
    const match = pathname.match(regexp);
    if (match) {
      const params = {};
      keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });
      return { handler, params };
    }
  }

  return null;
}

export function render(pathname = window.location.pathname) {
  if (!rootElement) {
    throw new Error("Root element not set for router");
  }

  const normalizedPath = normalizePathname(pathname);
  currentPath = normalizedPath;
  const match = matchRoute(normalizedPath);

  if (!match) {
    if (!notFoundRoute) throw new Error("Not found route not registered");
    rootElement.innerHTML = "";
    rootElement.appendChild(notFoundRoute({ pathname: normalizedPath }));
    rootElement.focus();
    notifyNavigation(normalizedPath);
    return;
  }

  const result = match.handler({ params: match.params, pathname: normalizedPath });
  rootElement.innerHTML = "";
  rootElement.appendChild(result);
  rootElement.focus();
  notifyNavigation(normalizedPath);
}

function compilePath(path) {
  const keys = [];
  const pattern = path
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        keys.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regexp: new RegExp(`^${pattern}$`), keys };
}

function notifyNavigation(pathname) {
  window.dispatchEvent(
    new CustomEvent("avuntia:navigate", {
      detail: { pathname }
    })
  );
}

function normalizePathname(path) {
  if (!path) return "/";
  let normalized = path;
  const indexSuffix = "/index.html";
  if (normalized.endsWith(indexSuffix)) {
    normalized = normalized.slice(0, -indexSuffix.length);
  }
  normalized = normalized.replace(/\/+$/, "");
  if (normalized === "" || normalized === "/") {
    return "/";
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
