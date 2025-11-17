import { navigate } from "../router.js";
import { createEl, html, setPageTitle } from "../utils/dom.js";
import { formatCurrency, formatDate, formatTime } from "../utils/format.js";
import { showToast } from "../utils/toast.js";
import { renderLineChart } from "../utils/charts.js";
import { parseCsv } from "../utils/csv.js";
import { buildPain001, parseXml } from "../utils/xml.js";
import { downloadFile } from "../utils/download.js";
import {
  getCompany,
  getCompanySettings,
  getEmployeeById,
  getEmployees,
  getEmpresaSession,
  getState,
  addEmployee,
  deleteEmployee,
  setEmpresaSessionLoggedIn,
  updateCompany,
  updateCompanySettings,
  updateEmployee,
  updateEmployeesBulk
} from "../state.js";

const empresaRoutes = {
  "/login": renderLogin,
  "/empresa": renderDashboard,
  "/empresa/empleados": renderEmployeesList,
  "/empresa/empleados/import": renderEmployeesImport,
  "/empresa/empleados/:id": renderEmployeeDetail,
  "/empresa/reglas": renderRules,
  "/empresa/pagos/generar": renderGeneratePayments,
  "/empresa/pagos/conciliacion": renderConciliation,
  "/empresa/calendario": renderCalendar,
  "/empresa/informes": renderReports,
  "/empresa/ajustes": renderSettings,
  "/empresa/soporte": renderSupport
};

export function getEmpresaRoutes() {
  return empresaRoutes;
}

function renderLogin() {
  setPageTitle("Acceso empresas");
  const wrapper = createEl("section", { className: "card", style: "max-width:420px;margin:auto;" });
  wrapper.append(
    html`<h1>Acceso portal empresa</h1>
      <p>
        Introduce un email cualquiera para simular el acceso. No se realiza autenticación real; la sesión se guarda
        en <code>sessionStorage</code>.
      </p>
      <form id="login-form">
        <div>
          <label for="login-email">Email</label>
          <input id="login-email" name="email" type="email" required placeholder="rrhh@empresa.com" />
        </div>
        <div>
          <label for="login-remember">
            <input id="login-remember" type="checkbox" checked />
            Recordar sesión en esta simulación
          </label>
        </div>
        <div class="form-actions">
          <button class="button" type="submit">Entrar</button>
        </div>
      </form>`
  );
  wrapper.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    setEmpresaSessionLoggedIn();
    showToast("Sesión iniciada en modo simulación.");
    navigate("/empresa");
  });
  return wrapper;
}

