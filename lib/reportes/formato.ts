export const fmtMoneda = (n: number) => `S/ ${(Number(n) || 0).toFixed(2)}`;

export function fmtFechaCorta(s: string | null | undefined) {
  if (!s) return "—";
  const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtFechaHora(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const fmtEmision = () => fmtFechaHora(new Date().toISOString());

export function descargarBlob(blob: Blob, nombre: string, ext: "pdf" | "xlsx") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function cargarImagen(url: string): Promise<{ data: string; width: number; height: number } | null> {
  try {
    let data = url;
    if (!url.startsWith("data:")) {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
    const dim = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 100, height: 100 });
      img.src = data;
    });
    return { data, ...dim };
  } catch { return null; }
}

export const tipoImagen = (data: string) => (/image\/jpe?g/.test(data) ? "JPEG" : "PNG");

/** Ajusta el logo a un cuadro máximo sin deformarlo. */
export function ajustarLogo(w0: number, h0: number, maxW: number, maxH: number) {
  let w = maxW, h = (h0 * w) / w0;
  if (h > maxH) { h = maxH; w = (w0 * h) / h0; }
  return { w, h };
}
