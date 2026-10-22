import type { jsPDF as JsPDF } from 'jspdf';
import type { Venta } from '@/lib/types';
import { medioLabel } from '@/lib/types';
import { montoEnLetras } from './montoEnLetras';
import { fmtPeso } from '@/lib/peso';

/** Datos de la empresa que usa el comprobante. */
export interface EmpresaBoleta {
  nombreComercial?: string | null;
  razonSocial?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  departamento?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  logo?: string | null;
}
type EmpresaForm = EmpresaBoleta;

const labelTipo: Record<string, string> = {
  UNIDAD: '',
  CAJA: 'Caja',
};

// Encabezado del comprobante según el tipo de venta guardado en el backend
// (Venta.tipoVenta: nota_venta / boleta / factura).
const labelComprobante: Record<string, string> = {
  NOTA_VENTA: 'NOTA DE VENTA',
  TICKET: 'NOTA DE VENTA',
  BOLETA: 'BOLETA DE VENTA ELECTRÓNICA',
  FACTURA: 'FACTURA ELECTRÓNICA',
};

const ANCHO = 80; // mm
const MARGEN = 5; // mm
const ANCHO_UTIL = ANCHO - MARGEN * 2;

const COL_PROD = 38;
const X_PROD = MARGEN;
const X_CANT_R = MARGEN + 48;
const X_PUNIT_R = MARGEN + 59;
const X_IMP_R = ANCHO - MARGEN;

const MAX_ALTO_LOGO = 20; // límite razonable de alto para el logo del ticket

async function cargarImagenBase64(url: string): Promise<{ data: string; ratio: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const data: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.src = data;
    });
    return { data, ratio: dim.h / dim.w };
  } catch {
    return null;
  }
}

