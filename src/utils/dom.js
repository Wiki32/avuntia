import { navigate } from "../router.js";
import { getSiteCopy } from "./i18n.js";

export function html(strings, ...values) {
  const template = document.createElement("template");
  template.innerHTML = String.raw({ raw: strings }, ...values);
  return template.content;
}

export function createEl(tagName, options = {}) {
  const el = document.createElement(tagName);
  Object.entries(options).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === "className") {
      el.className = value;
    } else if (key === "text") {
      el.textContent = value;
    } else if (key === "html") {
      el.innerHTML = value;
    } else if (key === "dataset") {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        el.dataset[dataKey] = dataValue;
      });
    } else if (key in el) {
      el[key] = value;
    } else {
      el.setAttribute(key, value);
    }
  });
  return el;
}

export function bindInternalLinks(container) {
  container.querySelectorAll("a[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.defaultPrevented) return;
      event.preventDefault();
      const target = event.currentTarget;
      const href = target.getAttribute("href");
      if (!href) return;
      navigate(href);
    });
  });
}

export function setPageTitle(title) {
  const site = getSiteCopy();
  const prefix = site.documentTitle?.prefix ?? "Invest Facility";
  const separator = site.documentTitle?.separator ?? " · ";
  const base = site.documentTitle?.base ?? `${prefix}${separator}Plataforma`;
  if (!title) {
    document.title = base;
    return;
  }
  document.title = `${prefix}${separator}${title}`;
}

export function empty(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function smoothScrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