function renderDashboard() {
  if (!ensureSession()) return renderLogin();
  setPageTitle("Dashboard empresa");
  const state = getState();
  const settings = getCompanySettings();
  const employees = getEmployees();
  const activeEmployees = employees.filter((emp) => emp.status === "active");
  const pausedEmployees = employees.filter((emp) => emp.status === "paused");
  const adoption = employees.length ? Math.round((activeEmployees.length / employees.length) * 100) : 0;
  const avgContribution = activeEmployees.length
    ? activeEmployees.reduce((sum, emp) => sum + Number(emp.amount || 0), 0) / activeEmployees.length
    : 0;
  const totalContribution = activeEmployees.reduce((sum, emp) => sum + Number(emp.amount || 0), 0);
  const incidents = state.movements.filter((mov) => mov.status !== "ok").length || state.companyStats.paymentIssues;
  const nextCutoff = computeNextCutoffDate(settings.cutOffDay, settings.cutOffTime);
  const contributionsByPlan = aggregateByPlan(activeEmployees, state.plans);
  const recentMovements = state.movements.slice(-5).reverse();
  const palette = ["#2049ff", "#00b894", "#ff7a59", "#8e44ad"];
  const quickList = employees.slice(0, 6);

  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Panel de control</h1>
      <p class="subtitle">
        Resumen operativo del entorno controlado. Los datos proceden de semillas sintéticas y se recalculan en cliente
        con las acciones realizadas.
      </p>
      <div class="grid two">
        <div class="card">
          <h2>Indicadores principales</h2>
          <div class="grid two">
            <div>
              <strong style="font-size:2rem;">${adoption}%</strong>
              <p>Adopción empleados</p>
            </div>
            <div>
              <strong style="font-size:2rem;">${formatCurrency(avgContribution || 0)}</strong>
              <p>Aportación media mensual</p>
            </div>
            <div>
              <strong>${activeEmployees.length}</strong>
              <p>Empleados activos</p>
            </div>
            <div>
              <strong>${pausedEmployees.length}</strong>
              <p>Empleados pausados</p>
            </div>
            <div>
              <strong>${employees.length}</strong>
              <p>Total empleados ficticios</p>
            </div>
            <div>
              <strong>${incidents}</strong>
              <p>Incidencias de pago</p>
            </div>
          </div>
          <p>
            Próximo corte: <strong>${formatDate(nextCutoff)} · ${formatTime(nextCutoff)}</strong> · Mínimo por empleado:
            <strong>${formatCurrency(settings.minContribution)}</strong>
          </p>
        </div>
        <div class="card">
          <h2>Aportaciones por plan</h2>
          <p class="subtitle">Total mensual activo: <strong>${formatCurrency(totalContribution)}</strong></p>
          ${
            contributionsByPlan.length
              ? `<div class="stacked-bar" role="presentation">
              ${contributionsByPlan
                .map(
                  (entry, index) => `<span class="stacked-bar-segment" style="flex:${entry.total};background:${
                    palette[index % palette.length]
                  };">
                    <span class="sr-only">${entry.plan.name}: ${formatCurrency(entry.total)} (${entry.percentage}%)</span>
                  </span>`
                )
                .join("")}
            </div>
            <ul class="list-clean stacked-bar-legend">
              ${contributionsByPlan
                .map(
                  (entry, index) => `<li>
                  <span class="legend-dot" style="background:${palette[index % palette.length]};"></span>
                  <strong>${entry.plan.name}</strong> · ${formatCurrency(entry.total)} (${entry.percentage}%)
                </li>`
                )
                .join("")}
            </ul>`
              : "<p>No hay aportaciones activas en esta simulación.</p>"
          }
        </div>
      </div>
      <div class="section grid two">
        <div class="card">
          <h2>Alta rápida de empleado</h2>
          <p class="subtitle">Añade participaciones ficticias para simular crecimiento de la plantilla.</p>
          <form id="quick-add-form">
            <div class="form-row">
              <div>
                <label for="qa-name">Nombre completo</label>
                <input id="qa-name" type="text" required placeholder="Nombre Apellido" />
              </div>
              <div>
                <label for="qa-email">Email corporativo</label>
                <input id="qa-email" type="email" required placeholder="nombre@empresa.com" />
              </div>
            </div>
            <div class="form-row">
              <div>
                <label for="qa-plan">Plan</label>
                <select id="qa-plan">
                  ${state.plans.map((plan) => `<option value="${plan.id}">${plan.name}</option>`).join("")}
                </select>
              </div>
              <div>
                <label for="qa-amount">Aportación mensual (€)</label>
                <input id="qa-amount" type="number" min="${settings.minContribution}" value="${
                  settings.minContribution
                }" required />
              </div>
            </div>
            <p class="helper-text">El alta se registra como estado activo con KYC/MiFID pendientes en modo muestra.</p>
            <div class="form-actions" style="justify-content:flex-start;">
              <button class="button small" type="submit">Añadir empleado</button>
            </div>
          </form>
        </div>
        <div class="card">
          <h2>Gestión rápida</h2>
          <p class="subtitle">Pausa o da de baja empleados sin salir del panel.</p>
          <div class="table-wrapper compact">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Plan</th>
                  <th>Aportación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${
                  quickList.length
                    ? quickList
                        .map((emp) => {
                          const plan = state.plans.find((p) => p.id === emp.plan);
                          return `<tr data-id="${emp.id}">
                          <td>
                            <strong>${emp.name}</strong>
                            <div class="muted">${emp.email}</div>
                          </td>
                          <td>${plan ? plan.name : emp.plan}</td>
                          <td>${formatCurrency(emp.amount)}</td>
                          <td>${renderStatusTag(emp.status)}</td>
                          <td>
                            <div class="table-actions">
                              <button class="button ghost tiny" data-action="toggle-status" data-id="${emp.id}">
                                ${emp.status === "active" ? "Pausar" : "Activar"}
                              </button>
                              <button class="button danger tiny" data-action="delete" data-id="${emp.id}">
                                Dar de baja
                              </button>
                            </div>
                          </td>
                        </tr>`;
                        })
                        .join("")
                    : `<tr><td colspan="5">No hay empleados en la simulación todavía.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="section">
        <h2>Movimientos recientes</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Importe</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${recentMovements
                .map((mov) => {
                  const employee = employees.find((emp) => emp.id === mov.employeeId);
                  return `<tr>
                    <td>${formatDate(mov.date)}</td>
                    <td>${employee ? employee.name : mov.employeeId}</td>
                    <td>${formatCurrency(mov.amount)}</td>
                    <td>${renderStatusTag(mov.status)}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`
  );

  const quickAddForm = wrapper.querySelector("#quick-add-form");
  if (quickAddForm) {
    quickAddForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = wrapper.querySelector("#qa-name").value.trim();
      const email = wrapper.querySelector("#qa-email").value.trim();
      const plan = wrapper.querySelector("#qa-plan").value;
      const amount = Number(wrapper.querySelector("#qa-amount").value);
      if (!name || !email) {
        showToast("Completa nombre y email.", { type: "error" });
        return;
      }
      if (Number.isNaN(amount) || amount < settings.minContribution) {
        showToast(`La aportación mínima es ${formatCurrency(settings.minContribution)}.`, { type: "error" });
        return;
      }
      addEmployee({
        name,
        email,
        plan,
        amount,
        status: "active",
        kycStatus: "pending",
        mifidStatus: "pending"
      });
      showToast(`Empleado ${name} añadido en modo simulación.`);
      quickAddForm.reset();
      wrapper.querySelector("#qa-plan").value = plan;
      wrapper.querySelector("#qa-amount").value = settings.minContribution;
      navigate("/empresa", { replace: true });
    });
  }

  wrapper.querySelectorAll("[data-action='toggle-status']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const employee = employees.find((emp) => emp.id === id);
      if (!employee) return;
      const newStatus = employee.status === "active" ? "paused" : "active";
      updateEmployee(id, { status: newStatus });
      showToast(`Empleado ${employee.name} ahora está ${newStatus === "active" ? "activo" : "pausado"}.`);
      navigate("/empresa", { replace: true });
    });
  });

  wrapper.querySelectorAll("[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const employee = employees.find((emp) => emp.id === id);
      if (!employee) return;
      if (deleteEmployee(id)) {
        showToast(`Empleado ${employee.name} dado de baja en modo simulación.`);
        navigate("/empresa", { replace: true });
      } else {
        showToast("No se pudo dar de baja al empleado en modo simulación.", { type: "error" });
      }
    });
  });

  return wrapper;
}

function renderEmployeesList() {
  if (!ensureSession()) return renderLogin();
  setPageTitle("Empleados");
  const state = getState();
  const plansMap = new Map(state.plans.map((plan) => [plan.id, plan]));
  const container = createEl("section", { className: "card" });
  container.append(
    html`<h1>Empleados del entorno controlado</h1>
      <div class="layout-split">
        <div class="card">
          <form id="filters" class="grid two" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
            <div>
              <label for="filter-query">Buscar</label>
              <input id="filter-query" type="text" placeholder="Nombre o email" />
            </div>
            <div>
              <label for="filter-plan">Plan</label>
              <select id="filter-plan">
                <option value="all">Todos</option>
                ${state.plans.map((plan) => `<option value="${plan.id}">${plan.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label for="filter-status">Estado</label>
              <select id="filter-status">
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="paused">Pausados</option>
              </select>
            </div>
          </form>
        </div>
        <div class="card">
          <p><strong>Acciones rápidas</strong></p>
          <div class="hero-actions" style="gap:0.5rem;">
            <a class="button small" href="/empresa/empleados/import" data-link>Importar CSV de muestra</a>
            <a class="button ghost small" href="/empresa/reglas" data-link>Editar reglas</a>
          </div>
        </div>
      </div>
      <div class="section table-wrapper">
        <table>
          <thead>
            <tr>
              <th data-sort="name">Empleado</th>
              <th data-sort="plan">Plan</th>
              <th data-sort="amount">Aportación</th>
              <th data-sort="status">Estado</th>
              <th>KYC/MiFID</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>`
  );

  const tableBody = container.querySelector("tbody");
  const filters = {
    query: "",
    plan: "all",
    status: "all",
    sortKey: "name",
    sortDir: "asc"
  };

  const filterQuery = container.querySelector("#filter-query");
  const filterPlan = container.querySelector("#filter-plan");
  const filterStatus = container.querySelector("#filter-status");

  filterQuery.addEventListener("input", () => {
    filters.query = filterQuery.value.toLowerCase();
    renderRows();
  });
  filterPlan.addEventListener("change", () => {
    filters.plan = filterPlan.value;
    renderRows();
  });
  filterStatus.addEventListener("change", () => {
    filters.status = filterStatus.value;
    renderRows();
  });

  container.querySelectorAll("th[data-sort]").forEach((header) => {
    header.style.cursor = "pointer";
    header.addEventListener("click", () => {
      const key = header.dataset.sort;
      if (filters.sortKey === key) {
        filters.sortDir = filters.sortDir === "asc" ? "desc" : "asc";
      } else {
        filters.sortKey = key;
        filters.sortDir = "asc";
      }
      renderRows();
    });
  });

  function renderRows() {
    const employees = getEmployees();
    const filtered = employees
      .filter((emp) => {
        const matchesQuery =
          !filters.query ||
          emp.name.toLowerCase().includes(filters.query) ||
          emp.email.toLowerCase().includes(filters.query);
        const matchesPlan = filters.plan === "all" || emp.plan === filters.plan;
        const matchesStatus =
          filters.status === "all" || (filters.status === "paused" ? emp.status !== "active" : emp.status === "active");
        return matchesQuery && matchesPlan && matchesStatus;
      })
      .sort((a, b) => sortEmployees(a, b, filters.sortKey, filters.sortDir));

    tableBody.innerHTML = filtered
      .map((emp) => {
        const plan = plansMap.get(emp.plan);
        return `<tr data-id="${emp.id}">
          <td>
            <strong>${emp.name}</strong>
            <div class="muted">${emp.email}</div>
          </td>
          <td>${plan ? plan.name : emp.plan}</td>
          <td>${formatCurrency(emp.amount)}</td>
          <td>${renderStatusTag(emp.status)}</td>
          <td>
            <span class="status-dot ${mapKycColor(emp.kycStatus)}"></span>${formatKycStatus(emp.kycStatus)} /
            ${formatMifidStatus(emp.mifidStatus)}
          </td>
        </tr>`;
      })
      .join("");

    tableBody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        navigate(`/empresa/empleados/${id}`);
      });
    });
  }

  renderRows();
  return container;
}

