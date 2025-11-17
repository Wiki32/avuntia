import { createEl, html, setPageTitle } from "../utils/dom.js";
import { formatSrri, formatTer } from "../utils/format.js";
import { getState } from "../state.js";
import { showToast } from "../utils/toast.js";
import { openSimplePdf } from "../utils/pdf.js";
import { translate } from "../utils/i18n.js";

const publicRoutes = {
  "/": renderHome,
  "/home": renderHome,
  "/como-funciona": renderHowItWorks,
  "/planes": renderPlans,
  "/seguridad": renderSecurity,
  "/faq": renderFaq,
  "/contacto": renderContact
};

const legalRoutes = {
  "/legal/aviso": () =>
    renderLegalPage({
      titleKey: "public.legal.notice.title",
      fallbackTitle: "Aviso legal",
      content: getLegalNoticeContent()
    }),
  "/legal/privacidad": () =>
    renderLegalPage({
      titleKey: "public.legal.privacy.title",
      fallbackTitle: "Política de privacidad",
      content: getPrivacyContent()
    }),
  "/legal/cookies": () =>
    renderLegalPage({
      titleKey: "public.legal.cookies.title",
      fallbackTitle: "Política de cookies",
      content: getCookiesContent()
    }),
  "/legal/terminos": () =>
    renderLegalPage({
      titleKey: "public.legal.terms.title",
      fallbackTitle: "Términos y condiciones",
      content: getTermsContent()
    })
};

export function getPublicRoutes() {
  return { ...publicRoutes, ...legalRoutes };
}

function renderHome() {
  setPageTitle(translate("public.home.metaTitle") || "Home");
  const { plans } = getState();
  const wrapper = createEl("div");
  const planBadges = plans
    .map((plan) => `<span class="pill">${plan.name} · ${formatSrri(plan.srri)} · TER ${formatTer(plan.ter)}</span>`)
    .join("");
  const highlights = [
    { key: "clients", title: "Clientes piloto", value: "2 empresas activas" },
    { key: "integrations", title: "Integraciones listas", value: "12 conectores bancarios / fondos" },
    { key: "sla", title: "Disponibilidad SLA", value: "99,7% último trimestre" },
    { key: "compliance", title: "Equipo compliance", value: "5 especialistas MiFID & PRIIPs" }
  ];

  wrapper.append(
    html`<section class="hero card">
      <div>
        <span class="badge" data-i18n-key="public.home.hero.badge">Piloto B2B2C · Nómina → Inversión</span>
        <h1 data-i18n-key="public.home.hero.title">Ahorro e inversión mensual para empleados</h1>
        <p data-i18n-key="public.home.hero.description">
          Lanza un plan de inversión sencillo con aportaciones recurrentes desde la nómina de tus equipos.
          Dos carteras UCITS gestionadas por entidades autorizadas; nosotros orquestamos la experiencia.
        </p>
        <div class="hero-actions">
          <a class="button" href="/empresa" data-link data-i18n-key="public.home.hero.actions.company">Ver portal empresa</a>
          <a class="button ghost" href="/empleado/acceso" data-link data-i18n-key="public.home.hero.actions.employee">Ver portal empleado</a>
        </div>
        <div
          class="pill-group"
          aria-label="Resumen de planes disponibles"
          data-i18n-attr="aria-label:public.home.hero.plansAria"
        >
          ${planBadges}
        </div>
      </div>
      <div class="card">
        <h2 class="title" data-i18n-key="public.home.hero.panelTitle">Invest Facility Labs</h2>
        <p class="subtitle" data-i18n-key="public.home.hero.panelSubtitle">Plataforma tecnológica para planes de inversión por nómina.</p>
        <dl class="grid two">
          ${highlights
            .map(
              (item) => `<div>
            <dt data-i18n-key="public.home.hero.highlights.${item.key}.title">${item.title}</dt>
            <dd class="title" data-i18n-key="public.home.hero.highlights.${item.key}.value">${item.value}</dd>
          </div>`
            )
            .join("")}
        </dl>
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <h2 data-i18n-key="public.home.reasons.title">¿Por qué Invest Facility?</h2>
      <div class="grid two">
        ${[
          {
            key: "frictionless",
            title: "Ahorro sin fricción",
            text: "Onboarding guiado y aportaciones automáticas desde nómina. El empleado elige entre dos planes predefinidos y puede pausar o ajustar su aportación cuando quiera."
          },
          {
            key: "compliance",
            title: "Cumplimiento integrado",
            text: "Operamos bajo el paraguas de entidades autorizadas (MiFID/PRIIPs). KYC/AML, test MiFID y entrega de KID se realizan con el banco/gestora partner."
          },
          {
            key: "payments",
            title: "Pagos SEPA orquestados",
            text: "Generamos ficheros pain.001 y conciliamos pain.002/camt.053. Referencias únicas o IBAN virtual por empleado, con gestión de reintentos."
          },
          {
            key: "reporting",
            title: "Reporting claro",
            text: "Informes para RR. HH. con métricas agregadas, certificados y desglose de costes. El empleado accede a su posición y documentos en un portal dedicado."
          },
          {
            key: "scalability",
            title: "Escalabilidad flexible",
            text: "Desde pymes a grandes corporaciones. Arquitectura cloud nativa con APIs abiertas para integrar con ERPs, nóminas y sistemas internos."
          },
          {
            key: "support",
            title: "Soporte especializado",
            text: "Equipo con experiencia en fintech, gestión de activos y regulación financiera. Acompañamos en la configuración inicial y el soporte operativo."
          }
        ]
          .map(
            (feature) => `<div class="card">
          <h3 data-i18n-key="public.home.reasons.items.${feature.key}.title">${feature.title}</h3>
          <p data-i18n-key="public.home.reasons.items.${feature.key}.text">${feature.text}</p>
        </div>`
          )
          .join("")}
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <h2 data-i18n-key="public.home.metrics.title">Cumple, escala y sorprende</h2>
      <div class="grid three">
        <div>
          <strong>+20</strong>
          <p data-i18n-key="public.home.metrics.items.integrations">integraciones bancarias, de fondos y pagos disponibles.</p>
        </div>
        <div>
          <strong>≤4 h</strong>
          <p data-i18n-key="public.home.metrics.items.response">tiempo de respuesta soporte piloto (SLA 8×5).</p>
        </div>
        <div>
          <strong>≤16 semanas</strong>
          <p data-i18n-key="public.home.metrics.items.golive">desde kick-off a go-live del piloto (supuestos Paquete A).</p>
        </div>
      </div>
    </section>`
  );

  return wrapper;
}

