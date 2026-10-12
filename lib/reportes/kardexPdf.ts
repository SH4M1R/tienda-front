import type { jsPDF as JsPDF } from 'jspdf';
import { cargarImagen as cargarImagenBase64, tipoImagen as formatoImagen } from './formato';

export interface FilaKardex {
  fecha: Date;
  descripcion: string;
  entradaUnidades: number;
  entradaCostoUnit: number;
  entradaValorTotal: number;
  salidaUnidades: number;
  salidaCostoUnit: number;
  salidaValorTotal: number;
  existenciaUnidades: number;
  existenciaCostoUnit: number;
  existenciaValorTotal: number;
}

export interface ProductoKardex { nombre: string; precioCosto: number }

const ANCHO_PAGINA = 297; // A4 landscape
const ALTO_PAGINA = 210;
const MARGEN = 10;

const COL = {
  fecha: 22,
  descripcion: 66,
  entUnid: 20,
  entCosto: 20,
  entValor: 23,
  salUnid: 20,
  salCosto: 20,
  salValor: 23,
  extUnid: 20,
  extCosto: 20,
  extValor: 23,
};

const ALTO_FILA = 6;
const ALTO_HEADER = 12;

// Logo pequeño para no competir con el título del kardex
const MAX_W_LOGO = 26;
const MAX_H_LOGO = 14;

