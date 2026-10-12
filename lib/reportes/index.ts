import type { EmpresaDoc, Formato, ReportDef } from "./tipos";
import { descargarBlob } from "./formato";

export * from "./tipos";
export * from "./formato";

/** Genera y descarga el reporte en el formato pedido. Las librerías pesadas se cargan solo al exportar. */
export async function exportarReporte<T>(def: ReportDef<T>, formato: Formato, emp: EmpresaDoc) {
  if (formato === "excel") {
    const { excelReporte } = await import("./excel");
    descargarBlob(await excelReporte(def, emp), `${def.archivo}`, "xlsx");
    return;
  }
  const { pdfA4, pdfPos80 } = await import("./pdf");
  const blob = formato === "pos80" ? await pdfPos80(def, emp) : await pdfA4(def, emp);
  descargarBlob(blob, `${def.archivo}_${formato === "pos80" ? "pos80" : "a4"}`, "pdf");
}

/** Abre el PDF en una pestaña nueva (vista previa / impresión). */
export async function previsualizarReporte<T>(def: ReportDef<T>, formato: "pos80" | "a4", emp: EmpresaDoc) {
  const { pdfA4, pdfPos80 } = await import("./pdf");
  const blob = formato === "pos80" ? await pdfPos80(def, emp) : await pdfA4(def, emp);
  window.open(URL.createObjectURL(blob), "_blank");
}
