const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DIEZ_A_DIECINUEVE = [
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
];
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

function convertirDecenas(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DIEZ_A_DIECINUEVE[n - 10];
  const dec = Math.floor(n / 10);
  const uni = n % 10;
  if (dec === 2) return uni === 0 ? 'VEINTE' : `VEINTI${UNIDADES[uni]}`;
  return uni === 0 ? DECENAS[dec] : `${DECENAS[dec]} Y ${UNIDADES[uni]}`;
}

function convertirCentenas(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const cen = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [cen > 0 ? CENTENAS[cen] : '', resto > 0 ? convertirDecenas(resto) : ''];
  return partes.filter(Boolean).join(' ');
}

function numeroEnteroALetras(n: number): string {
  if (n === 0) return 'CERO';

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLON' : `${convertirCentenas(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${convertirCentenas(miles)} MIL`);
  }
  if (resto > 0) {
    partes.push(convertirCentenas(resto));
  }
  return partes.join(' ').trim();
}

/** Convierte un monto (ej. 176.5) a "CIENTO SETENTA Y SEIS CON 50/100 SOLES" */
export function montoEnLetras(monto: number): string {
  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  return `${numeroEnteroALetras(entero)} CON ${String(centavos).padStart(2, '0')}/100 SOLES`;
}