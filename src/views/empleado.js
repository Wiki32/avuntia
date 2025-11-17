import { navigate } from "../router.js";
import { createEl, html, setPageTitle } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";
import { renderLineChart } from "../utils/charts.js";
import {
  getState,
  getEmployeePortal,
  updateEmployeePortal,
  resetPilotState,
  getEmployeeSession,
  setEmployeeSessionLoggedIn
} from "../state.js";
import { formatCurrency, formatDate } from "../utils/format.js";
import { openSimplePdf } from "../utils/pdf.js";

const empleadoRoutes = {
  "/empleado": renderEmployeeHome,
  "/empleado/acceso": renderEmployeeAccess,
  "/empleado/kid/:isin": renderKidViewer,
  "/empleado/aportacion": renderContribution,
  "/empleado/historial": renderHistory,
  "/empleado/documentos": renderDocuments,
  "/empleado/perfil": renderProfile
};

export function getEmpleadoRoutes() {
  return empleadoRoutes;
}

function renderEmployeeHome() {
  if (!ensureEmployeeSession()) return renderEmployeeAccess();
  setPageTitle("Mi plan");
  const state = getState();
  const session = getEmployeeSession();
  const portal = getEmployeePortal();
  const plansMap = new Map(state.plans.map((plan) => [plan.id, plan]));
  const employee = state.employees.find((emp) => emp.id === portal.employeeId) ?? state.employees[0];
  const employeeId = employee?.id ?? "u1";
  const employeeMovements = state.movements.filter((mov) => mov.employeeId === employeeId);
  const sortedMovements = employeeMovements.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const successfulMovements = sortedMovements.filter((mov) => mov.status === "ok" && Number(mov.amount) > 0);
  const contributionsLabels = [];
  const contributionsSeries = [];
  let cumulative = 0;
  successfulMovements.forEach((mov) => {
    cumulative += Number(mov.amount) || 0;
    contributionsLabels.push(formatDate(mov.date));
    contributionsSeries.push(Number(cumulative.toFixed(2)));
  });
  const recentMovements = employeeMovements.slice(-4).reverse();
  const nextCharge = computeNextChargeDate();
  const totalContribution = state.plans.reduce(
    (sum, plan) => sum + Number(portal.contributions?.[plan.id] ?? 0),
    0
  );
  const totalInvested = successfulMovements.reduce((sum, mov) => {
    const amount = Number(mov.amount) || 0;
    return sum + amount;
  }, 0);
  const estimatedReturnRate = 0.045;
  const estimatedGain = totalInvested * estimatedReturnRate;
  const currentBalanceEstimate = totalInvested + estimatedGain;
  const monthlyContribution = totalContribution;
  const forecastMonths = 12;
  const monthlyRate = estimatedReturnRate / 12;
  const forecastSeries = [];
  const forecastLabels = [];
  let forecastValue = currentBalanceEstimate;
  const forecastStartDate = new Date(nextCharge);
  for (let i = 0; i < forecastMonths; i += 1) {
    const labelDate = new Date(forecastStartDate);
    labelDate.setMonth(labelDate.getMonth() + i);
    forecastValue = (forecastValue + monthlyContribution) * (1 + monthlyRate);
    forecastSeries.push(Number(forecastValue.toFixed(2)));
    forecastLabels.push(formatDate(labelDate));
  }
  const projectedYearValue = forecastSeries[forecastSeries.length - 1] ?? currentBalanceEstimate;
  const estimatedReturnPct = (estimatedReturnRate * 100).toFixed(1);
  const breakdownHtml =
    state.plans
      .map((plan) => {
        const amount = Number(portal.contributions?.[plan.id] ?? 0);
        const planDescriptor = plan.srri ? ` · SRRI ${plan.srri}/7` : "";
        return `<li><strong>${plan.name}</strong> · ${formatCurrency(amount)}${planDescriptor}</li>`;
      })
      .join("") || "<li>No hay planes disponibles.</li>";
  const movementsHtml =
    recentMovements
      .map((mov) => {
        const planKey = mov.planId ?? mov.plan ?? null;
        const planName = planKey ? plansMap.get(planKey)?.name ?? planKey : "Sin plan";
        return `<tr>
          <td>${formatDate(mov.date)}</td>
          <td>${planName}</td>
          <td>${formatCurrency(mov.amount)}</td>
          <td>${mov.status.toUpperCase()}</td>
        </tr>`;
      })
      .join("") || "<tr><td colspan='4'>Sin movimientos aún.</td></tr>";

  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Hola, ${employee?.name ?? "empleado invitado"}</h1>
      <p class="subtitle">
        Resumen de tu plan de inversión mensual vía nómina.
        <br />
        <small>Sesión temporal iniciada como <strong>${session.email || "empleado@investfacility.com"}</strong></small>
      </p>
      <div class="grid two">
        <div class="card">
          <h2>Aportaciones mensuales</h2>
          <p>
            Total mensual:
            <strong>${formatCurrency(totalContribution)}</strong>
            ${portal.paused ? '<span class="tag paused">Pausado</span>' : '<span class="tag">Activo</span>'}
          </p>
          <ul class="list-clean">${breakdownHtml}</ul>
          <p>Próximo cargo estimado: <strong>${formatDate(nextCharge)}</strong></p>
          <p style="margin-top:0.75rem;">Ajusta cuánto destinas a cada plan cuando quieras.</p>
          <div class="hero-actions" style="gap:0.5rem;">
            <a class="button small" href="/empleado/aportacion" data-link>Editar aportación</a>
          </div>
        </div>
        <div class="card">
          <h2>Documentos clave</h2>
          <ul class="list-clean">
            ${state.plans
              .map((p) => {
                const doc = portal.documents[`KID-${p.id}`];
                return `<li>
              ${p.name} · ${doc ? `Aceptado ${formatDate(doc.acceptedAt)}` : "Pendiente de aceptar"}
              <button class="button ghost small" data-kid="${p.isin}">Ver KID</button>
            </li>`;
              })
              .join("")}
            <li><a href="/empleado/documentos" data-link>Ver todos los documentos</a></li>
          </ul>
        </div>
      </div>
      <div class="section card">
        <h2>Estadísticas personales</h2>
        <p class="subtitle">
          Simulación de aportaciones acumuladas y rendimiento estimado.
        </p>
        <div class="grid three">
          <div>
            <strong>${formatCurrency(totalInvested)}</strong>
            <p>Aportado hasta hoy</p>
          </div>
          <div>
            <strong>${formatCurrency(estimatedGain)}</strong>
            <p>Ganancia estimada (${estimatedReturnPct}% anual)</p>
          </div>
          <div>
            <strong>${formatCurrency(projectedYearValue)}</strong>
            <p>Valor proyectado a 12 meses</p>
          </div>
        </div>
        <div class="chart" style="height:180px;margin-top:1rem;">
          <canvas id="employee-contributions-chart" width="600" height="180"></canvas>
        </div>
      </div>
      <div class="section card">
        <h2>Forecast de crecimiento</h2>
        <p class="subtitle">
          Proyección mensual asumiendo aportaciones constantes y crecimiento anual del ${estimatedReturnPct}%.
        </p>
        <div class="chart" style="height:220px;">
          <canvas id="employee-forecast-chart" width="600" height="220"></canvas>
        </div>
      </div>
      <div class="section card">
        <h2>Últimos movimientos</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Plan</th>
                <th>Importe</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${movementsHtml}
            </tbody>
          </table>
        </div>
      </div>`
  );

  wrapper.querySelectorAll("[data-kid]").forEach((button) => {
    button.addEventListener("click", () => navigate(`/empleado/kid/${button.dataset.kid}`));
  });

  const renderCharts = (attempt = 0) => {
    const contributionsCanvas = wrapper.querySelector("#employee-contributions-chart");
    const forecastCanvas = wrapper.querySelector("#employee-forecast-chart");
    const contributionsReady = contributionsCanvas && contributionsCanvas.offsetWidth > 0;
    const forecastReady = forecastCanvas && forecastCanvas.offsetWidth > 0;
    if (!(contributionsReady || forecastReady)) {
      if (attempt < 5) {
        requestAnimationFrame(() => renderCharts(attempt + 1));
      }
      return;
    }
    if (contributionsReady) {
      renderLineChart(contributionsCanvas, {
        labels: contributionsLabels,
        series: contributionsSeries,
        xLabel: "Fecha",
        yLabel: "Capital acumulado (€)",
        yFormatter: (value) => formatCurrency(value)
      });
    }
    if (forecastReady) {
      renderLineChart(forecastCanvas, {
        labels: forecastLabels,
        series: forecastSeries,
        xLabel: "Mes proyectado",
        yLabel: "Saldo estimado (€)",
        yFormatter: (value) => formatCurrency(value)
      });
    }
  };
  requestAnimationFrame(() => renderCharts());

  return wrapper;
}

function renderEmployeeAccess() {
  if (ensureEmployeeSession()) {
    return renderEmployeeHome();
  }
  setPageTitle("Acceso empleados");
  const wrapper = createEl("section", { className: "card", style: "max-width:420px;margin:auto;" });
  wrapper.append(
    html`<h1>Acceso portal empleados</h1>
      <p class="subtitle">
        Introduce tu email corporativo para acceder al portal de empleado en modo simulación. No se realiza
        autenticación real; la sesión se guarda en <code>sessionStorage</code>.
      </p>
      <form id="employee-login-form">
        <div>
          <label for="employee-email">Email corporativo</label>
          <input id="employee-email" name="email" type="email" required placeholder="empleado@empresa.com" />
        </div>
        <label for="employee-remember">
          <input id="employee-remember" type="checkbox" checked />
          Mantener sesión mientras dure la simulación
        </label>
        <div class="form-actions">
          <button class="button" type="submit">Entrar</button>
        </div>
      </form>`
  );

  wrapper.querySelector("#employee-login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = wrapper.querySelector("#employee-email").value.trim();
    if (!email) {
      showToast("Introduce un email válido.", { type: "error" });
      return;
    }
    setEmployeeSessionLoggedIn({ email });
    updateEmployeePortal({ contactEmail: email });
    showToast("Sesión de empleado iniciada en modo simulación.");
    navigate("/empleado");
  });

  return wrapper;
}

function renderKidViewer({ params }) {
  if (!ensureEmployeeSession()) return renderEmployeeAccess();
  const { isin } = params;
  const state = getState();
  const plan = state.plans.find((p) => p.isin === isin);
  setPageTitle(`KID ${plan?.name ?? isin}`);
  const portal = getEmployeePortal();
  const docKey = `KID-${plan?.id ?? isin}`;
  const wrapper = createEl("section", { className: "card", style: "max-width:720px;margin:auto;" });
  wrapper.append(
    html`<h1>${plan ? `KID · ${plan.name}` : `KID ${isin}`}</h1>
      <p class="subtitle">
        Documento de Datos Fundamentales (PRIIPs) de referencia. Haz clic para abrir el PDF y marca la casilla de
        aceptación si estás conforme.
      </p>
      <div class="form-actions" style="justify-content:flex-start;">
        <button class="button small" type="button" id="open-kid">Abrir PDF de referencia</button>
      </div>
      <label style="display:flex;align-items:center;gap:0.5rem;margin-top:1.5rem;">
        <input type="checkbox" id="accept-kid" ${portal.documents[docKey] ? "checked" : ""} />
        Confirmo que he leído y acepto el KID de referencia
      </label>
      <div class="form-actions" style="margin-top:1.5rem;">
        <button class="button" type="button" id="confirm" ${portal.documents[docKey] ? "" : "disabled"}>
          Guardar aceptación
        </button>
        <a class="button ghost" href="/empleado/documentos" data-link>Volver a documentos</a>
      </div>`
  );

  wrapper.querySelector("#open-kid").addEventListener("click", () => {
    openSimplePdf({
      title: `KID de referencia - ${plan?.name ?? isin}`,
      subtitle: "Documento informativo sin validez legal",
      filename: `KID-${plan?.id ?? isin}.pdf`
    });
  });

  const checkbox = wrapper.querySelector("#accept-kid");
  const confirmBtn = wrapper.querySelector("#confirm");
  checkbox.addEventListener("change", () => {
    confirmBtn.disabled = !checkbox.checked;
  });

  confirmBtn.addEventListener("click", () => {
    if (!checkbox.checked) return;
    const timestamp = new Date().toISOString();
    updateEmployeePortal({
      documents: {
        [docKey]: {
          acceptedAt: timestamp,
          hash: btoa(`${isin}-referencia`)
        }
      }
    });
    showToast("Aceptación registrada en modo simulación.");
    navigate("/empleado/documentos");
  });

  return wrapper;
}

function renderContribution() {
  if (!ensureEmployeeSession()) return renderEmployeeAccess();
  setPageTitle("Gestionar aportación");
  const state = getState();
  const portal = getEmployeePortal();
  const plans = state.plans ?? [];
  const minContribution = state.companySettings?.minContribution ?? 50;
  const totalContribution = plans.reduce(
    (sum, plan) => sum + Number(portal.contributions?.[plan.id] ?? 0),
    0
  );
  const planFieldsHtml =
    plans
      .map((plan) => {
        const amount = Number(portal.contributions?.[plan.id] ?? 0);
        return `<div>
          <label for="amount-${plan.id}">
            <strong>${plan.name}</strong><br />
            <small>SRRI ${plan.srri}/7 · TER ${plan.ter.toFixed(2)}%</small>
          </label>
          <input
            id="amount-${plan.id}"
            data-plan="${plan.id}"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            value="${amount}"
          />
        </div>`;
      })
      .join("") || "<p>No hay planes configurados actualmente.</p>";

  const wrapper = createEl("section", { className: "card", style: "max-width:540px;margin:auto;" });
  wrapper.append(
    html`<h1>Distribuye tu aportación</h1>
      <form id="contribution-form">
        <p class="subtitle">
          Ajusta cuánto destinas a cada plan cada mes. Asigna 0 € a los planes en los que no quieras aportar.
        </p>
        <div class="grid two" style="gap:1.5rem;margin-bottom:1rem;">
          ${planFieldsHtml}
        </div>
        <p style="margin:0 0 1rem 0;">
          Total mensual:
          <strong id="total-amount">${formatCurrency(totalContribution)}</strong>
          <br />
          <span id="total-helper">
            ${portal.paused
              ? "Las aportaciones están pausadas. Reactívalas cuando quieras."
              : `Mínimo recomendado: ${formatCurrency(minContribution)}.`}
          </span>
        </p>
        <label>
          <input type="checkbox" id="paused" ${portal.paused ? "checked" : ""} />
          Pausar aportaciones temporalmente
        </label>
        <div class="form-actions">
          <button class="button" type="submit">Guardar cambios</button>
          <a class="button ghost" href="/empleado" data-link>Volver</a>
        </div>
      </form>`
  );

  const form = wrapper.querySelector("#contribution-form");
  const amountInputs = Array.from(form.querySelectorAll("input[data-plan]"));
  const pausedCheckbox = form.querySelector("#paused");
  const totalAmountEl = form.querySelector("#total-amount");
  const helperEl = form.querySelector("#total-helper");

  const updateSummary = () => {
    let total = 0;
    amountInputs.forEach((input) => {
      const value = Number(input.value);
      if (!Number.isNaN(value) && value >= 0) {
        total += value;
      }
    });
    totalAmountEl.textContent = formatCurrency(total);
    const paused = pausedCheckbox.checked;
    if (!paused && amountInputs.length && total < minContribution) {
      helperEl.textContent = `El total debe ser al menos ${formatCurrency(minContribution)} mientras las aportaciones estén activas.`;
      helperEl.style.color = "#e74c3c";
    } else if (paused) {
      helperEl.textContent = "Las aportaciones permanecerán en pausa hasta que las reactives.";
      helperEl.style.color = "";
    } else {
      helperEl.textContent = `Mínimo recomendado: ${formatCurrency(minContribution)}.`;
      helperEl.style.color = "";
    }
  };

  amountInputs.forEach((input) => {
    input.addEventListener("input", () => {
      if (input.value === "") {
        updateSummary();
        return;
      }
      const value = Number(input.value);
      if (Number.isNaN(value) || value < 0) {
        input.value = "0";
      }
      updateSummary();
    });
  });
  pausedCheckbox.addEventListener("change", updateSummary);
  updateSummary();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const paused = pausedCheckbox.checked;
    const updates = {};
    let total = 0;
    for (const input of amountInputs) {
      const planId = input.dataset.plan;
      if (!planId) continue;
      const value = Number(input.value);
      if (Number.isNaN(value) || value < 0) {
        showToast("Introduce importes válidos (0 o superiores).", { type: "error" });
        input.focus();
        return;
      }
      const normalized = Number(value.toFixed(2));
      updates[planId] = normalized;
      total += normalized;
    }
    if (!paused && amountInputs.length && total < minContribution) {
      showToast(`El total debe ser al menos ${formatCurrency(minContribution)}.`, { type: "error" });
      return;
    }
    updateEmployeePortal({
      contributions: updates,
      paused
    });
    showToast("Aportación actualizada en modo simulación.");
    navigate("/empleado");
  });

  return wrapper;
}

function renderHistory() {
  if (!ensureEmployeeSession()) return renderEmployeeAccess();
  setPageTitle("Historial de aportaciones");
  const state = getState();
  const portal = getEmployeePortal();
  const employeeId = portal.employeeId ?? state.employees[0]?.id;
  const movements = state.movements.filter((mov) => mov.employeeId === employeeId);
  const plansMap = new Map(state.plans.map((plan) => [plan.id, plan]));
  const pageSize = 5;
  let page = 0;
  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Historial de aportaciones</h1>
      <div class="chart" style="height:220px;">
        <canvas id="history-chart" width="600" height="220"></canvas>
      </div>
      <div class="section table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Plan</th>
              <th>Importe</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="form-actions" style="justify-content:space-between;">
        <button class="button ghost" type="button" id="prev-page">Anterior</button>
        <div id="page-info"></div>
        <button class="button ghost" type="button" id="next-page">Siguiente</button>
      </div>`
  );

  const chartCanvas = wrapper.querySelector("#history-chart");
  queueMicrotask(() => {
    renderLineChart(chartCanvas, {
      labels: movements.map((mov) => formatDate(mov.date)),
      series: movements.map((mov) => mov.amount),
      xLabel: "Fecha",
      yLabel: "Aportación mensual (€)",
      yFormatter: (value) => formatCurrency(value)
    });
  });

  const tbody = wrapper.querySelector("tbody");
  const pageInfo = wrapper.querySelector("#page-info");
  const prevBtn = wrapper.querySelector("#prev-page");
  const nextBtn = wrapper.querySelector("#next-page");

  function renderPage() {
    const start = page * pageSize;
    const paginated = movements.slice(start, start + pageSize);
    if (!paginated.length) {
      tbody.innerHTML = "<tr><td colspan='4'>Sin movimientos registrados.</td></tr>";
    } else {
      tbody.innerHTML = paginated
      .map((mov) => {
        const planKey = mov.planId ?? mov.plan ?? null;
        const planName = planKey ? plansMap.get(planKey)?.name ?? planKey : "Sin plan";
        return `<tr>
          <td>${formatDate(mov.date)}</td>
          <td>${planName}</td>
          <td>${formatCurrency(mov.amount)}</td>
          <td>${mov.status.toUpperCase()}</td>
      </tr>`;
        })
        .join("");
    }
    pageInfo.textContent = `Página ${page + 1} de ${Math.max(1, Math.ceil(movements.length / pageSize))}`;
    prevBtn.disabled = page === 0;
    nextBtn.disabled = start + pageSize >= movements.length;
  }

  prevBtn.addEventListener("click", () => {
    if (page > 0) {
      page -= 1;
      renderPage();
    }
  });
  nextBtn.addEventListener("click", () => {
    if ((page + 1) * pageSize < movements.length) {
      page += 1;
      renderPage();
    }
  });

  renderPage();
  return wrapper;
}