function formatFecha(f: Date) {
  return f.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ajustarLogo(anchoOriginal: number, altoOriginal: number) {
  let w = MAX_W_LOGO;
  let h = (altoOriginal * w) / anchoOriginal;
  if (h > MAX_H_LOGO) {
    h = MAX_H_LOGO;
    w = (anchoOriginal * h) / altoOriginal;
  }
  return { w, h };
}

export async function generarKardexPdf(
  producto: ProductoKardex,
  filas: FilaKardex[],
  desde: string,
  hasta: string,
  logoManual?: string
): Promise<Blob> {
  const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
  const doc: JsPDF = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  // Cargamos el logo UNA sola vez antes de dibujar (se reutiliza en cada
  // página, incluyendo los saltos de página al paginar el detalle)
  const urlLogo = logoManual;
  const logo = urlLogo ? await cargarImagenBase64(urlLogo) : null;
  const dimLogo = logo ? ajustarLogo(logo.width, logo.height) : null;

  const dibujarEncabezadoPagina = () => {
    let y = MARGEN;

    // Logo arriba a la derecha, sin invadir el bloque de texto del título
    if (logo && dimLogo) {
      const xLogo = ANCHO_PAGINA - MARGEN - dimLogo.w;
      try {
        doc.addImage(logo.data, formatoImagen(logo.data), xLogo, y, dimLogo.w, dimLogo.h);
      } catch (e) {
        console.warn('No se pudo agregar el logo al Kardex:', e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('KARDEX DE INVENTARIO', MARGEN, y + 4);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Producto: ${producto.nombre}`, MARGEN, y);
    doc.text(`Periodo: ${desde} al ${hasta}`, ANCHO_PAGINA - MARGEN - (dimLogo?.w ?? 0) - 3, y, { align: 'right' });
    y += 5;
    doc.text(`Costo unitario actual: S/ ${producto.precioCosto.toFixed(2)}`, MARGEN, y);
    doc.text(
      `Emitido: ${new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      ANCHO_PAGINA - MARGEN,
      y,
      { align: 'right' }
    );
    y += 6;

    // Deja espacio suficiente para que el logo no se encime con la tabla
    // si el bloque de texto quedó más bajo que el logo
    y = Math.max(y, MARGEN + (dimLogo?.h ?? 0) + 4);

    return y;
  };

  const dibujarCabeceraTabla = (yInicio: number) => {
    const y = yInicio;
    const x0 = MARGEN;

    doc.setDrawColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    let x = x0;
    const grupoAncho = {
      fecha: COL.fecha,
      descripcion: COL.descripcion,
      entradas: COL.entUnid + COL.entCosto + COL.entValor,
      salidas: COL.salUnid + COL.salCosto + COL.salValor,
      existencias: COL.extUnid + COL.extCosto + COL.extValor,
    };

    doc.rect(x, y, grupoAncho.fecha, ALTO_HEADER);
    doc.text('Fecha', x + grupoAncho.fecha / 2, y + ALTO_HEADER / 2 + 1, { align: 'center' });
    x += grupoAncho.fecha;

    doc.rect(x, y, grupoAncho.descripcion, ALTO_HEADER);
    doc.text('Descripción', x + grupoAncho.descripcion / 2, y + ALTO_HEADER / 2 + 1, { align: 'center' });
    x += grupoAncho.descripcion;

    doc.rect(x, y, grupoAncho.entradas, ALTO_HEADER / 2);
    doc.text('ENTRADAS', x + grupoAncho.entradas / 2, y + ALTO_HEADER / 4 + 1, { align: 'center' });
    const xEntradas = x;
    x += grupoAncho.entradas;

    doc.rect(x, y, grupoAncho.salidas, ALTO_HEADER / 2);
    doc.text('SALIDAS', x + grupoAncho.salidas / 2, y + ALTO_HEADER / 4 + 1, { align: 'center' });
    const xSalidas = x;
    x += grupoAncho.salidas;

    doc.rect(x, y, grupoAncho.existencias, ALTO_HEADER / 2);
    doc.text('EXISTENCIAS', x + grupoAncho.existencias / 2, y + ALTO_HEADER / 4 + 1, { align: 'center' });
    const xExistencias = x;

    const y2 = y + ALTO_HEADER / 2;
    const subcols = ['Unidades', 'Costo Unit', 'Valor Total'];
    doc.setFontSize(6.5);

    [xEntradas, xSalidas, xExistencias].forEach((xGrupo) => {
      const anchos = [COL.entUnid, COL.entCosto, COL.entValor];
      let xs = xGrupo;
      subcols.forEach((label, i) => {
        doc.rect(xs, y2, anchos[i], ALTO_HEADER / 2);
        doc.text(label, xs + anchos[i] / 2, y2 + ALTO_HEADER / 4 + 1, { align: 'center' });
        xs += anchos[i];
      });
    });

    return y + ALTO_HEADER;
  };

  let y = dibujarEncabezadoPagina();
  y = dibujarCabeceraTabla(y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const dibujarFila = (fila: FilaKardex) => {
    const x0 = MARGEN;
    let x = x0;
    doc.setDrawColor(200);

    const celda = (texto: string, ancho: number, align: 'left' | 'center' | 'right' = 'center') => {
      doc.rect(x, y, ancho, ALTO_FILA);
      const posX = align === 'left' ? x + 1.5 : align === 'right' ? x + ancho - 1.5 : x + ancho / 2;
      const textoCorto = doc.splitTextToSize(texto, ancho - 2)[0] ?? '';
      doc.text(textoCorto, posX, y + ALTO_FILA / 2 + 1, { align });
      x += ancho;
    };

    celda(formatFecha(fila.fecha), COL.fecha);
    celda(fila.descripcion, COL.descripcion, 'left');
    celda(fila.entradaUnidades ? String(fila.entradaUnidades) : '', COL.entUnid);
    celda(fila.entradaUnidades ? fila.entradaCostoUnit.toFixed(2) : '', COL.entCosto);
    celda(fila.entradaUnidades ? fila.entradaValorTotal.toFixed(2) : '', COL.entValor);
    celda(fila.salidaUnidades ? String(fila.salidaUnidades) : '', COL.salUnid);
    celda(fila.salidaUnidades ? fila.salidaCostoUnit.toFixed(2) : '', COL.salCosto);
    celda(fila.salidaUnidades ? fila.salidaValorTotal.toFixed(2) : '', COL.salValor);
    celda(String(fila.existenciaUnidades), COL.extUnid);
    celda(fila.existenciaCostoUnit.toFixed(2), COL.extCosto);
    celda(fila.existenciaValorTotal.toFixed(2), COL.extValor);

    y += ALTO_FILA;
  };

  filas.forEach((fila) => {
    if (y + ALTO_FILA > ALTO_PAGINA - MARGEN) {
      doc.addPage();
      y = dibujarEncabezadoPagina();
      y = dibujarCabeceraTabla(y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
    }
    dibujarFila(fila);
  });

  return doc.output('blob');
}