function renderHowItWorks() {
  setPageTitle(translate("public.how.metaTitle") || "Cómo funciona");
  const wrapper = createEl("div");
  const metrics = [
    { value: "≤10 días", label: "habilitación empresa y reglas de aportación" },
    { value: "98%", label: "aportaciones conciliadas en T+1" },
    { value: "100%", label: "KID entregado antes de invertir" },
    { value: "24/7", label: "monitorización de colas críticas" }
  ];
  const quickSteps = [
    {
      label: "Paso 1",
      title: "Configura la empresa",
      text: "Definimos responsables, límites y acuerdos con la entidad regulada."
    },
    {
      label: "Paso 2",
      title: "Onboarding empleados",
      text: "Portal branded para elección de plan, KYC y test MiFID."
    },
    {
      label: "Paso 3",
      title: "Ejecución mensual",
      text: "Generación del pain.001, conciliación y reporting automatizado."
    }
  ];
  const stages = [
    {
      badge: "Fase 1",
      title: "Arranque & compliance",
      bullets: [
        "Kick-off con RR. HH., finanzas y compliance para alinear el alcance.",
        "Configuramos parámetros de aportación, límites MiFID y responsables por rol.",
        "Activamos acuerdos tripartitos con banco/gestora y documentación del flujo."
      ]
    },
    {
      badge: "Fase 2",
      title: "Onboarding empleados",
      bullets: [
        "Carga CSV o API de empleados elegibles y reglas de matching.",
        "Portal empleado con branding corporativo, elección de plan y firma electrónica.",
        "Automatización del test de idoneidad, cuestionario y aceptación del KID."
      ]
    },
    {
      badge: "Fase 3",
      title: "Operativa mensual",
      bullets: [
        "Generación validada del fichero pain.001 con controles de límites y duplicados.",
        "Conciliación pain.002/camt.053 + alertas de incidencia y reintentos automáticos.",
        "Informes consolidados para RR. HH. y dashboards compartidos en tiempo real."
      ]
    }
  ];
  const flowSteps = [
    {
      title: "Definición de reglas de nómina",
      text: "Fijamos aportaciones, topes, fechas de corte y casuísticas especiales (bajas, pausas, bonus)."
    },
    {
      title: "Generación y validación de pain.001",
      text: "El sistema produce el fichero con IBAN virtual, referencias únicas y control de duplicados."
    },
    {
      title: "Conciliación con la entidad regulada",
      text: "Leemos pain.002 y camt.053, actualizamos estados y notificamos incidencias a la empresa."
    },
    {
      title: "Ejecución y reporting",
      text: "El custodio suscribe/aplica órdenes y publicamos informes agregados y por empleado."
    }
  ];
  const automations = [
    {
      title: "Integración con nómina",
      text: "API REST o carga CSV con validaciones de formato, reglas de corte y simulador previo a enviar."
    },
    {
      title: "Control de límites MiFID",
      text: "Verificamos el perfil y la idoneidad del empleado antes de enviar órdenes y bloqueamos excesos."
    },
    {
      title: "Gestión de incidencias",
      text: "Alertas automáticas por email/Slack, workflows de reintentos y trazabilidad completa."
    },
    {
      title: "Servicios al empleado",
      text: "Portal con aportaciones, certificados, traspasos entre planes y soporte contextual."
    }
  ];
  const rhythm = [
    {
      step: "Semana 1",
      title: "Kick-off y parametrización",
      text: "Revisión del calendario, contratos y checklist de controles cruzados."
    },
    {
      step: "Semana 2",
      title: "Cargamos y validamos datos",
      text: "Pruebas con nómina histórica, firma de acuerdos y sandbox para RR. HH."
    },
    {
      step: "Semana 3",
      title: "Ensayo general",
      text: "Dry-run de pain.001, reconciliación y revisión conjunta de dashboards."
    },
    {
      step: "Semana 4",
      title: "Go-live supervisado",
      text: "Mesa de control activa, plan de respuesta y reporte posterior al pago."
    }
  ];

  wrapper.append(
    html`<section class="card how-hero">
      <div>
        <span class="badge">Onboarding orquestado con entidades reguladas</span>
        <h1>De la nómina a la cartera de inversión sin fricciones</h1>
        <p class="subtitle">
          Conectamos RR. HH., tesorería y el partner MiFID para automatizar aportaciones mensuales, conciliación SEPA y
          reporting en tiempo real.
        </p>
        <div class="pill-group">
          <span class="pill">Plantillas y APIs de nómina</span>
          <span class="pill">Control de límites MiFID</span>
          <span class="pill">Pain.001 &amp; conciliación</span>
          <span class="pill">Portal empleado 24/7</span>
        </div>
        <div class="how-metrics">
          ${metrics
            .map(
              (item) => `<article>
            <strong>${item.value}</strong>
            <p>${item.label}</p>
          </article>`
            )
            .join("")}
        </div>
      </div>
      <div class="card how-hero-panel">
        <h2>Ruta rápida</h2>
        <ol class="how-steps">
          ${quickSteps
            .map(
              (step) => `<li>
            <span class="how-step-label">${step.label}</span>
            <div>
              <strong>${step.title}</strong>
              <p>${step.text}</p>
            </div>
          </li>`
            )
            .join("")}
        </ol>
        <a class="button ghost small" href="/contacto" data-link>Solicitar demo guiada</a>
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <h2>Fases del despliegue piloto</h2>
      <p class="subtitle">
        Acompañamos a tu equipo con un playbook claro que incluye checklists de compliance, plantillas y formación para
        asegurar la adopción.
      </p>
      <div class="grid three">
        ${stages
          .map(
            (stage) => `<article class="how-stage">
          <span class="chip">${stage.badge}</span>
          <h3>${stage.title}</h3>
          <ul class="how-stage-list">
            ${stage.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
          </ul>
        </article>`
          )
          .join("")}
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card how-flow">
      <div>
        <h2>Flujo nómina → inversión</h2>
        <p class="subtitle">
          Cada corte de nómina sigue un recorrido supervisado con controles automáticos para garantizar integridad y
          trazabilidad.
        </p>
        <ul class="how-checklist">
          ${flowSteps
            .map(
              (step, index) => `<li>
            <span class="how-checklist-index">0${index + 1}</span>
            <div>
              <strong>${step.title}</strong>
              <p>${step.text}</p>
            </div>
          </li>`
            )
            .join("")}
        </ul>
      </div>
      <div>
        <div class="card how-diagram" aria-label="Diagrama de flujo nómina a inversión">
          <svg viewBox="0 0 360 240" role="img" aria-hidden="true">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#2049ff"></path>
              </marker>
            </defs>
            <rect x="20" y="30" width="120" height="50" rx="12" fill="#eef1f9"></rect>
            <text x="80" y="60" text-anchor="middle" font-size="13">Empresa (RR. HH.)</text>

            <rect x="220" y="30" width="120" height="50" rx="12" fill="#dfe6ff"></rect>
            <text x="280" y="60" text-anchor="middle" font-size="13">Plataforma Invest Facility</text>

            <rect x="20" y="160" width="120" height="50" rx="12" fill="#cce8ff"></rect>
            <text x="80" y="190" text-anchor="middle" font-size="13">Entidad financiera</text>

            <rect x="220" y="160" width="120" height="50" rx="12" fill="#daf5f0"></rect>
            <text x="280" y="190" text-anchor="middle" font-size="13">Fondos / Custodio</text>

            <line x1="140" y1="55" x2="215" y2="55" stroke="#2049ff" stroke-width="2" marker-end="url(#arrow)"></line>
            <text x="177" y="45" text-anchor="middle" font-size="11">pain.001</text>

            <line x1="280" y1="80" x2="280" y2="160" stroke="#2049ff" stroke-width="2" marker-end="url(#arrow)"></line>
            <text x="292" y="120" font-size="11">Órdenes</text>

            <line x1="140" y1="185" x2="215" y2="185" stroke="#2049ff" stroke-width="2" marker-end="url(#arrow)"></line>
            <text x="177" y="175" text-anchor="middle" font-size="11">Confirmaciones</text>

            <line x1="280" y1="160" x2="280" y2="80" stroke="#2049ff" stroke-width="2" marker-end="url(#arrow)"></line>
            <text x="292" y="150" font-size="11">Estados / VAL</text>
          </svg>
        </div>
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <div class="layout-split how-layout">
        <div>
          <h2>Automatizaciones clave</h2>
          <p class="subtitle">
            El objetivo es reducir tareas manuales y asegurar que cada transacción pase por controles automáticos.
          </p>
          <div class="how-automation-grid">
            ${automations
              .map(
                (item) => `<article class="how-automation">
              <h3>${item.title}</h3>
              <p>${item.text}</p>
            </article>`
              )
              .join("")}
          </div>
          <p class="muted">Todos los jobs se monitorizan con alertas y evidencias listas para auditoría.</p>
        </div>
        <div class="card how-timeline">
          <h3>Ritmo operativo</h3>
          <ul>
            ${rhythm
              .map(
                (item) => `<li>
              <span class="how-timeline-step">${item.step}</span>
              <div>
                <strong>${item.title}</strong>
                <p>${item.text}</p>
              </div>
            </li>`
              )
              .join("")}
          </ul>
        </div>
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card how-cta">
      <div>
        <h2>¿Listo para probar el flujo completo?</h2>
        <p class="subtitle">
          Habilitamos un sandbox controlado para simular nóminas, conciliaciones y reporting con tus propios datos.
        </p>
      </div>
      <div class="how-cta-actions">
        <a class="button" href="/contacto" data-link>Agendar kickoff</a>
        <a class="button ghost" href="/planes" data-link>Explorar planes piloto</a>
      </div>
    </section>`
  );

  return wrapper;
}

function renderPlans() {
  setPageTitle(translate("public.plans.metaTitle") || "Planes piloto");
  const { plans } = getState();
  const wrapper = createEl("div");
  const metrics = [
    { value: "3 carteras", label: "UCITS gestionadas por partners regulados" },
    { value: "≤0,35%", label: "TER objetivo con retrocesión 100% al empleado" },
    { value: "99,7%", label: "Disponibilidad operativa últimos 90 días" },
    { value: "8-12 sem.", label: "Implantación estimada del piloto completo" }
  ];
  const heroPoints = [
    {
      marker: "01",
      title: "Diseño supervisado",
      text: "Compatibles con MiFID II, PRIIPs y controles de idoneidad desde el día uno."
    },
    {
      marker: "02",
      title: "Experiencia multirol",
      text: "Portales para empresa, empleados y compliance con trazabilidad y evidencias."
    },
    {
      marker: "03",
      title: "Operativa automatizada",
      text: "Flujo SEPA, conciliación y reporting gestionado por Invest Facility junto a entidades reguladas."
    }
  ];
  const planDetails = {
    CONS: {
      profile: "Sesgo defensivo",
      risk: "Riesgo bajo · preservación del capital",
      description: "Ideal para plantillas que priorizan estabilidad con un horizonte de corto/medio plazo.",
      allocation: "70% renta fija investment grade · 30% renta variable global",
      horizon: "≥ 2 años",
      bullets: [
        "Duración objetivo de 4-5 años con cobertura parcial de divisa.",
        "Sesgo a bonos corporativos IG y deuda soberana de la zona euro.",
        "Liquidez semanal gestionada por el custodio para aportaciones y rescates."
      ]
    },
    EQUL: {
      profile: "Crecimiento equilibrado",
      risk: "Riesgo moderado · diversificación global",
      description: "Pensado para ahorrar a medio plazo combinando crecimiento con control de volatilidad.",
      allocation: "55% renta variable global · 35% renta fija core · 10% alternativos líquidos",
      horizon: "≥ 4 años",
      bullets: [
        "Cartera de ETFs UCITS con reequilibrio mensual dentro de bandas de tolerancia.",
        "Exposición geográfica diversificada (EE. UU., Europa y Asia desarrollada).",
        "Alternativos líquidos para reducir la correlación y aportar estabilidad."
      ]
    },
    CREC: {
      profile: "Sesgo crecimiento",
      risk: "Riesgo dinámico · largo plazo",
      description: "Para empleados con horizonte largo que desean capturar la prima de renta variable.",
      allocation: "85% renta variable multifactor · 15% renta fija flexible",
      horizon: "≥ 6 años",
      bullets: [
        "Exposición global a temáticas de crecimiento y sectores innovadores.",
        "Gestión táctica trimestral con límites de drawdown definidos con el partner.",
        "Ventanas de switch supervisadas para mover posiciones entre planes sin fricción."
      ]
    }
  };
  const inclusions = [
    {
      title: "Arquitectura delegada",
      text: "Fondos UCITS con custodio regulado, contratos tripartitos y retrocesión 0 para el empleado."
    },
    {
      title: "Materiales listos",
      text: "KID, fichas comerciales, vídeo onboarding, emails y FAQs de soporte para RR. HH."
    },
    {
      title: "Reporting continuo",
      text: "Dashboards y exports con métricas agregadas, costes, ESG y seguimiento de adopción."
    },
    {
      title: "Operativa SEPA",
      text: "Generación de pain.001, conciliación con pain.002/camt.053 y gestión de incidencias."
    },
    {
      title: "Gobernanza compartida",
      text: "Comité mensual con la entidad regulada y Invest Facility para seguimiento y ajustes."
    },
    {
      title: "Soporte especializado",
      text: "Equipo compliance + customer success acompañando en lanzamiento y operación."
    }
  ];
  const operations = [
    {
      title: "Diseño de aportaciones",
      text: "Matching, topes, reglas de elegibilidad y ventanas de cambio parametrizadas en la plataforma."
    },
    {
      title: "Gestión de switches",
      text: "Procesamos solicitudes de traspaso entre planes en T+1 y registramos confirmaciones del custodio."
    },
    {
      title: "Informes y certificaciones",
      text: "Certificados anuales, reporting MiFID/PRIIPs y breakdown de costes por centro de coste."
    }
  ];
  const timeline = [
    {
      step: "T-30",
      title: "Kick-off y selección de carteras",
      text: "Validamos elección de planes, políticas de aportación y responsables de aprobación."
    },
    {
      step: "T-10",
      title: "Onboarding y simulaciones",
      text: "Carga de empleados, dry-run de pain.001 y formación a RR. HH. y gestores del plan."
    },
    {
      step: "T",
      title: "Ejecución de nómina",
      text: "Generación del fichero, validaciones automáticas y confirmación con banco custodio."
    },
    {
      step: "T+1/T+2",
      title: "Conciliación y reporting",
      text: "Actualizamos estados, publicamos informes y lanzamos comunicaciones al empleado."
    }
  ];
  const extras = [
    {
      title: "Kit de comunicación interna",
      text: "Presentaciones, emails, piezas visuales y microsite para anunciar el beneficio a la plantilla."
    },
    {
      title: "Mesa de soporte compartida",
      text: "Canal conjunto Invest Facility + entidad regulada para resolver incidencias en menos de 4 horas hábiles."
    },
    {
      title: "Análisis de adopción",
      text: "Insights periódicos con cohortes, segmentación por área y recomendaciones de engagement."
    }
  ];

  wrapper.append(
    html`<section class="card plan-hero">
      <div>
        <span class="badge">Carteras piloto con partners MiFID &amp; UCITS autorizados</span>
        <h1>Planes de inversión recurrente listos para lanzar en tu nómina</h1>
        <p class="subtitle">
          Diseñados para que la empresa ofrezca ahorro/inversión sin convertirse en entidad financiera. Nosotros
          orquestamos la experiencia, los procesos y la evidencia regulatoria.
        </p>
        <div class="pill-group">
          <span class="pill">Fondos UCITS sin retrocesión</span>
          <span class="pill">Clases limpias EUR</span>
          <span class="pill">Rebalanceo automático</span>
          <span class="pill">Reporting 360°</span>
        </div>
        <ul class="list-icon plan-hero-list">
          ${heroPoints
            .map(
              (point) => `<li>
            <span class="list-icon-marker">${point.marker}</span>
            <div>
              <strong>${point.title}</strong>
              <p>${point.text}</p>
            </div>
          </li>`
            )
            .join("")}
        </ul>
      </div>
      <div class="card plan-hero-panel">
        <h2>Métricas clave del piloto</h2>
        <div class="plan-metrics">
          ${metrics
            .map(
              (item) => `<article>
            <strong>${item.value}</strong>
            <p>${item.label}</p>
          </article>`
            )
            .join("")}
        </div>
        <p class="muted">Datos internos actualizados Q3 2024 · Dossier completo disponible bajo NDA.</p>
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <h2>Comparativa de carteras piloto</h2>
      <p class="subtitle">
        Tres perfiles paramétricos que cubren los principales horizontes temporales de la plantilla. Todos cumplen los
        criterios de idoneidad y documentación exigidos por MiFID II.
      </p>
      <div class="plan-grid">
        ${plans
          .map((plan) => {
            const detail = planDetails[plan.id] ?? {
              profile: "Plan piloto",
              risk: "Riesgo moderado",
              description: "Cartera diversificada para aportaciones periódicas.",
              allocation: "",
              horizon: "≥ 3 años",
              bullets: []
            };
            return `<article class="plan-card">
            <header class="plan-card-header">
              <span class="chip">${detail.profile}</span>
              <h3>${plan.name}</h3>
              <p>${detail.description}</p>
              <span class="plan-card-allocation">${detail.allocation}</span>
              <span class="plan-card-risk">${detail.risk}</span>
            </header>
            <div class="plan-card-metrics">
              <article>
                <span class="plan-card-metric-label">SRRI</span>
                <strong>${formatSrri(plan.srri)}</strong>
              </article>
              <article>
                <span class="plan-card-metric-label">TER objetivo</span>
                <strong>${formatTer(plan.ter)}</strong>
              </article>
              <article>
                <span class="plan-card-metric-label">Horizonte</span>
                <strong>${detail.horizon}</strong>
              </article>
            </div>
            ${detail.bullets.length
              ? `<ul class="plan-card-list">
              ${detail.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
            </ul>`
              : ""}
            <div class="plan-card-footer">
              <button type="button" class="button small" data-kid="${plan.id}">Ver KID piloto</button>
              <a class="button ghost small" href="/empleado/aportacion" data-link>Simular aportación</a>
            </div>
            <p class="muted">ISIN demo: ${plan.isin}</p>
          </article>`;
          })
          .join("")}
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <h2>¿Qué incluye el piloto?</h2>
      <p class="subtitle">
        Entregamos un programa completo para que el beneficio de ahorro quede desplegado con mínimo esfuerzo operativo
        para la empresa.
      </p>
      <div class="plan-benefits">
        ${inclusions
          .map(
            (item) => `<article>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </article>`
          )
          .join("")}
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <div class="layout-split plan-layout">
        <div>
          <h2>Operativa y soporte gestionados por Invest Facility</h2>
          <p class="subtitle">
            Coordinamos RR. HH., tesorería y la entidad regulada para que cada aportación quede controlada y documentada.
          </p>
          <ul class="plan-checklist">
            ${operations
              .map(
                (item) => `<li>
              <span class="plan-checklist-marker">✓</span>
              <div>
                <strong>${item.title}</strong>
                <p>${item.text}</p>
              </div>
            </li>`
              )
              .join("")}
          </ul>
        </div>
        <div class="card plan-timeline">
          <h3>Cadencia recomendada</h3>
          <ul>
            ${timeline
              .map(
                (item) => `<li>
              <span class="plan-timeline-step">${item.step}</span>
              <div>
                <strong>${item.title}</strong>
                <p>${item.text}</p>
              </div>
            </li>`
              )
              .join("")}
          </ul>
        </div>
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <h2>Recursos adicionales para tu comité</h2>
      <div class="plan-addons">
        ${extras
          .map(
            (item) => `<article>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </article>`
          )
          .join("")}
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card plan-cta">
      <div>
        <h2>Activa tus planes piloto con acompañamiento experto</h2>
        <p class="subtitle">
          Te guiamos desde la due diligence hasta el go-live y las primeras nóminas. Solicita el dossier completo o
          agenda una sesión con nuestro equipo.
        </p>
      </div>
      <div class="plan-cta-actions">
        <a class="button" href="/contacto" data-link>Solicitar dossier</a>
        <a class="button ghost" href="/seguridad" data-link>Ver cobertura de seguridad</a>
      </div>
    </section>`
  );

  wrapper.querySelectorAll("[data-kid]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const planId = event.currentTarget.dataset.kid;
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return;
      openSimplePdf({
        title: `KID piloto - ${plan.name}`,
        subtitle: "Documento informativo simulado sin validez legal",
        filename: `KID-${plan.id}.pdf`
      });
      showToast(`KID piloto generado para ${plan.name}`);
    });
  });
  return wrapper;
}