function renderDocuments() {
  if (!ensureEmployeeSession()) return renderEmployeeAccess();
  setPageTitle("Documentos");
  const state = getState();
  const portal = getEmployeePortal();
  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Documentos de referencia</h1>
      <div class="grid two">
        <div class="card">
          <h2>KIDs</h2>
          <ul class="list-clean">
            ${state.plans
              .map((plan) => {
                const key = `KID-${plan.id}`;
                const accepted = portal.documents[key];
                return `<li>
              ${plan.name} · ${accepted ? `Aceptado ${formatDate(accepted.acceptedAt)}` : "Pendiente"}
              <button class="button ghost small" data-kid="${plan.isin}">${accepted ? "Ver" : "Aceptar"}</button>
            </li>`;
              })
              .join("")}
          </ul>
        </div>
        <div class="card">
          <h2>Otros documentos</h2>
          <ul class="list-clean">
            <li>
              Términos & Condiciones (referencia)
              <button class="button ghost small" type="button" data-static="T&C">Descargar</button>
            </li>
            <li>
              Certificado anual (placeholder)
              <button class="button ghost small" type="button" disabled>Disponible en cierre fiscal</button>
            </li>
          </ul>
        </div>
      </div>`
  );

  wrapper.querySelectorAll("[data-kid]").forEach((button) => {
    button.addEventListener("click", () => navigate(`/empleado/kid/${button.dataset.kid}`));
  });

  wrapper.querySelectorAll("[data-static]").forEach((button) => {
    button.addEventListener("click", () => {
      openSimplePdf({
        title: `${button.dataset.static} referencia`,
        subtitle: "Documento de referencia",
        filename: `${button.dataset.static}-referencia.pdf`
      });
      showToast("Documento de referencia descargado.");
    });
  });

  return wrapper;
}

function renderProfile() {
  if (!ensureEmployeeSession()) return renderEmployeeAccess();
  setPageTitle("Perfil");
  const portal = getEmployeePortal();
  const wrapper = createEl("section", { className: "card", style: "max-width:540px;margin:auto;" });
  wrapper.append(
    html`<h1>Perfil del empleado</h1>
      <form id="profile-form">
        <div>
          <label for="profile-email">Email de contacto</label>
          <input id="profile-email" type="email" value="${portal.contactEmail}" required />
        </div>
        <div>
          <label for="profile-language">Idioma</label>
          <select id="profile-language">
            <option value="es" ${portal.language === "es" ? "selected" : ""}>Español</option>
            <option value="en" ${portal.language === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
        <div>
          <label for="profile-password">Contraseña ficticia</label>
          <input id="profile-password" type="password" placeholder="••••••" />
        </div>
        <div class="form-actions">
          <button class="button" type="submit">Guardar</button>
        </div>
      </form>
      <div class="section card" style="background:#fff5f5;border:1px solid #e74c3c;">
        <h2>Restablecer datos</h2>
        <p>Elimina todos los datos guardados localmente (aportaciones, preferencias, documentos).</p>
        <button class="button ghost" type="button" id="reset-simulacion">Restablecer</button>
      </div>`
  );

  wrapper.querySelector("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = wrapper.querySelector("#profile-email").value;
    updateEmployeePortal({
      contactEmail: email,
      language: wrapper.querySelector("#profile-language").value
    });
    showToast("Perfil actualizado en modo simulación.");
    wrapper.querySelector("#profile-password").value = "";
  });

  wrapper.querySelector("#reset-simulacion").addEventListener("click", () => {
    resetPilotState();
    showToast("Datos reseteados. Inicia sesión de nuevo para continuar.");
    navigate("/empleado/acceso");
  });

  return wrapper;
}

function ensureEmployeeSession() {
  const session = getEmployeeSession();
  return session?.isLogged ?? false;
}

function computeNextChargeDate() {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), 25, 9, 0, 0, 0);
  if (date < today) {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
}
