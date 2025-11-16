import { seedData } from "./data/seed.js";
import { cloneDeep } from "./utils/object.js";

const STORAGE_KEY = "avuntia-state";
const EMPRESA_SESSION_KEY = "avuntia-session";
const EMPLOYEE_SESSION_KEY = "avuntia-employee-session";
const ADMIN_SESSION_KEY = "avuntia-admin-session";

function buildDefaultEmployeeContributions() {
  const contributions = {};
  seedData.plans.forEach((plan) => {
    contributions[plan.id] = 0;
  });
  const primaryEmployee =
    seedData.employees.find((emp) => emp.id === "u1") ?? seedData.employees[0] ?? null;
  if (primaryEmployee && primaryEmployee.plan && primaryEmployee.amount != null && contributions[primaryEmployee.plan] != null) {
    contributions[primaryEmployee.plan] = Number(primaryEmployee.amount) || 0;
  }
  return contributions;
}

function defaultEmployeePortal() {
  return {
    language: "es",
    employeeId: "u1",
    contributions: buildDefaultEmployeeContributions(),
    paused: false,
    documents: {},
    contactEmail: "empleado@avuntia.com"
  };
}

export const SUPPORTED_LANGUAGES = ["es", "ca", "en"];

const defaultState = () => ({
  company: seedData.company,
  cutOff: seedData.cutOff,
  plans: seedData.plans,
  employees: seedData.employees,
  companyStats: seedData.companyStats,
  movements: seedData.movements,
  adminConsole: {
    companies: seedData.adminCompanies ?? []
  },
  companySettings: {
    minContribution: 50,
    globalPause: false,
    cutOffDay: seedData.cutOff.day,
    cutOffTime: seedData.cutOff.time,
    notifications: {
      payments: true,
      incidents: true,
      digest: false
    }
  },
  empresaSession: {
    isLogged: false,
    lastLogin: null
  },
  employeeSession: {
    isLogged: false,
    lastLogin: null,
    email: ""
  },
  adminSession: {
    isLogged: false,
    lastLogin: null
  },
  employeePortal: defaultEmployeePortal(),
  language: "es"
});

let memoryState = loadState();

function loadState() {
  const defaults = defaultState();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaults,
        ...parsed,
        employeePortal: mergeEmployeePortal(defaults.employeePortal, parsed.employeePortal)
      };
    }
  } catch (error) {
    console.error("No se pudo cargar el estado", error);
  }
  return defaults;
}

function persistState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        company: memoryState.company,
        cutOff: memoryState.cutOff,
        plans: memoryState.plans,
        employees: memoryState.employees,
        companyStats: memoryState.companyStats,
        movements: memoryState.movements,
        adminConsole: memoryState.adminConsole,
        companySettings: memoryState.companySettings,
        employeePortal: memoryState.employeePortal,
        language: memoryState.language
      })
    );
  } catch (error) {
    console.error("No se pudo guardar el estado", error);
  }
}

function loadSession() {
  try {
    const storedEmpresa = sessionStorage.getItem(EMPRESA_SESSION_KEY);
    if (storedEmpresa) {
      const parsed = JSON.parse(storedEmpresa);
      memoryState.empresaSession = { ...memoryState.empresaSession, ...parsed };
    }
    const storedEmployee = sessionStorage.getItem(EMPLOYEE_SESSION_KEY);
    if (storedEmployee) {
      const parsed = JSON.parse(storedEmployee);
      memoryState.employeeSession = { ...memoryState.employeeSession, ...parsed };
    }
    const storedAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (storedAdmin) {
      const parsed = JSON.parse(storedAdmin);
      memoryState.adminSession = { ...memoryState.adminSession, ...parsed };
    }
  } catch (error) {
    console.error("No se pudo cargar la sesión", error);
  }
}

function persistEmpresaSession() {
  try {
    sessionStorage.setItem(EMPRESA_SESSION_KEY, JSON.stringify(memoryState.empresaSession));
  } catch (error) {
    console.error("No se pudo guardar la sesión", error);
  }
}

function persistEmployeeSession() {
  try {
    sessionStorage.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify(memoryState.employeeSession));
  } catch (error) {
    console.error("No se pudo guardar la sesión empleado", error);
  }
}

