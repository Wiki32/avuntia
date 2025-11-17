import { navigate } from "../router.js";
import { createEl, html, setPageTitle } from "../utils/dom.js";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "../utils/format.js";
import { showToast } from "../utils/toast.js";
import {
  getAdminCompanies,
  registerAdminCompany,
  getAdminSession,
  setAdminSessionLoggedIn,
  clearAdminSession
} from "../state.js";

const STAGES = [
  { id: "prospect", label: "Prospecto", description: "Detectado por ventas" },
  { id: "due-diligence", label: "Due diligence", description: "Legal/seguridad revisando" },
  { id: "pilot", label: "Piloto activo", description: "Entorno de pruebas conectado" },
  { id: "activo", label: "Producción", description: "OAuth desplegado" }
];

const STAGE_STYLES = {
  prospect: { bg: "rgba(255, 149, 5, 0.12)", color: "#c46a00" },
  "due-diligence": { bg: "rgba(245, 203, 92, 0.22)", color: "#8a6d00" },
  pilot: { bg: "rgba(32, 73, 255, 0.12)", color: "#2049ff" },
  activo: { bg: "rgba(0, 184, 148, 0.15)", color: "#009c7b" }
};

const ADMIN_PASSCODE = "invest facility-2025";

const oauthRoutes = {
  "/oauth": renderOauthConsole
};

export function getOauthRoutes() {
  return oauthRoutes;
}

function renderOauthConsole() {
  const session = getAdminSession();
  if (!session?.isLogged) {
    return buildLoginSection();
  }
  setPageTitle("Console OAuth · Administración");
  const wrapper = createEl("div");
  const companies = getAdminCompanies();
  const metrics = buildMetrics(companies);

  wrapper.append(buildSessionBanner(session));
  wrapper.append(buildSummarySection(metrics));
  wrapper.append(buildRegistrationSection());
  wrapper.append(buildCompaniesSection(companies));

  return wrapper;
}

function buildLoginSection() {
  setPageTitle("Acceso restringido · Consola OAuth");
  const wrapper = createEl("section", { className: "card", style: "max-width:420px;margin:auto;" });
  wrapper.append(
    html`<span class="badge stack">
        Panel interno
        <small>Sólo personal autorizado</small>
      </span>
      <h1>Iniciar sesión en la consola OAuth</h1>
      <p class="subtitle">
        Introduce la contraseña compartida del piloto para desbloquear la gestión de compañías conectadas a Invest Facility via
        OAuth.
      </p>
      <form id="oauth-login-form">
        <label for="oauth-pass">Contraseña</label>
        <input id="oauth-pass" type="password" required placeholder="••••••••" autocomplete="current-password" />
        <p class="helper-text">La sesión se mantiene en esta pestaña mientras el navegador permanezca abierto.</p>
        <div class="form-actions" style="justify-content:flex-start;">
          <button class="button" type="submit">Acceder</button>
        </div>
      </form>`
  );

  wrapper.querySelector("#oauth-login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = wrapper.querySelector("#oauth-pass");
    const value = input?.value ?? "";
    if (value !== ADMIN_PASSCODE) {
      showToast("Contraseña incorrecta.", { type: "error" });
      input?.focus();
      input?.select();
      return;
    }
    setAdminSessionLoggedIn();
    showToast("Sesión administrativa iniciada.");
    navigate("/oauth");
  });

  return wrapper;
}

