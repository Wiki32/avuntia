export function parseCsv(text, { separator = ",", required = [] } = {}) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new Error("El archivo CSV está vacío");
  }
  const headers = lines[0].split(separator).map((h) => h.trim());
  const missing = required.filter((field) => !headers.includes(field));
  if (missing.length) {
    throw new Error(`Faltan columnas obligatorias: ${missing.join(", ")}`);
  }
  const rows = lines.slice(1).map((line, index) => {
    const values = line.split(separator).map((value) => value.trim());
    const entry = {};
    headers.forEach((header, columnIndex) => {
      entry[header] = values[columnIndex] ?? "";
    });
    return { row: index + 2, data: entry };
  });
  return { headers, rows };
}
