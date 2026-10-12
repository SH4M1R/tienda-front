import type { FilaKardex, ProductoKardex } from './kardexPdf';

/** Excel del kardex con la misma estructura que el de Botica (título, periodo, grupos Entradas/Salidas/Existencias). */
export async function exportarKardexExcel(producto: ProductoKardex, filas: FilaKardex[], desde: string, hasta: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Kardex');

  ws.addRow([`KARDEX DE INVENTARIO — ${producto.nombre}`]);
  ws.addRow([`Periodo: ${desde} al ${hasta}`]);
  ws.addRow([]);
  ws.addRow(['', '', 'ENTRADAS', '', '', 'SALIDAS', '', '', 'EXISTENCIAS', '', '']);
  ws.addRow(['Fecha', 'Descripción', 'Unidades', 'Costo Unit', 'Valor Total', 'Unidades', 'Costo Unit', 'Valor Total', 'Unidades', 'Costo Unit', 'Valor Total']);

  filas.forEach((f) => ws.addRow([
    f.fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    f.descripcion,
    f.entradaUnidades || '',
    f.entradaUnidades ? Number(f.entradaCostoUnit.toFixed(2)) : '',
    f.entradaUnidades ? Number(f.entradaValorTotal.toFixed(2)) : '',
    f.salidaUnidades || '',
    f.salidaUnidades ? Number(f.salidaCostoUnit.toFixed(2)) : '',
    f.salidaUnidades ? Number(f.salidaValorTotal.toFixed(2)) : '',
    f.existenciaUnidades,
    Number(f.existenciaCostoUnit.toFixed(2)),
    Number(f.existenciaValorTotal.toFixed(2)),
  ]));

  ws.mergeCells(1, 1, 1, 11);
  ws.mergeCells(2, 1, 2, 11);
  ws.mergeCells(4, 3, 4, 5);
  ws.mergeCells(4, 6, 4, 8);
  ws.mergeCells(4, 9, 4, 11);
  ws.mergeCells(4, 1, 5, 1);
  ws.mergeCells(4, 2, 5, 2);
  [12, 32, 10, 10, 12, 10, 10, 12, 10, 10, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.getRow(1).font = { bold: true, size: 13 };
  [4, 5].forEach((r) => { ws.getRow(r).font = { bold: true }; ws.getRow(r).alignment = { horizontal: 'center', vertical: 'middle' }; });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kardex-${producto.nombre.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${desde}-${hasta}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