function buildSummarySection(metrics) {
  const section = createEl("section", { className: "card" });
  const stageList = metrics.stageBreakdown
    .map(
      (stage) => `<li>
        <strong>${stage.label}</strong> · ${stage.value} empresas
        <span class="muted">${stage.description}</span>
      </li>`
    )
    .join("");

  const latestList = metrics.latest.length
    ? metrics.latest
        .map(
          (company) => `<li>
              <strong>${company.name}</strong>
              <span class="muted">${formatDate(company.createdAt)} · ${formatPercent(company.adoption)}</span>
            </li>`
        )
        .join("")
    : `<li class="muted">Aún no hay altas en esta sesión.</li>`;

  section.append(
    html`<span class="badge stack">
        Uso interno
        <small>OAuth y pilotos B2B</small>
      </span>
      <h1>Consola de empresas conectadas</h1>
      <p class="subtitle">
        Registra nuevas compañías, controla sus etapas de due diligence y supervisa el potencial mensual agregado del
        piloto.
      </p>
      <div
        class="grid"
        style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:1.5rem;"
      >
        ${buildStatCard("Empresas registradas", formatNumber(metrics.totalCompanies))}
        ${buildStatCard("Contribución proyectada", formatCurrency(metrics.projectedMonthly))}
        ${buildStatCard("Headcount cubierto", formatNumber(metrics.totalHeadcount))}
        ${buildStatCard("Adopción media", formatPercent(metrics.avgAdoption || 0))}
        ${buildStatCard("Ticket medio", formatCurrency(metrics.avgTicket || 0))}
        ${buildStatCard("Listas para piloto", `${metrics.readyForPilot}/${formatNumber(metrics.totalCompanies)}`)}
      </div>
      <div class="grid two">
        <div class="card">
          <h3>Pipeline por etapa</h3>
          <ul class="list-clean">
            ${stageList}
          </ul>
        </div>
        <div class="card">
          <h3>Últimas altas</h3>
          <ul class="list-clean">
            ${latestList}
          </ul>
        </div>
      </div>`
  );

  return section;
}

