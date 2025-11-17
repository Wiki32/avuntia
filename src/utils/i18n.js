import { getLanguage, SUPPORTED_LANGUAGES } from "../state.js";
import { siteCopy } from "../i18n/site.js";
import { translations } from "../i18n/dictionary.js";

const FALLBACK_LANGUAGE = "es";
const TRANSLATION_CACHE_KEY = "invest facility-translation-cache";
const TRANSLATION_ENDPOINT = "https://lingva.ml/api/v1";

function resolveLanguage(language = getLanguage()) {
  if (SUPPORTED_LANGUAGES.includes(language)) {
    return language;
  }
  return FALLBACK_LANGUAGE;
}

function selectCopy(source, language) {
  const lang = resolveLanguage(language);
  return source[lang] ?? source[FALLBACK_LANGUAGE];
}

export function getSiteCopy(language) {
  return selectCopy(siteCopy, language);
}

function getDictionaryValue(key, language) {
  const entry = translations[key];
  if (!entry) return undefined;
  return entry[language] ?? entry[FALLBACK_LANGUAGE];
}

function getNestedValue(object, path) {
  return path.split(".").reduce((acc, segment) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, segment)) {
      return acc[segment];
    }
    return undefined;
  }, object);
}

function parseParams(element) {
  const raw = element.dataset?.i18nParams;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("No se pudieron parsear los parámetros de traducción", element, error);
  }
  return {};
}

function formatTranslation(value, params) {
  if (!value || typeof value !== "string") return value;
  if (!params || Object.keys(params).length === 0) return value;
  return value.replace(/\{(\w+)\}/g, (_, key) => {
    if (params[key] == null) return "";
    return String(params[key]);
  });
}

function resolveTranslation(key, language, site) {
  let value = getNestedValue(site, key);
  if (value == null) {
    value = getDictionaryValue(key, language);
  }
  return value;
}

const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();
const translationCache = new Map();
const persistentCache = loadPersistentCache();
const dirtyLanguages = new Set();
let cacheSaveTimeout = null;
const TRANSLATABLE_ATTRS = ["placeholder", "aria-label", "title"];
const preloadTasks = new Map();

export function applyTranslations(root = document, language) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  const lang = resolveLanguage(language);
  const site = getSiteCopy(lang);

  const elements = Array.from(root.querySelectorAll("[data-i18n-key]"));
  if (root instanceof Element && root.dataset?.i18nKey) {
    elements.unshift(root);
  }
  elements.forEach((element) => {
    const key = element.dataset.i18nKey;
    if (!key) return;
    const translation = resolveTranslation(key, lang, site);
    if (translation == null) return;
    const params = parseParams(element);
    const formatted = formatTranslation(translation, params);
    const format = element.dataset.i18nFormat ?? "text";
    if (format === "html") {
      element.innerHTML = formatted;
    } else {
      element.textContent = formatted;
    }
  });

  const attrElements = Array.from(root.querySelectorAll("[data-i18n-attr]"));
  if (root instanceof Element && root.dataset?.i18nAttr) {
    attrElements.unshift(root);
  }
  attrElements.forEach((element) => {
    const mappings = element.dataset.i18nAttr;
    if (!mappings) return;
    mappings.split(",").forEach((mapping) => {
      const [attr, key] = mapping.split(":").map((part) => part.trim());
      if (!attr || !key) return;
      const translation = resolveTranslation(key, lang, site);
      if (translation == null) return;
      const params = parseParams(element);
      const formatted = formatTranslation(translation, params);
      element.setAttribute(attr, formatted);
    });
  });

  return autoTranslateTextNodes(root, lang);
}

export function translate(key, { params = {}, language } = {}) {
  const lang = resolveLanguage(language);
  const site = getSiteCopy(lang);
  const value = resolveTranslation(key, lang, site);
  if (value == null) {
    return "";
  }
  return formatTranslation(value, params);
}