function persistAdminSession() {
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(memoryState.adminSession));
  } catch (error) {
    console.error("No se pudo guardar la sesión admin", error);
  }
}

export function initState() {
  loadSession();
  exposeDebugHelpers();
  if (typeof document !== "undefined") {
    document.documentElement.lang = getLanguage();
  }
}

export function getState() {
  return cloneDeep(memoryState);
}

export function getCompany() {
  return cloneDeep(memoryState.company);
}

export function getEmployees() {
  return cloneDeep(memoryState.employees);
}

export function getEmployeeById(id) {
  return cloneDeep(memoryState.employees.find((emp) => emp.id === id) ?? null);
}

export function updateEmployee(id, patch) {
  const idx = memoryState.employees.findIndex((emp) => emp.id === id);
  if (idx === -1) return null;
  memoryState.employees[idx] = { ...memoryState.employees[idx], ...patch };
  persistState();
  return cloneDeep(memoryState.employees[idx]);
}

export function updateEmployeesBulk(updates) {
  const employeesById = new Map(memoryState.employees.map((emp) => [emp.id, emp]));
  updates.forEach((employee) => {
    const existing = employeesById.get(employee.id);
    if (existing) {
      employeesById.set(employee.id, { ...existing, ...employee });
    } else {
      employeesById.set(employee.id, employee);
    }
  });
  memoryState.employees = Array.from(employeesById.values());
  persistState();
  return cloneDeep(memoryState.employees);
}

export function replaceEmployees(list) {
  memoryState.employees = list;
  persistState();
  return cloneDeep(memoryState.employees);
}

