export const seedData = {
  company: { name: "Acme S.L.", logo: "/assets/acme.svg" },
  cutOff: { day: 25, time: "18:00" },
  planTypes: [
    {
      id: "CONSERVADOR",
      name: "Perfil conservador",
      description: "Enfoque defensivo con volatilidad acotada y preservación del capital.",
      riskLevel: "Bajo",
      assetMix: "70% renta fija global + 30% renta variable"
    },
    {
      id: "EQUILIBRADO",
      name: "Perfil equilibrado",
      description: "Diversificación mixta para captar crecimiento manteniendo estabilidad.",
      riskLevel: "Medio",
      assetMix: "50% renta variable + 40% renta fija + 10% alternativos"
    },
    {
      id: "DINAMICO",
      name: "Perfil dinámico",
      description: "Mayor exposición a renta variable para horizontes a largo plazo.",
      riskLevel: "Medio-alto",
      assetMix: "85% renta variable global + 15% renta fija flexible"
    }
  ],
  plans: [
    {
      id: "CONS",
      name: "Plan Conservador",
      typeId: "CONSERVADOR",
      srri: 3,
      ter: 0.3,
      isin: "KIDCONSDEMO"
    },
    {
      id: "EQUL",
      name: "Plan Equilibrado",
      typeId: "EQUILIBRADO",
      srri: 4,
      ter: 0.32,
      isin: "KIDEQULDEMO"
    },
    {
      id: "CREC",
      name: "Plan Crecimiento",
      typeId: "DINAMICO",
      srri: 6,
      ter: 0.35,
      isin: "KIDCRECDEMO"
    }
  ],
  employees: [
    {
      id: "u1",
      name: "Ana López",
      email: "ana@acme.com",
      plan: "CONS",
      amount: 100,
      status: "active",
      kycStatus: "completed",
      mifidStatus: "adequate"
    },
    {
      id: "u2",
      name: "David Pérez",
      email: "david@acme.com",
      plan: "CREC",
      amount: 150,
      status: "paused",
      kycStatus: "pending",
      mifidStatus: "pending"
    },
    {
      id: "u3",
      name: "Laura García",
      email: "laura@acme.com",
      plan: "CREC",
      amount: 200,
      status: "active",
      kycStatus: "completed",
      mifidStatus: "adequate"
    },
    {
      id: "u4",
      name: "Jorge Martín",
      email: "jorge@acme.com",
      plan: "CONS",
      amount: 80,
      status: "active",
      kycStatus: "review",
      mifidStatus: "adequate"
    },
    {
      id: "u5",
      name: "Sofía Ramos",
      email: "sofia@acme.com",
      plan: "EQUL",
      amount: 120,
      status: "active",
      kycStatus: "completed",
      mifidStatus: "adequate"
    }
  ],
  companyStats: {
    adoptionPct: 44,
    avgContribution: 130,
    nextCutoff: "2025-11-25T18:00:00Z",
    paymentIssues: 1
  },
  adminCompanies: [
    {
      id: "cmp-atlas",
      name: "Atlas Retail",
      sector: "Retail",
      country: "España",
      headcount: 950,
      adoption: 38,
      avgTicket: 85,
      monthlyContribution: 30685,
      payrollSystem: "Meta4",
      stage: "pilot",
      contact: "sandra.cfo@atlasretail.com",
      createdAt: "2025-01-12T09:15:00Z",
      notes: "Integración SSO verificada. Pendiente de checklist de seguridad para mover a producción."
    },
    {
      id: "cmp-nimbus",
      name: "Nimbus Logistics",
      sector: "Logística",
      country: "España",
      headcount: 420,
      adoption: 52,
      avgTicket: 95,
      monthlyContribution: 20750,
      payrollSystem: "SAP HCM",
      stage: "due-diligence",
      contact: "fernando.hr@nimbus.com",
      createdAt: "2025-02-02T14:40:00Z",
      notes: "Revisión legal y de DPA en curso. Solicitan sandbox con datos sintéticos."
    },
    {
      id: "cmp-tandem",
      name: "Tándem Digital",
      sector: "Tecnología",
      country: "Portugal",
      headcount: 180,
      adoption: 65,
      avgTicket: 110,
      monthlyContribution: 12870,
      payrollSystem: "Factorial",
      stage: "activo",
      contact: "ines.ops@tandemdigital.pt",
      createdAt: "2024-12-05T08:00:00Z",
      notes: "Piloto completado. OAuth firmado con vida útil de 12 meses."
    },
    {
      id: "cmp-zenith",
      name: "Zenith Manufacturing",
      sector: "Manufactura",
      country: "España",
      headcount: 750,
      adoption: 24,
      avgTicket: 70,
      monthlyContribution: 12600,
      payrollSystem: "Workday",
      stage: "prospect",
      contact: "alicia.finance@zenith.com",
      createdAt: "2025-02-10T11:10:00Z",
      notes: "Necesitan PoC de conciliación SEPA antes de escalar."
    }
  ],
  movements: [
    { employeeId: "u1", date: "2025-06-01", amount: 100, status: "ok", planId: "CONS" },
    { employeeId: "u1", date: "2025-07-01", amount: 100, status: "ok", planId: "CONS" },
    { employeeId: "u1", date: "2025-08-01", amount: 100, status: "ok", planId: "CONS" },
    { employeeId: "u1", date: "2025-09-01", amount: 100, status: "ok", planId: "CONS" },
    { employeeId: "u1", date: "2025-10-01", amount: 100, status: "ok", planId: "CONS" },
    { employeeId: "u2", date: "2025-06-01", amount: 150, status: "ok", planId: "CREC" },
    { employeeId: "u2", date: "2025-07-01", amount: 150, status: "ok", planId: "CREC" },
    { employeeId: "u2", date: "2025-08-01", amount: 150, status: "ok", planId: "CREC" },
    { employeeId: "u2", date: "2025-09-01", amount: 150, status: "failed", planId: "CREC" },
    { employeeId: "u2", date: "2025-10-01", amount: 0, status: "paused", planId: "CREC" },
    { employeeId: "u3", date: "2025-07-01", amount: 200, status: "ok", planId: "CREC" },
    { employeeId: "u3", date: "2025-08-01", amount: 200, status: "ok", planId: "CREC" },
    { employeeId: "u3", date: "2025-09-01", amount: 200, status: "ok", planId: "CREC" },
    { employeeId: "u3", date: "2025-10-01", amount: 200, status: "ok", planId: "CREC" },
    { employeeId: "u4", date: "2025-08-01", amount: 80, status: "ok", planId: "CONS" },
    { employeeId: "u4", date: "2025-09-01", amount: 80, status: "ok", planId: "CONS" },
    { employeeId: "u4", date: "2025-10-01", amount: 80, status: "ok", planId: "CONS" },
    { employeeId: "u5", date: "2025-07-01", amount: 120, status: "ok", planId: "EQUL" },
    { employeeId: "u5", date: "2025-08-01", amount: 120, status: "ok", planId: "EQUL" },
    { employeeId: "u5", date: "2025-09-01", amount: 120, status: "ok", planId: "EQUL" },
    { employeeId: "u5", date: "2025-10-01", amount: 120, status: "ok", planId: "EQUL" }
  ]
};
