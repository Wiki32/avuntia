function escapePdfText(text) {
  return text.replace(/([\\()])/g, "\\$1");
}

export function createSimplePdf({ title, subtitle }) {
  const objects = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  const streamContent = [
    "BT",
    "/F1 18 Tf",
    "72 760 Td",
    `(${escapePdfText(title)}) Tj`,
    "0 -28 Td",
    `(${escapePdfText(subtitle)}) Tj`,
    "ET",
    ""
  ].join("\n");
  objects.push(
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`
  );
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  let content = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(content.length);
    content += obj;
  }
  const xrefOffset = content.length;
  content += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    content += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  content += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return content;
}

export function openSimplePdf({ title, subtitle, filename }) {
  const pdfString = createSimplePdf({ title, subtitle });
  const blob = new Blob([pdfString], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.target = "_blank";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
