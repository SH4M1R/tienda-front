// Build de navegador de jsPDF (evita el build "node" que Turbopack no puede empaquetar en SSR).
declare module "jspdf/dist/jspdf.es.min.js" {
  export * from "jspdf";
}
