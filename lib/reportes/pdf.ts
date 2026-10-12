import type { Col, EmpresaDoc, ReportDef } from "./tipos";
import { ajustarLogo, cargarImagen, fmtEmision, tipoImagen } from "./formato";

type JsPDF = import("jspdf").jsPDF;
async function nuevoDoc(opts: import("jspdf").jsPDFOptions): Promise<JsPDF> {
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
  return new jsPDF(opts);
}

function pesos<T>(cols: Col<T>[], ancho: number, x0: number) {
  const total = cols.reduce((s, c) => s + c.width, 0);
  const anchos = cols.map((c) => (c.width / total) * ancho);
  const xs: number[] = [];
  let acc = x0;
  anchos.forEach((w) => { xs.push(acc); acc += w; });
  return { anchos, xs };
}

/* ======================= TICKET POS 80 mm ======================= */
export async function pdfPos80<T>(def: ReportDef<T>, emp: EmpresaDoc): Promise<Blob> {
  const ANCHO = 80, M = 6, UTIL = ANCHO - M * 2, CX = ANCHO / 2;
  const cols = def.columnas.filter((c) => c.pos !== false);
  const FS = 6.5, LH = FS * 0.42 + 1;

  // Altura estimada (el ticket se dimensiona al contenido)
  const lineasEmp = 6 + (def.subtitulo?.length ?? 0);
  const alto = Math.max(120, 30 + lineasEmp * 5 + def.filas.length * (LH + 1.4) + (def.resumen?.length ?? 0) * 5 + 20);
  const doc = await nuevoDoc({ unit: "mm", format: [ANCHO, alto] });
  let y = 6;

  const texto = (t: string, o: { align?: "left" | "center" | "right"; size?: number; bold?: boolean } = {}) => {
    const { align = "left", size = 8, bold = false } = o;
    doc.setFont("courier", bold ? "bold" : "normal"); doc.setFontSize(size);
    doc.splitTextToSize(t, UTIL).forEach((l: string) => {
      doc.text(l, align === "center" ? CX : align === "right" ? ANCHO - M : M, y, { align });
      y += size * 0.42 + 1.2;
    });
  };
  const linea = (dashed = true) => { doc.setLineDashPattern(dashed ? [0.5, 0.5] : [], 0); doc.setDrawColor(0); doc.line(M, y, ANCHO - M, y); y += 3; };

  if (emp.logo) {
    const logo = await cargarImagen(emp.logo);
    if (logo) {
      const { w, h } = ajustarLogo(logo.width, logo.height, 30, 16);
      try { doc.addImage(logo.data, tipoImagen(logo.data), CX - w / 2, y, w, h); y += h + 3; } catch { /* logo inválido: se omite */ }
    }
  }
  texto(emp.nombre, { align: "center", bold: true, size: 9 });
  if (emp.ruc) texto(`RUC: ${emp.ruc}`, { align: "center", size: 7.5 });
  y += 2;
  texto(def.titulo.toUpperCase(), { align: "center", bold: true, size: 9.5 });
  linea();
  (def.subtitulo ?? []).forEach((s) => texto(s, { size: 7.5 }));
  texto(`Emitido: ${fmtEmision()}`, { size: 7.5 });
  linea();

  const { anchos, xs } = pesos(cols, UTIL, M);
  doc.setFont("courier", "bold"); doc.setFontSize(FS);
  cols.forEach((c, i) => doc.text(c.header, c.align === "right" ? xs[i] + anchos[i] : xs[i], y, { align: c.align === "right" ? "right" : "left" }));
  y += 3.5; doc.line(M, y, ANCHO - M, y); y += 3;

  doc.setFont("courier", "normal"); doc.setFontSize(FS);
  def.filas.forEach((f) => {
    const celdas = cols.map((c, i) => doc.splitTextToSize(c.render(f), anchos[i]) as string[]);
    const n = Math.max(...celdas.map((c) => c.length));
    celdas.forEach((ls, i) => ls.forEach((l, k) =>
      doc.text(l, cols[i].align === "right" ? xs[i] + anchos[i] : xs[i], y + k * LH, { align: cols[i].align === "right" ? "right" : "left" })));
    y += n * LH + 1;
  });
  linea(false);
  (def.resumen ?? []).forEach((r) => texto(`${r.label}: ${r.value}`, { bold: r.bold, size: r.bold ? 8 : 7.5 }));
  linea();
  texto("Reporte generado por el sistema", { align: "center", size: 6.5 });
  return doc.output("blob");
}