function renderEmployeeDetail({ params }) {
  if (!ensureSession()) return renderLogin();
  const { id } = params;
  const employee = getEmployeeById(id);
  const state = getState();
  const plansMap = new Map(state.plans.map((plan) => [plan.id, plan]));
  if (!employee) {
    return renderNotFoundEmployee(id);
  }

  const employeeMovements = state.movements.filter((mov) => mov.employeeId === employee.id);
  const wrapper = createEl("section", { className: "card" });
  setPageTitle(`Empleado · ${employee.name}`);
  wrapper.append(
    html`<nav class="breadcrumbs" aria-label="Migas de pan">
        <a href="/empresa" data-link>Dashboard</a>
        <span aria-hidden="true">/</span>
        <a href="/empresa/empleados" data-link>Empleados</a>
        <span aria-hidden="true">/</span>
        <span>${employee.name}</span>
      </nav>
      <h1>${employee.name}</h1>
      <p class="subtitle">${employee.email}</p>
      <div class="grid two">
        <div class="card">
          <h2>Resumen</h2>
          <p>
            Plan actual:
            <strong>${plansMap.get(employee.plan)?.name ?? employee.plan}</strong>
            · Aportación mensual:
            <strong>${formatCurrency(employee.amount)}</strong>
          </p>
          <p>Estado: ${renderStatusTag(employee.status)}</p>
          <p>
            KYC:
            <span class="status-dot ${mapKycColor(employee.kycStatus)}"></span>${formatKycStatus(employee.kycStatus)} ·
            MiFID: ${formatMifidStatus(employee.mifidStatus)}
          </p>
          <div class="form-actions" style="justify-content:flex-start;">
            <button class="button ghost small" data-action="switch">Cambiar plan de referencia</button>
            <button class="button ghost small" data-action="pause">
              ${employee.status === "active" ? "Pausar aportación ficticia" : "Reanudar aportación ficticia"}
            </button>
          </div>
        </div>
        <div class="card">
          <h2>Histórico de aportaciones</h2>
          <div class="chart" style="height:220px;">
            <canvas id="employee-chart" width="400" height="220"></canvas>
          </div>
        </div>
      </div>
      <div class="section card">
        <h2>Movimientos</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Importe</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${employeeMovements
                .map(
                  (mov) => `<tr>
                <td>${formatDate(mov.date)}</td>
                <td>${formatCurrency(mov.amount)}</td>
                <td>${renderStatusTag(mov.status)}</td>
              </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`
  );

  wrapper.querySelector("[data-action='switch']").addEventListener("click", () => {
    const nextPlan = state.plans.find((plan) => plan.id !== employee.plan);
    updateEmployee(employee.id, { plan: nextPlan?.id ?? employee.plan });
    showToast(`Plan actualizado a ${nextPlan?.name ?? employee.plan} en modo simulación.`);
    navigate(`/empresa/empleados/${employee.id}`);
  });

  wrapper.querySelector("[data-action='pause']").addEventListener("click", () => {
    const newStatus = employee.status === "active" ? "paused" : "active";
    updateEmployee(employee.id, { status: newStatus });
    showToast(`Estado actualizado a ${newStatus} en modo simulación.`);
    navigate(`/empresa/empleados/${employee.id}`);
  });

  queueMicrotask(() => {
    const canvas = wrapper.querySelector("#employee-chart");
    if (!canvas) return;
    renderLineChart(canvas, {
      labels: employeeMovements.map((mov) => formatDate(mov.date)),
      series: employeeMovements.map((mov) => mov.amount),
      xLabel: "Fecha",
      yLabel: "Aportación mensual (€)",
      yFormatter: (value) => formatCurrency(value)
    });
  });

  return wrapper;
}

function renderNotFoundEmployee(id) {
  const card = createEl("section", { className: "card" });
  card.append(
    html`<h1>Empleado no encontrado</h1>
      <p>No existe ningún empleado con el identificador <code>${id}</code> en esta simulación.</p>
      <a class="button" href="/empresa/empleados" data-link>Volver al listado</a>`
  );
  return card;
}

function renderEmployeesImport() {
  if (!ensureSession()) return renderLogin();
  setPageTitle("Importar empleados");
  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Importación CSV de ejemplo</h1>
      <p class="subtitle">
        Arrastra un CSV con columnas <code>name,email,amount,plan</code>. El plan debe coincidir con los IDs de los
        planes definidos (CONS/CREC). Los datos se almacenan en memoria/localStorage, sin llamadas a red.
      </p>
      <div class="file-drop" id="dropzone" tabindex="0">
        <p>
          Arrastra aquí tu archivo o
          <button type="button" id="select-file" class="button ghost small">búscalo</button>
        </p>
        <input type="file" id="file-input" accept=".csv,text/csv" hidden />
      </div>
      <div id="preview" class="section"></div>`
  );

  const dropzone = wrapper.querySelector("#dropzone");
  const fileInput = wrapper.querySelector("#file-input");
  const selectButton = wrapper.querySelector("#select-file");
  const preview = wrapper.querySelector("#preview");

  function handleFiles(files) {
    if (!files.length) return;
    const file = files[0];
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const { rows } = parseCsv(reader.result, {
          required: ["name", "email", "amount", "plan"]
        });
        const { parsed, errors } = transformCsvRows(rows);
        preview.innerHTML = "";
        if (errors.length) {
          preview.append(
            html`<div class="card" style="border:1px solid #e67e22;background:#fff4e6;">
              <h2>Errores detectados</h2>
              <ul>
                ${errors.map((err) => `<li>Fila ${err.row}: ${err.message}</li>`).join("")}
              </ul>
            </div>`
          );
          return;
        }
        const table = html`<div class="card">
          <h2>Vista previa</h2>
          <p>${parsed.length} empleados listos para importar.</p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Aportación</th>
                </tr>
              </thead>
              <tbody>
                ${parsed
                  .map(
                    (item) => `<tr>
                  <td>${item.name}</td>
                  <td>${item.email}</td>
                  <td>${item.plan}</td>
                  <td>${formatCurrency(item.amount)}</td>
                </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          <div class="form-actions">
            <button class="button" data-action="import">Importar (muestra)</button>
          </div>
        </div>`;
        preview.append(table);
        preview.querySelector("[data-action='import']").addEventListener("click", () => {
          updateEmployeesBulk(parsed);
          showToast(`Importados ${parsed.length} empleados en modo simulación.`);
          navigate("/empresa/empleados");
        });
      } catch (error) {
        preview.innerHTML = `<p>Error al analizar el CSV: ${error.message}</p>`;
      }
    });
    reader.readAsText(file);
  }

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    handleFiles(event.dataTransfer.files);
  });
  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      fileInput.click();
    }
  });
  selectButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => handleFiles(fileInput.files));

  return wrapper;
}

function renderRules() {
  if (!ensureSession()) return renderLogin();
  const settings = getCompanySettings();
  setPageTitle("Reglas de aportación");
  const wrapper = createEl("section", { className: "card", style: "max-width:720px;margin:auto;" });
  wrapper.append(
    html`<h1>Reglas de aportación</h1>
      <form id="rules-form">
        <div class="form-row">
          <div>
            <label for="min-amount">Mínimo mensual por empleado (€)</label>
            <input id="min-amount" type="number" min="50" value="${settings.minContribution}" required />
          </div>
          <div>
            <label for="cutoff-day">Día de corte</label>
            <input id="cutoff-day" type="number" min="1" max="28" value="${settings.cutOffDay}" required />
          </div>
          <div>
            <label for="cutoff-time">Hora de corte</label>
            <input id="cutoff-time" type="time" value="${settings.cutOffTime}" required />
          </div>
        </div>
        <fieldset>
          <legend>Notificaciones de ejemplo</legend>
          <label>
            <input type="checkbox" id="notif-payments" ${settings.notifications.payments ? "checked" : ""} />
            Pagos reconciliados
          </label>
          <label>
            <input type="checkbox" id="notif-incidents" ${settings.notifications.incidents ? "checked" : ""} />
            Incidencias operativas
          </label>
          <label>
            <input type="checkbox" id="notif-digest" ${settings.notifications.digest ? "checked" : ""} />
            Resumen semanal
          </label>
        </fieldset>
        <div class="form-actions">
          <button class="button" type="submit">Guardar reglas</button>
          <button class="button ghost" type="button" data-action="toggle-pause">
            ${settings.globalPause ? "Reanudar aportaciones" : "Pausar aportaciones"}
          </button>
        </div>
      </form>`
  );

  wrapper.querySelector("#rules-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const min = Number(wrapper.querySelector("#min-amount").value);
    if (Number.isNaN(min) || min < 50) {
      showToast("El mínimo permitido es 50 €.", { type: "error" });
      return;
    }
    updateCompanySettings({
      minContribution: min,
      cutOffDay: Number(wrapper.querySelector("#cutoff-day").value),
      cutOffTime: wrapper.querySelector("#cutoff-time").value,
      notifications: {
        payments: wrapper.querySelector("#notif-payments").checked,
        incidents: wrapper.querySelector("#notif-incidents").checked,
        digest: wrapper.querySelector("#notif-digest").checked
      }
    });
    showToast("Reglas guardadas en modo simulación.");
  });

  wrapper.querySelector("[data-action='toggle-pause']").addEventListener("click", () => {
    const current = getCompanySettings();
    updateCompanySettings({ globalPause: !current.globalPause });
    showToast(
      current.globalPause
        ? "Se reanudan las aportaciones en modo simulación."
        : "Aportaciones pausadas en modo simulación."
    );
    navigate("/empresa/reglas");
  });

  return wrapper;
}

function renderGeneratePayments() {
  if (!ensureSession()) return renderLogin();
  const settings = getCompanySettings();
  const company = getCompany();
  const employees = getEmployees().filter((emp) => emp.status === "active");
  const executionDate = formatDateInput(computeNextCutoffDate(settings.cutOffDay, settings.cutOffTime));
  setPageTitle("Generar pagos SEPA");
  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Generar fichero pain.001</h1>
      <p class="subtitle">
        Se incluye a los empleados activos según la aportación configurada. El fichero se genera en cliente y se
        descarga sin salir de la simulación.
      </p>
      <form id="pain-form">
        <div class="form-row">
          <div>
            <label for="execution-date">Fecha ejecución (YYYY-MM-DD)</label>
            <input id="execution-date" type="date" value="${executionDate}" required />
          </div>
          <div>
            <label for="reference">Referencia de lote</label>
            <input id="reference" type="text" value="NOMINA-${executionDate.replace(/-/g, "")}" />
          </div>
        </div>
        <p>
          Empleados incluidos: <strong>${employees.length}</strong> · Total estimado:
          <strong>${formatCurrency(employees.reduce((sum, emp) => sum + Number(emp.amount || 0), 0))}</strong>
        </p>
        <div class="form-actions">
          <button class="button" type="submit">Generar pain.001</button>
        </div>
      </form>`
  );

  wrapper.querySelector("#pain-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const date = wrapper.querySelector("#execution-date").value;
    const xml = buildPain001({
      company,
      employees,
      executionDate: date
    });
    const filename = `pain001-muestra-${date.replace(/-/g, "").slice(0, 6)}.xml`;
    downloadFile({ filename, content: xml, type: "application/xml" });
    showToast(`Fichero ${filename} generado en modo simulación.`);
  });

  return wrapper;
}