export function preloadTranslations(language, root = document) {
  const lang = resolveLanguage(language);
  if (lang === FALLBACK_LANGUAGE) {
    return Promise.resolve();
  }
  const existingTask = preloadTasks.get(lang);
  if (existingTask) {
    return existingTask;
  }
  const task = (async () => {
    if (!root || typeof root.querySelectorAll !== "function") return;
    const nodes = captureOriginalTexts(root);
    const attributeEntries = captureOriginalAttributes(root);
    if (nodes.length === 0 && attributeEntries.length === 0) return;
    const cache = getLanguageCache(lang);
    const uniqueValues = new Set();
    nodes.forEach((node) => {
      const original = originalTextNodes.get(node);
      if (typeof original === "string" && original.trim().length > 0) {
        uniqueValues.add(original);
      }
    });
    attributeEntries.forEach(({ element, attr }) => {
      const stored = originalAttributes.get(element);
      const original = stored?.[attr] ?? element.getAttribute(attr) ?? "";
      if (typeof original === "string" && original.trim().length > 0) {
        uniqueValues.add(original);
      }
    });
    const valuesList = Array.from(uniqueValues);
    const valuesToTranslate = valuesList.filter((text) => !cache.has(text));
    if (valuesToTranslate.length === 0) return;
    try {
      const translationsList = await requestTranslations(valuesToTranslate, lang);
      translationsList.forEach((translated, index) => {
        const source = valuesToTranslate[index];
        if (typeof translated === "string" && translated.trim().length > 0) {
          cache.set(source, translated);
        }
      });
      if (translationsList.length > 0) {
        scheduleCacheSave(lang);
      }
    } catch (error) {
      console.warn("No se pudo precargar la traducción", error);
    }
  })()
    .finally(() => {
      preloadTasks.delete(lang);
    });
  preloadTasks.set(lang, task);
  return task;
}

function loadPersistentCache() {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    const stored = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("No se pudo cargar la caché de traducciones", error);
  }
  return {};
}

function scheduleCacheSave(language) {
  if (typeof localStorage === "undefined") {
    return;
  }
  dirtyLanguages.add(language);
  if (cacheSaveTimeout) return;
  const scheduler = typeof window !== "undefined" && typeof window.setTimeout === "function" ? window.setTimeout.bind(window) : setTimeout;
  cacheSaveTimeout = scheduler(() => {
    const snapshot = { ...persistentCache };
    dirtyLanguages.forEach((lang) => {
      const map = translationCache.get(lang);
      snapshot[lang] = map ? Object.fromEntries(map.entries()) : {};
    });
    try {
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(snapshot));
      Object.assign(persistentCache, snapshot);
    } catch (error) {
      console.warn("No se pudo guardar la caché de traducciones", error);
    }
    dirtyLanguages.clear();
    cacheSaveTimeout = null;
  }, 400);
}

function getLanguageCache(language) {
  if (!translationCache.has(language)) {
    const initial = persistentCache?.[language] ?? {};
    translationCache.set(language, new Map(Object.entries(initial)));
  }
  return translationCache.get(language);
}

function getTranslatableTextNodes(root) {
  if (typeof document === "undefined" || !root) {
    return [];
  }
  const nodes = [];
  const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node) return NodeFilter.FILTER_REJECT;
      if (!node.parentElement) return NodeFilter.FILTER_REJECT;
      if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
      const text = node.textContent ?? "";
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      if (!/[A-Za-zÀ-ÿ]/.test(text)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let current = treeWalker.nextNode();
  while (current) {
    nodes.push(current);
    current = treeWalker.nextNode();
  }
  return nodes;
}

function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  const tagName = parent.tagName;
  if (["SCRIPT", "STYLE", "CODE", "PRE", "NOSCRIPT", "TITLE", "OPTION"].includes(tagName)) {
    return true;
  }
  if (parent.closest("[data-i18n-ignore]") != null) {
    return true;
  }
  if (parent.closest("[data-i18n-key]") != null) {
    return true;
  }
  return false;
}

function captureOriginalTexts(root) {
  if (!root) return [];
  const nodes = getTranslatableTextNodes(root);
  nodes.forEach((node) => {
    if (!originalTextNodes.has(node)) {
      originalTextNodes.set(node, node.textContent ?? "");
    }
  });
  return nodes;
}

