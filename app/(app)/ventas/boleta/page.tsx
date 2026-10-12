'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useConfig } from '@/lib/config-context';
import type { Venta } from '@/lib/types';

/** Abre el comprobante en PDF de 80 mm (mismo generador que la Botica). */
function BoletaCliente() {
  const searchParams = useSearchParams();
  const idVenta = Number(searchParams.get('id'));
  const vueltoParam = searchParams.get('vuelto');
  const vuelto = vueltoParam ? Number(vueltoParam) : undefined;
  const { empresa, pub } = useConfig();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!idVenta) return;
    (async () => {
      try {
        const venta = await api<Venta>(`/api/ventas/${idVenta}`);
        const { generarBoletaPdf } = await import('@/lib/reportes/boleta');
        const blob = await generarBoletaPdf(
          venta,
          {
            nombreComercial: empresa?.nombreComercial ?? pub.nombreComercial,
            razonSocial: empresa?.razonSocial ?? pub.razonSocial,
            ruc: empresa?.ruc,
            direccion: empresa?.direccion,
            departamento: empresa?.departamento,
            ciudad: empresa?.ciudad,
            logo: empresa?.logo ?? pub.logo,
          },
          vuelto,
        );
        window.location.replace(URL.createObjectURL(blob));
      } catch {
        setError('No se pudo generar la boleta.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idVenta]);

  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;
  return <p className="p-6 text-sm text-zinc-400">Generando boleta...</p>;
}

export default function BoletaImprimiblePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-400">Generando boleta...</p>}>
      <BoletaCliente />
    </Suspense>
  );
}