function renderConciliation() {
  if (!ensureSession()) return renderLogin();
  setPageTitle("Conciliación SEPA");
  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Conciliación pain.002 / camt.053</h1>
      <p class="subtitle">
        Sube un XML de ejemplo y analizaremos las referencias EndToEndId / NtryRef para mostrar el estado de cada
        pago. No se realizan uploads reales.
      </p>
      <input type="file" id="xml-input" accept=".xml,application/xml" />
      <div id="results" class="section"></div>`
  );

  wrapper.querySelector("#xml-input").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const xml = parseXml(reader.result);
        const transactions = extractTransactions(xml);
        const okCount = transactions.filter((tx) => tx.status === "ok").length;
        const template = html`<div class="card">
          <h2>Resultado conciliación</h2>
          <p>
            Transacciones analizadas: <strong>${transactions.length}</strong> · OK:
            <strong>${okCount}</strong> · Pendientes/Error:
            <strong>${transactions.length - okCount}</strong>
          </p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                ${transactions
                  .map(
                    (tx) => `<tr>
                  <td>${tx.reference}</td>
                  <td>${tx.amount ? formatCurrency(tx.amount) : "-"}</td>
                  <td>${renderStatusTag(tx.status)}</td>
                  <td>${tx.rawStatus}</td>
                </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>`;
        const results = wrapper.querySelector("#results");
        results.innerHTML = "";
        results.append(template);
        showToast("Conciliación procesada en modo simulación.");
      } catch (error) {
        showToast(`XML inválido: ${error.message}`, { type: "error" });
      }
    });
    reader.readAsText(file);
  });

  return wrapper;
}