function captureOriginalAttributes(root) {
  if (!root || typeof root.querySelectorAll !== "function" || TRANSLATABLE_ATTRS.length === 0) {
    return [];
  }
  const selector = TRANSLATABLE_ATTRS.map((attr) => `[${attr}]`).join(",");
  if (!selector) return [];
  const elements = Array.from(root.querySelectorAll(selector));
  const entries = [];
  elements.forEach((element) => {
    if (shouldSkipAttributeElement(element)) return;
    let stored = originalAttributes.get(element);
    let storedUpdated = false;
    if (!stored) {
      stored = {};
    }
    TRANSLATABLE_ATTRS.forEach((attr) => {
      if (!element.hasAttribute(attr)) return;
      const value = element.getAttribute(attr) ?? "";
      if (!value.trim() || !/[A-Za-zÀ-ÿ]/.test(value)) return;
      if (stored[attr] == null) {
        stored[attr] = value;
        storedUpdated = true;
      }
      entries.push({ element, attr });
    });
    if (storedUpdated || Object.keys(stored).length > 0) {
      originalAttributes.set(element, stored);
    }
  });
  return entries;
}

function shouldSkipAttributeElement(element) {
  if (!element) return true;
  if (element.closest("[data-i18n-ignore]")) return true;
  if (element.hasAttribute("data-i18n-attr")) return true;
  return false;
}

async function autoTranslateTextNodes(root, language) {
  const nodes = captureOriginalTexts(root);
  const attributeEntries = captureOriginalAttributes(root);
  if (nodes.length === 0 && attributeEntries.length === 0) return;
  if (language === FALLBACK_LANGUAGE) {
    nodes.forEach((node) => {
      const original = originalTextNodes.get(node);
      if (typeof original === "string") {
        node.textContent = original;
      }
    });
    attributeEntries.forEach(({ element, attr }) => {
      const stored = originalAttributes.get(element);
      if (stored && typeof stored[attr] === "string") {
        element.setAttribute(attr, stored[attr]);
      }
    });
    return;
  }

  const cache = getLanguageCache(language);
  const uniqueValues = new Set();
  nodes.forEach((node) => {
    const original = originalTextNodes.get(node);
    if (typeof original === "string" && original.trim().length > 0) {
      uniqueValues.add(original);
    }
  });
  attributeEntries.forEach(({ element, attr }) => {
    const stored = originalAttributes.get(element);
    const original = stored?.[attr];
    if (typeof original === "string" && original.trim().length > 0) {
      uniqueValues.add(original);
    }
  });
  const valuesList = Array.from(uniqueValues);
  const valuesToTranslate = valuesList.filter((text) => !cache.has(text));
  if (valuesToTranslate.length > 0) {
    try {
      const translationsList = await requestTranslations(valuesToTranslate, language);
      translationsList.forEach((translated, index) => {
        const source = valuesToTranslate[index];
        if (typeof translated === "string" && translated.trim().length > 0) {
          cache.set(source, translated);
        }
      });
      if (translationsList.length > 0) {
        scheduleCacheSave(language);
      }
    } catch (error) {
      console.warn("No se pudo traducir automáticamente", error);
    }
  }

  nodes.forEach((node) => {
    const original = originalTextNodes.get(node);
    if (original == null) return;
    const translated = cache.get(original);
    if (typeof translated === "string" && translated.trim().length > 0) {
      node.textContent = translated;
    }
  });
  attributeEntries.forEach(({ element, attr }) => {
    const stored = originalAttributes.get(element);
    const original = stored?.[attr];
    if (!original) return;
    const translated = cache.get(original);
    if (typeof translated === "string" && translated.trim().length > 0) {
      element.setAttribute(attr, translated);
    }
  });
}

async function requestTranslations(texts, language) {
  if (texts.length === 0) return [];
  if (typeof fetch !== "function") {
    return texts.map(() => "");
  }
  const results = [];
  const chunkSize = 5;
  for (let i = 0; i < texts.length; i += chunkSize) {
    const batch = texts.slice(i, i + chunkSize);
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        try {
          const url = `${TRANSLATION_ENDPOINT}/${FALLBACK_LANGUAGE}/${language}/${encodeURIComponent(text)}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          if (data && typeof data === "object" && typeof data.translation === "string") {
            return data.translation;
          }
        } catch (error) {
          console.warn("Error al solicitar traducción", error);
        }
        return "";
      })
    );
    results.push(...batchResults);
  }
  return results;
}