function renderBoleta(
  doc: JsPDF,
  venta: Venta,
  empresa: EmpresaForm,
  vuelto: number | undefined,
  imgLogo: { data: string; ratio: number } | null
): number {
  let y = 5;
  const centerX = ANCHO / 2;

  const linea = (dashed = true) => {
    doc.setLineDashPattern(dashed ? [1, 1] : [], 0);
    doc.setDrawColor(150);
    doc.line(MARGEN, y, ANCHO - MARGEN, y);
    y += 3;
  };

  const texto = (
    contenido: string,
    opts: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean; x?: number } = {}
  ) => {
    const { align = 'left', size = 11, bold = false, x } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const posX = x ?? (align === 'center' ? centerX : align === 'right' ? ANCHO - MARGEN : MARGEN);
    doc.text(contenido, posX, y, { align });
    y += size * 0.35 + 1.5;
  };

  const textoMultilinea = (contenido: string, opts: { size?: number; bold?: boolean } = {}) => {
    const { size = 9, bold = false } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lineas = doc.splitTextToSize(contenido, ANCHO_UTIL);
    doc.text(lineas, MARGEN, y);
    y += lineas.length * (size * 0.35 + 1.2) + 1;
  };

  // Logo: ancho completo del ticket, alto limitado (evita empujar demasiado
  // el contenido si el logo es muy vertical)
  if (imgLogo) {
    let anchoImg = ANCHO_UTIL;
    let altoImg = anchoImg * imgLogo.ratio;
    if (altoImg > MAX_ALTO_LOGO) {
      altoImg = MAX_ALTO_LOGO;
      anchoImg = altoImg / imgLogo.ratio;
    }
    const xImg = centerX - anchoImg / 2;
    doc.addImage(imgLogo.data, xImg, y, anchoImg, altoImg);
    y += altoImg + 4;
  }

  texto(empresa.nombreComercial || empresa.razonSocial || '', { align: 'center', size: 10, bold: true });
  if (empresa.razonSocial && empresa.nombreComercial && empresa.razonSocial !== empresa.nombreComercial) {
    texto(empresa.razonSocial, { align: 'center', size: 9 });
  }
  if (empresa.ruc) texto(`RUC: ${empresa.ruc}`, { align: 'center', size: 9 });
  if (empresa.direccion) texto(empresa.direccion, { align: 'center', size: 9 });
  if (empresa.departamento || empresa.ciudad) {
    texto([empresa.departamento, empresa.ciudad].filter(Boolean).join(' - '), { align: 'center', size: 9 });
  }
  if (empresa.telefono) texto(`Tel: ${empresa.telefono}`, { align: 'center', size: 9 });

  linea();

  // Encabezado del comprobante: usa el tipo/serie/número reales que asignó
  // el backend (Venta.tipoVenta, Venta.serie, Venta.numeroComprobante) en
  // vez del "NV01" fijo que se usaba antes. Si por algún motivo faltara la
  // serie o el número (comprobantes antiguos), cae de vuelta al id de venta.
  const titulo = labelComprobante[venta.tipoVenta] ?? 'COMPROBANTE DE VENTA';
  const numeroFormateado = venta.serie
    ? `${venta.serie}-${String(venta.numeroComprobante ?? venta.id).padStart(8, '0')}`
    : String(venta.id).padStart(8, '0');
  texto(`${titulo} ${numeroFormateado}`, { align: 'center', bold: true, size: 10 });
  linea();

  const fecha = new Date(venta.fecha).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  texto(`Fecha: ${fecha}`, { size: 9 });
  texto(`Cliente: ${venta.clienteNombre || 'CLIENTES VARIOS'}`, { size: 9 });
  if (venta.clienteDocumento) texto(`${venta.clienteDocumento.length === 11 ? 'RUC' : 'DNI'}: ${venta.clienteDocumento}`, { size: 9 });

  linea();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Producto', X_PROD, y);
  doc.text('Cant.', X_CANT_R, y, { align: 'right' });
  doc.text('P.Unit', X_PUNIT_R, y, { align: 'right' });
  doc.text('Imp.', X_IMP_R, y, { align: 'right' });
  y += 3.5;

  linea();

  venta.detalles.forEach((d) => {
    const nombre = d.productoNombre + (labelTipo[d.tipoVenta] ? ` (${labelTipo[d.tipoVenta]})` : '');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineasNombre: string[] = doc.splitTextToSize(nombre, COL_PROD);

    const yInicialFila = y;
    doc.text(lineasNombre, X_PROD, y);
    doc.text(d.tipoVenta === 'PESO' ? fmtPeso(d.cantidad) : String(d.cantidad), X_CANT_R, yInicialFila, { align: 'right' });
    doc.text(d.precioUnitario.toFixed(2) + (d.tipoVenta === 'PESO' ? '/kg' : ''), X_PUNIT_R, yInicialFila, { align: 'right' });
    doc.text(d.subtotal.toFixed(2), X_IMP_R, yInicialFila, { align: 'right' });

    y += Math.max(lineasNombre.length * 3.8, 3.8) + 1.5;
  });

  linea(false);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL:', MARGEN, y);
  doc.text(`S/ ${venta.total.toFixed(2)}`, ANCHO - MARGEN, y, { align: 'right' });
  y += 5;

  // El vuelto puede venir explícito (recién cobrado, en el mismo flujo de
  // venta) o, si se reimprime el comprobante más tarde, desde el propio
  // registro de la venta (venta.vuelto), que el backend ya calculó y guardó.
  const vueltoAMostrar = vuelto ?? venta.vuelto;
  if (vueltoAMostrar && vueltoAMostrar > 0) {
    doc.text('VUELTO:', MARGEN, y);
    doc.text(`S/ ${vueltoAMostrar.toFixed(2)}`, ANCHO - MARGEN, y, { align: 'right' });
    y += 5;
  }

  textoMultilinea(`SON: ${montoEnLetras(venta.total)}`, { size: 8 });

  linea();
  textoMultilinea(`Metodo Pago: ${medioLabel(venta.metodoPago)}`, { size: 9 });
  if (venta.codigoIzipay) {
    textoMultilinea(`Cód. Izipay: ${venta.codigoIzipay}`, { size: 9 });
  }
  linea();

  texto('¡Gracias por su compra!', { align: 'center', bold: true, size: 10 });

  return y;
}

async function nuevoDoc(format: [number, number]): Promise<JsPDF> {
  const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
  return new jsPDF({ unit: 'mm', format });
}

export async function generarBoletaPdf(venta: Venta, empresa: EmpresaForm, vuelto?: number): Promise<Blob> {
  let imgLogo: { data: string; ratio: number } | null = null;
  if (empresa.logo) {
    imgLogo = await cargarImagenBase64(empresa.logo);
  }

  // PASADA 1: medir la altura real dibujando sobre una hoja de prueba
  const docMedida = await nuevoDoc([ANCHO, 1000]);
  const finalY = renderBoleta(docMedida, venta, empresa, vuelto, imgLogo);

  // PASADA 2: crear la hoja con la altura EXACTA (+3mm de margen final, no +10)
  const ALTO_FINAL = Math.ceil(finalY) + 3;
  const doc = await nuevoDoc([ANCHO, ALTO_FINAL]);
  renderBoleta(doc, venta, empresa, vuelto, imgLogo);

  return doc.output('blob');
}