function renderCalendar() {
  if (!ensureSession()) return renderLogin();
  const settings = getCompanySettings();
  setPageTitle("Calendario de cortes");
  const upcoming = buildNextCutoffs(settings, 6);
  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Próximos cortes de nómina</h1>
      <p class="subtitle">
        Fechas derivadas de la regla actual (día ${settings.cutOffDay}, ${settings.cutOffTime} CET). El hover muestra
        la regla asociada y si hay pausa global activa.
      </p>
      <div class="calendar">
        ${upcoming
          .map(
            (date) => `<div class="calendar-day" tabindex="0">
          <strong>${formatDate(date)}</strong>
          <p>${formatTime(date)} CET</p>
          <div class="calendar-tooltip">
            Corte ${formatDate(date)} · Min ${formatCurrency(settings.minContribution)} · ${
              settings.globalPause ? "Aportaciones pausadas" : "Aportaciones activas"
            }
          </div>
        </div>`
          )
          .join("")}
      </div>`
  );
  return wrapper;
}

function renderReports() {
  if (!ensureSession()) return renderLogin();
  const state = getState();
  const plansMap = new Map(state.plans.map((plan) => [plan.id, plan]));
  setPageTitle("Informes de referencia");
  const aggregated = aggregateByPlan(
    state.employees.filter((emp) => emp.status === "active"),
    state.plans
  ).map((item) => ({
    plan: item.plan.name,
    empleados: item.count,
    aportacionTotal: item.total,
    porcentaje: item.percentage
  }));
  const wrapper = createEl("section", { className: "card" });
  wrapper.append(
    html`<h1>Informes & export</h1>
      <p class="subtitle">
        Datos calculados en cliente. Puedes exportar un CSV de muestra con el resumen por plan estratégico.
      </p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Empleados</th>
              <th>Aportación mensual total</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            ${
              aggregated.length
                ? aggregated
                    .map(
                      (item) => `<tr>
              <td>${item.plan}</td>
              <td>${item.empleados}</td>
              <td>${formatCurrency(item.aportacionTotal)}</td>
              <td>${item.porcentaje}%</td>
            </tr>`
                    )
                    .join("")
                : `<tr><td colspan="4">No hay aportaciones activas en esta simulación.</td></tr>`
            }
          </tbody>
        </table>
      </div>
      <div class="section card">
        <h2>Últimas incidencias</h2>
        <ul class="list-clean">
          ${state.movements
            .filter((mov) => mov.status !== "ok")
            .map((mov) => {
              const employee = state.employees.find((emp) => emp.id === mov.employeeId);
              return `<li>${formatDate(mov.date)} · ${
                employee ? employee.name : mov.employeeId
              } · ${formatCurrency(mov.amount)} · ${mov.status.toUpperCase()}</li>`;
            })
            .join("") || "<li>Sin incidencias recientes.</li>"}
        </ul>
      </div>
      <div class="form-actions">
        <button class="button" type="button" id="export-csv">Exportar CSV de muestra</button>
      </div>`
  );

  wrapper.querySelector("#export-csv").addEventListener("click", () => {
    const csv = ["plan,empleados,aportacion_total,porcentaje"].concat(
      aggregated.map(
        (row) =>
          `${row.plan},${row.empleados},${row.aportacionTotal.toFixed(2)},${row.porcentaje}`
      )
    );
    downloadFile({
      filename: "informe-referencia.csv",
      content: csv.join("\n"),
      type: "text/csv"
    });
    showToast("CSV descargado en modo simulación.");
  });

  return wrapper;
}

function renderSettings() {
  if (!ensureSession()) return renderLogin();
  const company = getCompany();
  const settings = getCompanySettings();
  setPageTitle("Ajustes empresa");
  const wrapper = createEl("section", { className: "card", style: "max-width:640px;margin:auto;" });
  wrapper.append(
    html`<h1>Ajustes de la simulación</h1>
      <form id="settings-form">
        <div>
          <label for="company-name">Nombre visible</label>
          <input id="company-name" type="text" value="${company.name}" required />
        </div>
        <div>
          <label for="company-logo">Logo (URL o emoji)</label>
          <input id="company-logo" type="text" value="${company.logo}" />
          <small>En esta versión puedes usar un emoji (p. ej. 🏦) o una URL pública.</small>
        </div>
        <fieldset>
          <legend>Preferencias de notificación</legend>
          <label>
            <input type="checkbox" id="settings-notif-payments" ${settings.notifications.payments ? "checked" : ""} />
            Pagos reconciliados
          </label>
          <label>
            <input type="checkbox" id="settings-notif-incidents" ${settings.notifications.incidents ? "checked" : ""} />
            Incidencias
          </label>
          <label>
            <input type="checkbox" id="settings-notif-digest" ${settings.notifications.digest ? "checked" : ""} />
            Resumen semanal
          </label>
        </fieldset>
        <div class="form-actions">
          <button class="button" type="submit">Guardar ajustes</button>
        </div>
      </form>`
  );

  wrapper.querySelector("#settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = wrapper.querySelector("#company-name").value.trim();
    if (!name) {
      showToast("El nombre es obligatorio.", { type: "error" });
      return;
    }
    updateCompany({
      name,
      logo: wrapper.querySelector("#company-logo").value || "/assets/acme.svg"
    });
    updateCompanySettings({
      notifications: {
        payments: wrapper.querySelector("#settings-notif-payments").checked,
        incidents: wrapper.querySelector("#settings-notif-incidents").checked,
        digest: wrapper.querySelector("#settings-notif-digest").checked
      }
    });
    showToast("Ajustes guardados en modo simulación.");
  });

  return wrapper;
}

function renderSupport() {
  if (!ensureSession()) return renderLogin();
  setPageTitle("Soporte");
  const wrapper = createEl("section", { className: "card", style: "max-width:520px;margin:auto;" });
  wrapper.append(
    html`<h1>Crear ticket interno</h1>
      <form id="support-form">
        <div>
          <label for="support-topic">Tema</label>
          <select id="support-topic">
            <option>Pago rechazado</option>
            <option>Alta empleado</option>
            <option>Reporte fiscal</option>
            <option>Otro</option>
          </select>
        </div>
        <div>
          <label for="support-desc">Descripción</label>
          <textarea id="support-desc" rows="4" placeholder="Describe la incidencia"></textarea>
        </div>
        <div class="form-actions">
          <button class="button" type="submit">Enviar ticket</button>
        </div>
      </form>`
  );

  wrapper.querySelector("#support-form").addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("Ticket creado en modo simulación.");
    event.target.reset();
  });

  return wrapper;
}

function ensureSession() {
  const session = getEmpresaSession();
  return session?.isLogged ?? false;
}

function aggregateByPlan(employees, plans) {
  const totals = new Map(plans.map((plan) => [plan.id, { plan, total: 0, count: 0 }]));
  employees.forEach((employee) => {
    if (!totals.has(employee.plan)) {
      totals.set(employee.plan, { plan: { id: employee.plan, name: employee.plan }, total: 0, count: 0 });
    }
    const entry = totals.get(employee.plan);
    entry.total += Number(employee.amount || 0);
    entry.count += 1;
  });
  const arr = Array.from(totals.values()).filter((entry) => entry.total > 0);
  if (!arr.length) {
    return [];
  }
  const grandTotal = arr.reduce((sum, entry) => sum + entry.total, 0) || 1;
  return arr.map((entry) => ({
    ...entry,
    percentage: Math.round((entry.total / grandTotal) * 100)
  }));
}

function renderStatusTag(status) {
  const normalized = String(status || "").toLowerCase();
  let className = "tag";
  let text = status;
  if (["active", "ok", "completed", "success"].includes(normalized)) {
    className = "tag";
    text = normalized === "active" ? "Activo" : "OK";
  } else if (["paused", "pause"].includes(normalized)) {
    className = "tag paused";
    text = "Pausado";
  } else if (["failed", "error", "rejected", "rjct"].includes(normalized)) {
    className = "tag paused";
    text = "Error";
  } else if (["pending", "pdng", "review"].includes(normalized)) {
    className = "tag paused";
    text = "Pendiente";
  } else {
    className = "tag";
    text = status || "–";
  }
  return `<span class="${className}">${text}</span>`;
}

function mapKycColor(status) {
  switch (status) {
    case "completed":
    case "ok":
      return "ok";
    case "pending":
      return "pending";
    default:
      return "pending";
  }
}

function formatKycStatus(status) {
  switch (status) {
    case "completed":
      return "KYC completado";
    case "review":
      return "KYC en revisión";
    case "pending":
      return "KYC pendiente";
    default:
      return status;
  }
}

function formatMifidStatus(status) {
  switch (status) {
    case "adequate":
      return "Adecuado";
    case "pending":
      return "Pendiente";
    default:
      return status ?? "–";
  }
}

function sortEmployees(a, b, key, direction) {
  const dir = direction === "desc" ? -1 : 1;
  switch (key) {
    case "amount":
      return (Number(a.amount) - Number(b.amount)) * dir;
    case "plan":
      return a.plan.localeCompare(b.plan) * dir;
    case "status":
      return a.status.localeCompare(b.status) * dir;
    default:
      return a.name.localeCompare(b.name) * dir;
  }
}

function computeNextCutoffDate(day, time) {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  const candidate = new Date(now.getFullYear(), now.getMonth(), day, hours, minutes, 0, 0);
  if (candidate < now) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

function buildNextCutoffs(settings, count) {
  const dates = [];
  let date = computeNextCutoffDate(settings.cutOffDay, settings.cutOffTime);
  for (let i = 0; i < count; i += 1) {
    dates.push(new Date(date));
    date.setMonth(date.getMonth() + 1);
  }
  return dates;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function transformCsvRows(rows) {
  const parsed = [];
  const errors = [];
  rows.forEach(({ data, row }, index) => {
    if (!data.name || !data.email) {
      errors.push({ row, message: "Nombre y email son obligatorios" });
      return;
    }
    const amount = Number(data.amount);
    if (Number.isNaN(amount) || amount < 50) {
      errors.push({ row, message: "Importe inválido (<50 €)" });
      return;
    }
    const plan = data.plan.toUpperCase();
    if (!["CONS", "CREC"].includes(plan)) {
      errors.push({ row, message: "Plan debe ser CONS o CREC" });
      return;
    }
    parsed.push({
      id: data.id || `csv-${Date.now()}-${index}`,
      name: data.name,
      email: data.email,
      amount,
      plan,
      status: "active",
      kycStatus: "pending",
      mifidStatus: "pending"
    });
  });
  return { parsed, errors };
}

function extractTransactions(xml) {
  const result = [];
  const paymentNodes = Array.from(xml.getElementsByTagNameNS("*", "CdtTrfTxInf"));
  if (paymentNodes.length) {
    paymentNodes.forEach((node) => {
      result.push(extractTransactionData(node));
    });
  } else {
    const entryNodes = Array.from(xml.getElementsByTagNameNS("*", "Ntry"));
    entryNodes.forEach((node) => {
      const reference =
        node.getElementsByTagNameNS("*", "NtryRef")[0]?.textContent ||
        node.getElementsByTagNameNS("*", "AcctSvcrRef")[0]?.textContent ||
        "SIN-REF";
      const amount = Number(node.getElementsByTagNameNS("*", "Amt")[0]?.textContent || 0);
      const status = node.getElementsByTagNameNS("*", "Sts")[0]?.textContent || "BOOK";
      result.push({
        reference,
        amount,
        status: mapStatus(status),
        rawStatus: status
      });
    });
  }
  return result;
}

function extractTransactionData(node) {
  const reference =
    node.getElementsByTagNameNS("*", "EndToEndId")[0]?.textContent ||
    node.getElementsByTagNameNS("*", "TxId")[0]?.textContent ||
    "SIN-REF";
  const amount = Number(node.getElementsByTagNameNS("*", "InstdAmt")[0]?.textContent || 0);
  const rawStatus =
    node.getElementsByTagNameNS("*", "TxSts")[0]?.textContent ||
    node.getElementsByTagNameNS("*", "Prtry")[0]?.textContent ||
    "PENDING";
  return {
    reference,
    amount,
    rawStatus,
    status: mapStatus(rawStatus)
  };
}

function mapStatus(code) {
  const normalized = code?.toString().toUpperCase();
  if (["ACSC", "ACSP", "BOOK", "COMP"].includes(normalized)) return "ok";
  if (["RJCT", "ABCD", "FAIL", "ERROR"].includes(normalized)) return "error";
  if (["PDNG", "ACCP", "PENDING"].includes(normalized)) return "pending";
  return "pending";
}