function renderSecurity() {
  setPageTitle(translate("public.security.metaTitle") || "Seguridad y cumplimiento");
  const wrapper = createEl("div");
  const stats = [
    { label: "Controles automatizados", value: "35+" },
    { label: "Parámetros monitorizados 24/7", value: "18" },
    { label: "Tiempo medio resolución crítica", value: "≤ 2h" },
    { label: "Partners regulados", value: "3 entidades" }
  ];
  const pillars = [
    {
      tag: "GR",
      title: "Gobierno regulatorio",
      description:
        "Operamos integrados con entidades MiFID y UCITS autorizadas que asumen la custodia y ejecución.",
      bullets: [
        "Contratos tripartitos con responsabilidades claras (banco custodio, gestora y Invest Facility).",
        "Procedimientos MiFID II, PRIIPs y KYC/AML documentados y accesibles para auditoría.",
        "KID, test de idoneidad y registros de aceptación disponibles en portal para compliance."
      ]
    },
    {
      tag: "PD",
      title: "Protección de datos",
      description: "Arquitectura multicapas con segregación estricta entre datos de empresa y empleado.",
      bullets: [
        "Datos personales cifrados en tránsito (TLS 1.2+) y en reposo (AES-256).",
        "Segregación lógica por tenant, políticas de retención y pseudonimización de informes.",
        "Evaluaciones de impacto (DPIA) y acuerdos de encargado de tratamiento listos para firmar."
      ]
    },
    {
      tag: "SO",
      title: "Seguridad operativa",
      description: "Monitorizamos la plataforma con prácticas DevSecOps y respuesta coordinada con partners.",
      bullets: [
        "Pipelines CI/CD con análisis SAST/DAST y revisión de dependencias.",
        "Pentesting anual con entidad independiente y programa de disclosure responsable.",
        "Plan de continuidad testado: DR entre regiones UE y simulacros semestrales."
      ]
    }
  ];
  const controls = [
    {
      title: "Segmentación y acceso",
      text: "RBAC granular, MFA para cuentas administrativas y zero standing privileges."
    },
    {
      title: "Integridad de procesos",
      text: "Reconciliación diaria de pagos SEPA, validación de límites y doble control antes de ejecutar órdenes."
    },
    {
      title: "Observabilidad",
      text: "Alertas en tiempo real, métricas SLA compartidas y dashboards de auditoría exportables."
    },
    {
      title: "Gestión de proveedores",
      text: "Revisiones trimestrales de partners críticos, contratos con cláusulas de seguridad y seguimiento de KPIs."
    }
  ];
  const dueDiligence = [
    {
      step: "01",
      title: "Kick-off compliance",
      text: "Presentamos marco regulatorio, matriz RACI y responsables técnicos para iniciar la evaluación."
    },
    {
      step: "02",
      title: "Entrega documental",
      text: "Políticas ISMS en progreso, evaluaciones GDPR, resultados de pentest y reportes de resiliencia."
    },
    {
      step: "03",
      title: "Testing conjunto",
      text: "Ejecución de casos de uso, revisión de logs, monitorización y checklist de segregación de funciones."
    },
    {
      step: "04",
      title: "Go-live supervisado",
      text: "Seguimiento con mesa de control durante las primeras nóminas y reporte post-implantación."
    }
  ];

  wrapper.append(
    html`<section class="card security-hero">
      <div>
        <span class="badge">Confianza regulatoria + resiliencia técnica</span>
        <h1>Seguridad &amp; Cumplimiento en cada flujo</h1>
        <p class="subtitle">
          Orquestamos la experiencia digital y los controles operativos mientras que las entidades MiFID y UCITS
          autorizadas ejecutan la inversión. Cada integración se valida con políticas compartidas de risk management.
        </p>
        <div class="pill-group">
          <span class="pill">MiFID II · MiFIR</span>
          <span class="pill">PRIIPs · KID digital</span>
          <span class="pill">GDPR by design</span>
          <span class="pill">SEPA SCT &amp; SCT Inst</span>
        </div>
        <ul class="list-icon">
          <li>
            <span class="list-icon-marker">01</span>
            <div>
              <strong>Gobierno conjunto con entidades reguladas</strong>
              <p>Roles definidos en acuerdos tripartitos con banco custodio, gestora y Invest Facility.</p>
            </div>
          </li>
          <li>
            <span class="list-icon-marker">02</span>
            <div>
              <strong>Controles automáticos end-to-end</strong>
              <p>Validaciones de órdenes, límites de riesgo, segregación de datos y reconciliación diaria.</p>
            </div>
          </li>
          <li>
            <span class="list-icon-marker">03</span>
            <div>
              <strong>Visibilidad real time para compliance</strong>
              <p>Dashboards de auditoría, alertas en línea y reporting exportable para comités.</p>
            </div>
          </li>
        </ul>
      </div>
      <div class="security-panel security-hero-panel">
        <h2>Puntos de control clave</h2>
        <dl class="security-stats">
          ${stats
            .map(
              (item) => `<div>
            <dt>${item.label}</dt>
            <dd>${item.value}</dd>
          </div>`
            )
            .join("")}
        </dl>
        <div class="pill-group">
          <span class="chip">ISMS incremental</span>
          <span class="chip">Assessments SOC2-like</span>
          <span class="chip">Pentesting anual</span>
        </div>
        <p class="muted">Actualizado Q1 2024 · Dossier completo disponible bajo NDA.</p>
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <h2>Pilares de confianza</h2>
      <p class="subtitle">
        Diseñamos la plataforma para que el cumplimiento normativo y la protección de los datos estén visibles desde el
        primer día del piloto.
      </p>
      <div class="grid three">
        ${pillars
          .map(
            (pillar) => `<article class="card security-pillar">
          <span class="security-pillar-icon">${pillar.tag}</span>
          <h3>${pillar.title}</h3>
          <p>${pillar.description}</p>
          <ul class="security-list">
            ${pillar.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
          </ul>
        </article>`
          )
          .join("")}
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card">
      <div class="layout-split security-layout">
        <div>
          <h2>Arquitectura segura por diseño</h2>
          <p class="subtitle">
            La infraestructura cloud sigue principios zero trust, disponibilidad multi-región y automatización de
            controles DevSecOps.
          </p>
          <ul class="security-list">
            ${controls
              .map(
                (control) => `<li>
              <div>
                <strong>${control.title}</strong>
                <p>${control.text}</p>
              </div>
            </li>`
              )
              .join("")}
          </ul>
        </div>
        <div class="security-panel security-panel-solid">
          <h3>Due diligence y auditoría</h3>
          <p>
            Entregamos evidencias, plantillas de reporte y acceso a entornos de pruebas para que tu comité valide cada
            control.
          </p>
          <ul class="security-timeline">
            ${dueDiligence
              .map(
                (step) => `<li>
              <span class="security-timeline-step">${step.step}</span>
              <div>
                <strong>${step.title}</strong>
                <p>${step.text}</p>
              </div>
            </li>`
              )
              .join("")}
          </ul>
        </div>
      </div>
    </section>`
  );

  wrapper.append(
    html`<section class="section card security-cta">
      <div>
        <h2>Listos para tu due diligence</h2>
        <p class="subtitle">
          Compartimos procedimientos, matrices de control y resultados de pruebas bajo NDA para acelerar la aprobación
          interna.
        </p>
      </div>
      <div class="security-cta-actions">
        <a class="button" href="/contacto" data-link>Agendar sesión técnica</a>
        <a class="button ghost" href="/legal/privacidad" data-link>Revisar políticas</a>
      </div>
    </section>`
  );

  return wrapper;
}

function renderFaq() {
  setPageTitle(translate("public.faq.metaTitle") || "Preguntas frecuentes");
  const wrapper = createEl("section", { className: "card faq-simple" });
  const title = translate("public.faq.heading") || "Preguntas frecuentes";
  const subtitle =
    translate("public.faq.subtitle") ||
    "Respuestas breves a las dudas más comunes sobre el piloto de Invest Facility. Escríbenos si necesitas más detalle para tu comité o equipo.";
  const ctaPrompt = translate("public.faq.cta.prompt") || "¿No encuentras lo que buscas?";
  const ctaButton = translate("public.faq.cta.button") || "Contáctanos";
  const entries = getGeneralFaq().map((item, index) => ({
    ...item,
    q: translate(`public.faq.entries.${index}.question`) || item.q,
    a: translate(`public.faq.entries.${index}.answer`) || item.a
  }));
  wrapper.append(
    html`<h1 data-i18n-ignore>${title}</h1>
      <p class="subtitle" data-i18n-ignore>${subtitle}</p>
      <div class="faq-list" data-i18n-ignore>
        ${entries
          .map(
            (item) => `<details class="faq-entry" data-i18n-ignore>
          <summary>
            <span>${item.q}</span>
            <span class="faq-entry-arrow" aria-hidden="true"></span>
          </summary>
          <p>${item.a}</p>
        </details>`
          )
          .join("")}
      </div>
      <div class="faq-inline-cta" data-i18n-ignore>
        <span>${ctaPrompt}</span>
        <a href="/contacto" data-link class="button ghost small">${ctaButton}</a>
      </div>`
  );
  return wrapper;
}

function renderContact() {
  setPageTitle(translate("public.contact.metaTitle") || "Contacto");
  const wrapper = createEl("section", { className: "card" });
  const formId = "contact-form-piloto";
  const privacyLink = `<a href="/legal/privacidad" data-link>${
    translate("footer.links.privacy") || "Privacidad"
  }</a>`;
  const copy = {
    heading: translate("public.contact.heading") || "¿Hablamos?",
    subtitle:
      translate("public.contact.subtitle") ||
      "Envía tus datos y te contactaremos para activar el piloto. Este formulario es de muestra: los envíos se confirman con un toast.",
    form: {
      nameLabel: translate("public.contact.form.name.label") || "Nombre",
      namePlaceholder: translate("public.contact.form.name.placeholder") || "Tu nombre",
      companyLabel: translate("public.contact.form.company.label") || "Empresa",
      companyPlaceholder:
        translate("public.contact.form.company.placeholder") || "Nombre de la empresa",
      emailLabel: translate("public.contact.form.email.label") || "Email",
      emailPlaceholder:
        translate("public.contact.form.email.placeholder") || "nombre@empresa.com",
      employeesLabel: translate("public.contact.form.employees.label") || "Empleados (aprox.)",
      employeesPlaceholder: translate("public.contact.form.employees.placeholder") || "100",
      messageLabel: translate("public.contact.form.message.label") || "Mensaje",
      messagePlaceholder:
        translate("public.contact.form.message.placeholder") || "Cuéntanos tus objetivos con el plan de ahorro",
      privacyHtml:
        translate("public.contact.form.privacy", { params: { privacyLink } }) ||
        `Acepto la ${privacyLink} vigente.`,
      submit: translate("public.contact.form.submit") || "Enviar",
      toast: (
        translate("public.contact.form.toast") ||
        "Formulario enviado en modo simulación. No se ha realizado ningún envío real."
      ).trim()
    }
  };
  wrapper.append(
    html`<h1 data-i18n-ignore>${copy.heading}</h1>
      <p class="subtitle" data-i18n-ignore>${copy.subtitle}</p>
      <form id="${formId}" data-i18n-ignore>
        <div class="form-row">
          <div>
            <label for="contact-name">${copy.form.nameLabel}</label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              placeholder="${copy.form.namePlaceholder}"
            />
          </div>
          <div>
            <label for="contact-company">${copy.form.companyLabel}</label>
            <input
              id="contact-company"
              name="company"
              type="text"
              placeholder="${copy.form.companyPlaceholder}"
            />
          </div>
        </div>
        <div class="form-row">
          <div>
            <label for="contact-email">${copy.form.emailLabel}</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              placeholder="${copy.form.emailPlaceholder}"
            />
          </div>
          <div>
            <label for="contact-employees">${copy.form.employeesLabel}</label>
            <input
              id="contact-employees"
              name="employees"
              type="number"
              min="1"
              placeholder="${copy.form.employeesPlaceholder}"
            />
          </div>
        </div>
        <div>
          <label for="contact-message">${copy.form.messageLabel}</label>
          <textarea
            id="contact-message"
            name="message"
            rows="4"
            placeholder="${copy.form.messagePlaceholder}"
          ></textarea>
        </div>
        <label>
          <input type="checkbox" required />
          ${copy.form.privacyHtml}
        </label>
        <div class="form-actions">
          <button type="submit" class="button">${copy.form.submit}</button>
        </div>
      </form>`
  );

  wrapper.querySelector(`#${formId}`).addEventListener("submit", (event) => {
    event.preventDefault();
    showToast(copy.form.toast);
    event.target.reset();
  });

  return wrapper;
}

function renderLegalPage({ titleKey, fallbackTitle, content }) {
  const heading = translate(titleKey) || fallbackTitle;
  setPageTitle(heading);
  const wrapper = createEl("article", { className: "card legal" });
  wrapper.append(html`<nav>
      <a href="/legal/aviso" data-link>Aviso legal</a>
      <a href="/legal/privacidad" data-link>Privacidad</a>
      <a href="/legal/cookies" data-link>Cookies</a>
      <a href="/legal/terminos" data-link>Términos</a>
    </nav>
    <h1>${heading}</h1>
    ${content}`);
  return wrapper;
}

function getGeneralFaq() {
  return [
    {
      category: "regulatory",
      q: "¿La plataforma custodia dinero o instrumentos?",
      a: "No. Invest Facility es un proveedor tecnológico. Toda custodia y ejecución la realiza una entidad financiera autorizada (banco/ESI/gestora+depositario)."
    },
    {
      category: "employees",
      q: "¿Qué pasa si un empleado deja la empresa?",
      a: "Se detienen automáticamente las aportaciones vía nómina y la cuenta sigue operativa en el custodio. El empleado conserva la inversión y puede continuar desde la entidad financiera."
    },
    {
      category: "support",
      q: "¿Se pueden añadir más planes o gestoras?",
      a: "Sí. El roadmap contempla incorporar más carteras, producto sostenible (SFDR art. 8/9) y, posteriormente, Planes de Pensiones de Empleo."
    },
    {
      category: "operativa",
      q: "¿Hay mínimo de aportación?",
      a: "El MVP arranca con 50 € mensuales por empleado como mínimo configurable. Se pueden fijar límites máximos por política interna."
    },
    {
      category: "operativa",
      q: "¿Qué ocurre con fallos de pago?",
      a: "La consola de operaciones detecta fallos, genera reintentos según reglas y permite gestionar incidencias desde RR. HH. con trazabilidad."
    },
    {
      category: "operativa",
      q: "¿Cómo se gestionan las altas y bajas de empleados?",
      a: "Puedes cargar altas/bajas por CSV o API. Las bajas detienen aportaciones futuras y notifican al custodio; las altas se validan con KYC/MiFID y se incluyen automáticamente en el próximo corte."
    },
    {
      category: "employees",
      q: "¿Puede el empleado pausar o modificar su aportación?",
      a: "Sí. Desde el portal empleado puede pausar, reactivar o ajustar la cantidad mensual. Toda modificación queda registrada y sincronizada con el fichero de nómina."
    },
    {
      category: "support",
      q: "¿Qué soporte recibe la empresa durante el piloto?",
      a: "Dispones de un canal dedicado con SLA 8×5, comité quincenal y documentación viva (checklists, guías, manual de comunicación) compartida con RR. HH. y compliance."
    },
    {
      category: "regulatory",
      q: "¿Cómo se protegen los datos personales?",
      a: "Trabajamos con un modelo GDPR by design: cifrado en tránsito y en reposo, segregación por empresa, accesos RBAC y evaluaciones de impacto (DPIA) listas para revisar."
    },
    {
      category: "support",
      q: "¿Qué documentación entregáis para la due diligence?",
      a: "Facilitamos matriz RACI, políticas ISMS en progreso, evidencias de pruebas (SAST/DAST, pentest), flujos SEPA y plantillas de acuerdos tripartitos para validación interna."
    }
  ];
}

function getLegalNoticeContent() {
  return html`<p>
      Invest Facility Labs, S.L. (en adelante, “Invest Facility”) explota esta plataforma tecnológica piloto. La información
      aquí contenida no constituye oferta ni recomendación de inversión. La ejecución de órdenes, la recepción y
      transmisión (en su caso), el KYC/AML y la custodia son prestados por entidades financieras autorizadas que
      deberán formalizarse mediante contratos específicos.
    </p>
    <h2>Datos de contacto</h2>
    <p>info@investfacility.test · Paseo Prueba 123, 28000 Madrid.</p>
    <h2>Limitación de responsabilidad</h2>
    <p>
      Esta versión piloto no procesa datos reales ni acepta fondos. Invest Facility no será responsable de pérdidas derivadas
      de la interpretación de la información contenida en el sitio.
    </p>`;
}

function getPrivacyContent() {
  return html`<p>
      Esta versión piloto almacena información ficticia en el navegador (localStorage y sessionStorage) para simular la
      experiencia del producto. No se envían datos a servidores ni se comparten con terceros.
    </p>
    <h2>Tratamiento simulado</h2>
    <p>
      Los formularios y acciones guardan estado local para mostrar funcionalidades. Puedes borrar todos los datos
      desde el portal empleado → Perfil → “Restablecer datos”.
    </p>
    <h2>Derechos</h2>
    <p>
      Dado que no se tratan datos reales, los derechos GDPR no aplican en esta versión piloto. Para el producto real,
      se formalizará un DPA con la entidad promotora y los proveedores regulados.
    </p>`;
}

function getCookiesContent() {
  return html`<p>
      Esta versión piloto no utiliza cookies ni trackers externos. El almacenamiento local se limita a datos simulados
      para mantener la sesión y preferencias de la experiencia.
    </p>
    <h2>Cookies técnicas</h2>
    <p>No se crean. El producto final permitirá configurar consentimiento granular conforme a la LSSI y GDPR.</p>`;
}

function getTermsContent() {
  return html`<p>
      El acceso a esta versión piloto implica la aceptación de que se trata de una simulación sin obligaciones
      contractuales. Los flujos mostrados son orientativos y deben validarse con asesoría legal y las entidades
      financieras colaboradoras.
    </p>
    <h2>Uso permitido</h2>
    <p>
      Se autoriza su visualización para fines internos de evaluación. Queda prohibida la reproducción sin permiso
      expreso de Invest Facility.
    </p>
    <h2>Propiedad intelectual</h2>
    <p>
      El diseño, textos y código pertenecen a Invest Facility Labs, S.L. No se concede licencia alguna más allá del uso piloto
      temporal.
    </p>`;
}
