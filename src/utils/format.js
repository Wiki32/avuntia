const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("es-ES");

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit"
});

export function formatCurrency(value) {
  return currencyFormatter.format(value);
}

export function formatNumber(value) {
  return numberFormatter.format(value);
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

export function formatTime(value) {
  const date = typeof value === "string" ? new Date(`1970-01-01T${value}`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return timeFormatter.format(date);
}

export function formatPercent(value) {
  return `${value}%`;
}

export function formatSrri(value) {
  return `SRRI ${value}/7`;
}

export function formatTer(value) {
  return `${value.toFixed(2)}%`;
}
