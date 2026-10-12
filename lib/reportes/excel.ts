import type { EmpresaDoc, ReportDef } from "./tipos";
import { cargarImagen, fmtEmision } from "./formato";

const BORDE = { style: "thin" as const, color: { argb: "FFE4E4E7" } };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

export async function excelReporte<T>(def: ReportDef<T>, emp: EmpresaDoc): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(def.titulo.slice(0, 31).replace(/[\\/*?:[\]]/g, " "), { views: [{ showGridLines: false }] });
  const n = Math.max(def.columnas.length, 4);
  let fila = 1;
  const fusionar = (f: number) => { try { ws.mergeCells(f, 1, f, n); } catch { /* ya fusionado */ } };

  if (emp.logo) {
    const logo = await cargarImagen(emp.logo);
    if (logo) {
      const ext = /image\/jpe?g/.test(logo.data) ? "jpeg" : "png";
      const id = wb.addImage({ base64: logo.data, extension: ext });
      const h = 56, w = Math.min(160, (logo.width / logo.height) * h);
      ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: w, height: h } });
      fila += 4;
    }
  }
  const linea = (t: string, font: Partial<import("exceljs").Font>) => {
    const c = ws.getCell(fila, 1); c.value = t; c.font = font; fusionar(fila); fila++;
  };
  linea(emp.nombre, { bold: true, size: 13 });
  if (emp.ruc) linea(`RUC: ${emp.ruc}`, { size: 10, color: { argb: "FF71717A" } });
  if (emp.direccion) linea(emp.direccion, { size: 10, color: { argb: "FF71717A" } });
  fila++;
  linea(def.titulo, { bold: true, size: 18, color: { argb: "FF18181B" } });
  [...(def.subtitulo ?? []), `Fecha de emisión: ${fmtEmision()}`].forEach((s) => linea(s, { size: 10.5, color: { argb: "FF71717A" } }));
  fila++;

  def.columnas.forEach((c, i) => {
    const cell = ws.getCell(fila, i + 1);
    cell.value = c.header;
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE4E4E7" } };
    cell.alignment = { horizontal: c.align ?? "left", vertical: "middle" };
    cell.border = BORDES;
  });
  ws.getRow(fila).height = 22; fila++;

  def.filas.forEach((f, idx) => {
    def.columnas.forEach((c, i) => {
      const cell = ws.getCell(fila, i + 1);
      cell.value = c.value ? c.value(f) : c.render(f);
      cell.font = { size: 10.5 };
      cell.alignment = { horizontal: c.align ?? (typeof cell.value === "number" ? "right" : "left"), vertical: "middle" };
      cell.border = BORDES;
      if (typeof cell.value === "number" && c.align === "right") cell.numFmt = "#,##0.00";
      if (idx % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F8" } };
    });
    ws.getRow(fila).height = 20; fila++;
  });
  def.columnas.forEach((c, i) => { ws.getColumn(i + 1).width = Math.max(12, Math.round(c.width * 3.2), c.header.length + 4); });

  fila++;
  (def.resumen ?? []).forEach((r) => {
    const l = ws.getCell(fila, 1); l.value = r.label; l.font = { bold: true, size: r.bold ? 13 : 11 };
    const v = ws.getCell(fila, n); v.value = r.value; v.font = { bold: true, size: r.bold ? 13 : 11 }; v.alignment = { horizontal: "right" };
    fila++;
  });
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