/* ============================= A4 ============================= */
export async function pdfA4<T>(def: ReportDef<T>, emp: EmpresaDoc): Promise<Blob> {
  const M = 20, W = 210, H = 297, UTIL = W - M * 2;
  const doc = await nuevoDoc({ unit: "mm", format: "a4" });
  let y = 20;
  const HDR = 8, PAD = 2;

  // Cabecera de empresa (texto a la izquierda, logo a la derecha)
  const yIni = y;
  let yTxt = yIni, altoLogo = 0;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(emp.nombre, M, yTxt); yTxt += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(60);
  [emp.ruc ? `RUC: ${emp.ruc}` : "", emp.direccion ?? "", emp.ubicacion ?? ""]
    .filter(Boolean).forEach((l) => { doc.text(l, M, yTxt); yTxt += 4; });
  doc.setTextColor(0);
  if (emp.logo) {
    const logo = await cargarImagen(emp.logo);
    if (logo) {
      const { w, h } = ajustarLogo(logo.width, logo.height, 35, 22);
      try { doc.addImage(logo.data, tipoImagen(logo.data), W - M - w, yIni, w, h); altoLogo = h; } catch { /* omitido */ }
    }
  }
  y = yIni + Math.max(yTxt - yIni, altoLogo) + 6;
  doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(M, y, W - M, y); y += 8;

  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text(def.titulo, M, y); y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80);
  [...(def.subtitulo ?? []), `Fecha de emisión: ${fmtEmision()}`].forEach((l) => { doc.text(l, M, y); y += 5; });
  doc.setTextColor(0); y += 3;
  doc.setDrawColor(180); doc.setLineWidth(0.2); doc.line(M, y, M + UTIL, y); y += 7;

  const { anchos, xs } = pesos(def.columnas, UTIL, M);
  const cabecera = () => {
    doc.setFillColor(232, 232, 232); doc.setDrawColor(120); doc.setLineWidth(0.2);
    doc.rect(M, y, UTIL, HDR, "FD");
    let acc = M; anchos.forEach((w, i) => { if (i > 0) doc.line(acc, y, acc, y + HDR); acc += w; });
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30);
    def.columnas.forEach((c, i) => {
      const al = c.align ?? "left";
      const px = al === "right" ? xs[i] + anchos[i] - PAD : al === "center" ? xs[i] + anchos[i] / 2 : xs[i] + PAD;
      doc.text(c.header, px, y + HDR / 2 + 1.3, { align: al });
    });
    y += HDR;
  };
  cabecera();

  const LH = 9 * 0.38 + 1.2;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  def.filas.forEach((f, idx) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const celdas = def.columnas.map((c, i) => doc.splitTextToSize(c.render(f), anchos[i] - PAD * 2) as string[]);
    const n = Math.max(...celdas.map((c) => c.length));
    const alto = n * LH + PAD * 1.5;
    if (y + alto > H - 22) { doc.addPage(); y = 20; cabecera(); }
    if (idx % 2 === 1) { doc.setFillColor(247, 247, 247); doc.rect(M, y, UTIL, alto, "F"); }
    doc.setDrawColor(210); doc.setLineWidth(0.15); doc.rect(M, y, UTIL, alto);
    let acc = M; anchos.forEach((w, i) => { if (i > 0) doc.line(acc, y, acc, y + alto); acc += w; });
    doc.setTextColor(30);
    celdas.forEach((ls, i) => {
      const al = def.columnas[i].align ?? "left";
      const px = al === "right" ? xs[i] + anchos[i] - PAD : al === "center" ? xs[i] + anchos[i] / 2 : xs[i] + PAD;
      ls.forEach((l, k) => doc.text(l, px, y + PAD + 2.2 + k * LH, { align: al }));
    });
    y += alto;
  });
  if (def.filas.length === 0) {
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text("Sin registros para el periodo seleccionado.", M + PAD, y + 6); doc.setTextColor(0); y += 10;
  }

  doc.setDrawColor(180); doc.setLineWidth(0.2); doc.line(M, y, M + UTIL, y); y += 7 + 2;
  (def.resumen ?? []).forEach((r) => {
    if (y > H - 20) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", r.bold ? "bold" : "normal"); doc.setFontSize(r.bold ? 11 : 10); doc.setTextColor(0);
    doc.text(r.label, M, y); doc.text(r.value, W - M, y, { align: "right" }); y += 7;
  });

  return doc.output("blob");
}