function buildRegistrationSection() {
  const section = createEl("section", { className: "section card" });
  section.append(
    html`<h2>Registrar nueva empresa</h2>
      <p class="subtitle">
        Completa la ficha para generar credenciales OAuth simuladas y añadirla al pipeline. El cálculo de contribución se
        estima a partir del headcount, la adopción esperada y el ticket medio mensual.
      </p>
      <form id="oauth-company-form" autocomplete="off">
        <div class="form-row">
          <div>
            <label for="company-name">Nombre legal</label>
            <input id="company-name" name="name" type="text" required placeholder="Empresa S.A." />
          </div>
          <div>
            <label for="company-sector">Sector</label>
            <input id="company-sector" name="sector" type="text" placeholder="Tecnología, retail..." />
          </div>
        </div>
        <div class="form-row">
          <div>
            <label for="company-country">País</label>
            <input id="company-country" name="country" type="text" value="España" />
          </div>
          <div>
            <label for="company-payroll">Payroll / HRIS</label>
            <input id="company-payroll" name="payrollSystem" type="text" placeholder="Workday, Meta4, Factorial..." />
          </div>
        </div>
        <div class="form-row">
          <div>
            <label for="company-headcount">Headcount elegible</label>
            <input id="company-headcount" name="headcount" type="number" min="0" value="250" required />
          </div>
          <div>
            <label for="company-adoption">Adopción esperada (%)</label>
            <input id="company-adoption" name="adoption" type="number" min="0" max="100" value="35" required />
          </div>
          <div>
            <label for="company-ticket">Ticket medio mensual (€)</label>
            <input id="company-ticket" name="avgTicket" type="number" min="0" value="90" required />
          </div>
        </div>
        <div class="form-row">
          <div>
            <label for="company-stage">Etapa actual</label>
            <select id="company-stage" name="stage">
              ${STAGES.map((stage) => `<option value="${stage.id}">${stage.label}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="company-contact">Contacto principal</label>
            <input id="company-contact" name="contact" type="email" placeholder="rrhh@empresa.com" />
          </div>
        </div>
        <div>
          <label for="company-notes">Notas internas</label>
          <textarea id="company-notes" name="notes" rows="3" placeholder="Enlace al checklist, riesgos detectados..."></textarea>
          <p class="helper-text">La información se almacena en localStorage para efectos de demo.</p>
        </div>
        <div class="form-actions">
          <button class="button ghost small" type="reset">Limpiar</button>
          <button class="button small" type="submit">Guardar empresa</button>
        </div>
      </form>`
  );

  const form = section.querySelector("#oauth-company-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    registerAdminCompany({
      name: formData.get("name"),
      sector: formData.get("sector"),
      country: formData.get("country"),
      payrollSystem: formData.get("payrollSystem"),
      headcount: formData.get("headcount"),
      adoption: formData.get("adoption"),
      avgTicket: formData.get("avgTicket"),
      stage: formData.get("stage"),
      contact: formData.get("contact"),
      notes: formData.get("notes")
    });
    showToast("Empresa registrada en la consola OAuth.");
    form.reset();
    form.querySelector("input")?.focus();
    navigate("/oauth");
  });

  return section;
}

function buildCompaniesSection(companies) {
  const section = createEl("section", { className: "section card" });
  section.append(html`<h2>Empresas y estado del acceso</h2>`);
  if (!companies.length) {
    section.append(html`<p class="muted">Aún no hay compañías registradas. Añade la primera desde el formulario.</p>`);
    return section;
  }
  const sorted = [...companies].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
  section.append(
    html`<div class="table-wrapper compact">
      <table aria-label="Empresas conectadas mediante OAuth">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Headcount</th>
            <th>Adopción</th>
            <th>Ticket medio</th>
            <th>Contribución proyectada</th>
            <th>Etapa</th>
            <th>Contacto</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((company) => buildCompanyRow(company)).join("")}
        </tbody>
      </table>
    </div>`
  );
  return section;
}

function buildCompanyRow(company) {
  const stage = STAGES.find((item) => item.id === company.stage) ?? STAGES[0];
  const colors = STAGE_STYLES[stage.id] ?? { bg: "rgba(32,73,255,0.12)", color: "#2049ff" };
  return `<tr>
    <td>
      <strong>${company.name}</strong>
      <p class="muted">${company.sector ?? "General"} · ${company.country ?? "—"}</p>
      <p class="muted">Alta: ${formatDate(company.createdAt)}</p>
    </td>
    <td>${formatNumber(company.headcount || 0)}</td>
    <td>${formatPercent(company.adoption || 0)}</td>
    <td>${formatCurrency(company.avgTicket || 0)}</td>
    <td>${formatCurrency(company.monthlyContribution || 0)}</td>
    <td><span class="tag" style="background:${colors.bg};color:${colors.color};">${stage.label}</span></td>
    <td>
      ${
        company.contact
          ? `<a href="mailto:${company.contact}">${company.contact}</a>`
          : '<span class="muted">Sin contacto</span>'
      }
      <p class="muted">Payroll: ${company.payrollSystem ?? "Sin especificar"}</p>
    </td>
  </tr>`;
}

function buildStatCard(label, value) {
  return `<div class="card" style="padding:1rem 1.25rem;">
    <p class="muted" style="margin-bottom:0.25rem;">${label}</p>
    <strong style="font-size:1.5rem;">${value}</strong>
  </div>`;
}

function buildMetrics(companies) {
  const totalCompanies = companies.length;
  const totalHeadcount = companies.reduce((sum, company) => sum + (Number(company.headcount) || 0), 0);
  const projectedMonthly = companies.reduce(
    (sum, company) => sum + (Number(company.monthlyContribution) || 0),
    0
  );
  const avgAdoption = totalCompanies
    ? Math.round(companies.reduce((sum, company) => sum + (Number(company.adoption) || 0), 0) / totalCompanies)
    : 0;
  const avgTicket = totalCompanies
    ? Math.round(companies.reduce((sum, company) => sum + (Number(company.avgTicket) || 0), 0) / totalCompanies)
    : 0;
  const readyForPilot = companies.filter((company) => ["pilot", "activo"].includes(company.stage)).length;
  const stageBreakdown = STAGES.map((stage) => ({
    ...stage,
    value: companies.filter((company) => (company.stage ?? "prospect") === stage.id).length
  }));
  const latest = [...companies]
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, 4);

  return {
    totalCompanies,
    totalHeadcount,
    projectedMonthly,
    avgAdoption,
    avgTicket,
    readyForPilot,
    stageBreakdown,
    latest
  };
}

function toTimestamp(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildSessionBanner(session) {
  const badge = session?.lastLogin ? `Último acceso: ${formatDate(session.lastLogin)}` : "Sesión activa";
  const container = createEl("section", { className: "card", style: "margin-bottom:1.5rem;" });
  container.append(
    html`<div class="grid two" style="align-items:center;">
      <div>
        <span class="badge">${badge}</span>
        <h2>Panel interno Invest Facility</h2>
        <p class="subtitle">
          Estás autenticado para gestionar compañías y sus credenciales OAuth simuladas dentro del piloto.
        </p>
      </div>
      <div class="table-actions" style="justify-content:flex-end;">
        <button class="button ghost small" type="button" data-action="logout">Cerrar sesión</button>
      </div>
    </div>`
  );
  container.querySelector("[data-action=\"logout\"]").addEventListener("click", () => {
    clearAdminSession();
    showToast("Sesión cerrada.");
    navigate("/oauth");
  });
  return container;
}
