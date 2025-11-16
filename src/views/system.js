import { createEl } from "../utils/dom.js";
import { setPageTitle } from "../utils/dom.js";

export function buildNotFound() {
  setPageTitle("404");
  const container = createEl("section", { className: "card" });
  container.append(
    createEl("h1", { text: "404 · Página no encontrada" }),
    createEl("p", {
      text: "La ruta solicitada no existe. Usa el menú para volver a una sección disponible."
    })
  );
  return container;
}

export function buildMaintenance() {
  setPageTitle("Mantenimiento");
  const container = createEl("section", { className: "card" });
  container.append(
    createEl("h1", { text: "Ventana de mantenimiento" }),
    createEl("p", {
      text: "La plataforma está en una ventana de mantenimiento planificada. Vuelve a intentarlo más tarde."
    })
  );
  return container;
}