export function addEmployee(employee) {
  const id = employee.id ?? `emp-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
  const newEmployee = {
    id,
    name: employee.name,
    email: employee.email,
    plan: employee.plan,
    amount: Number(employee.amount) || 0,
    status: employee.status ?? "active",
    kycStatus: employee.kycStatus ?? "pending",
    mifidStatus: employee.mifidStatus ?? "pending"
  };
  memoryState.employees = [...memoryState.employees, newEmployee];
  persistState();
  return cloneDeep(newEmployee);
}

export function getAdminCompanies() {
  ensureAdminConsole();
  return cloneDeep(memoryState.adminConsole.companies);
}

export function registerAdminCompany(company) {
  ensureAdminConsole();
  const headcount = Number(company.headcount) || 0;
  const rawAdoption = Number(company.adoption);
  const adoption = Number.isFinite(rawAdoption) ? Math.min(100, Math.max(0, rawAdoption)) : 0;
  const avgTicket = Math.max(0, Number(company.avgTicket) || 0);
  const computedMonthly = Math.round(headcount * (adoption / 100) * avgTicket) || 0;
  const monthlyContribution =
    company.monthlyContribution != null && company.monthlyContribution !== ""
      ? Math.max(0, Number(company.monthlyContribution) || 0)
      : computedMonthly;
  const stage =
    typeof company.stage === "string" && company.stage.trim().length ? company.stage.trim() : "prospect";
  const newCompany = {
    id: company.id ?? `cmp-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 6)}`,
    name: company.name?.trim() || "Nueva empresa",
    sector: company.sector?.trim() || "General",
    country: company.country?.trim() || "España",
    headcount,
    adoption,
    avgTicket,
    monthlyContribution,
    payrollSystem: company.payrollSystem?.trim() || "Sin especificar",
    stage,
    contact: company.contact?.trim() || "",
    notes: company.notes?.trim() || "",
    createdAt: company.createdAt ?? new Date().toISOString()
  };
  memoryState.adminConsole.companies = [newCompany, ...memoryState.adminConsole.companies];
  persistState();
  return cloneDeep(newCompany);
}

function ensureAdminConsole() {
  if (!memoryState.adminConsole || !Array.isArray(memoryState.adminConsole.companies)) {
    memoryState.adminConsole = { companies: [] };
  }
}

export function deleteEmployee(id) {
  const initialLength = memoryState.employees.length;
  memoryState.employees = memoryState.employees.filter((emp) => emp.id !== id);
  if (memoryState.employees.length !== initialLength) {
    persistState();
    return true;
  }
  return false;
}

export function getCompanySettings() {
  return cloneDeep(memoryState.companySettings);
}

export function updateCompanySettings(patch) {
  memoryState.companySettings = {
    ...memoryState.companySettings,
    ...patch,
    notifications: {
      ...memoryState.companySettings.notifications,
      ...(patch.notifications ?? {})
    }
  };
  persistState();
  return cloneDeep(memoryState.companySettings);
}

export function updateCompany(patch) {
  memoryState.company = { ...memoryState.company, ...patch };
  persistState();
  return cloneDeep(memoryState.company);
}

export function setEmpresaSessionLoggedIn() {
  memoryState.empresaSession.isLogged = true;
  memoryState.empresaSession.lastLogin = new Date().toISOString();
  persistEmpresaSession();
}

export function clearEmpresaSession() {
  memoryState.empresaSession = { isLogged: false, lastLogin: null };
  persistEmpresaSession();
}

export function getEmpresaSession() {
  return cloneDeep(memoryState.empresaSession);
}

export function setEmployeeSessionLoggedIn({ email }) {
  memoryState.employeeSession.isLogged = true;
  memoryState.employeeSession.lastLogin = new Date().toISOString();
  memoryState.employeeSession.email = email;
  persistEmployeeSession();
}

export function clearEmployeeSession() {
  memoryState.employeeSession = { isLogged: false, lastLogin: null, email: "" };
  persistEmployeeSession();
}

export function getEmployeeSession() {
  return cloneDeep(memoryState.employeeSession);
}

export function setAdminSessionLoggedIn() {
  memoryState.adminSession.isLogged = true;
  memoryState.adminSession.lastLogin = new Date().toISOString();
  persistAdminSession();
}

export function clearAdminSession() {
  memoryState.adminSession = { isLogged: false, lastLogin: null };
  persistAdminSession();
}

export function getAdminSession() {
  return cloneDeep(memoryState.adminSession);
}

export function getEmployeePortal() {
  return cloneDeep(memoryState.employeePortal);
}

export function getLanguage() {
  const language = memoryState.language ?? "es";
  return SUPPORTED_LANGUAGES.includes(language) ? language : "es";
}

export function setLanguage(language) {
  const normalized = SUPPORTED_LANGUAGES.includes(language) ? language : "es";
  if (memoryState.language === normalized) {
    return normalized;
  }
  memoryState.language = normalized;
  persistState();
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("avuntia:language-change", {
        detail: { language: normalized }
      })
    );
  }
  return normalized;
}

export function updateEmployeePortal(patch) {
  memoryState.employeePortal = {
    ...memoryState.employeePortal,
    ...patch,
    documents: {
      ...memoryState.employeePortal.documents,
      ...(patch.documents ?? {})
    },
    contributions: {
      ...memoryState.employeePortal.contributions,
      ...(patch.contributions ?? {})
    }
  };
  persistState();
  return cloneDeep(memoryState.employeePortal);
}

export function resetPilotState() {
  memoryState = defaultState();
  persistState();
  persistEmpresaSession();
  persistEmployeeSession();
  persistAdminSession();
  return getState();
}

function exposeDebugHelpers() {
  if (typeof window !== "undefined") {
    window.__avuntiaState = {
      get: getState,
      reset: resetPilotState
    };
  }
}

function mergeEmployeePortal(defaultPortal, storedPortal = {}) {
  if (!storedPortal || typeof storedPortal !== "object") {
    return { ...defaultPortal };
  }
  const legacyContributions = extractLegacyContributions(storedPortal, defaultPortal);
  return {
    ...defaultPortal,
    ...storedPortal,
    documents: {
      ...defaultPortal.documents,
      ...(storedPortal.documents ?? {})
    },
    contributions: {
      ...defaultPortal.contributions,
      ...(storedPortal.contributions ?? legacyContributions)
    }
  };
}

function extractLegacyContributions(portal, defaultPortal) {
  if (!portal || typeof portal !== "object") return {};
  const hasLegacy =
    portal.contributions == null &&
    (portal.selectedPlan != null || portal.monthlyContribution != null);
  if (!hasLegacy) {
    return {};
  }
  const planIds = Object.keys(defaultPortal.contributions ?? {});
  const legacyPlan = portal.selectedPlan ?? planIds[0] ?? null;
  const legacyAmount = Number(portal.monthlyContribution ?? 0) || 0;
  if (!legacyPlan) {
    return {};
  }
  return { [legacyPlan]: legacyAmount };
}
