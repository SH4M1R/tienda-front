const moneyFmt = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const numFmt = new Intl.NumberFormat("es-PE");

export const money = (n: number | null | undefined) => moneyFmt.format(n ?? 0);
export const num = (n: number | null | undefined) => numFmt.format(n ?? 0);

function parse(s: string) { return new Date(s.length === 10 ? s + "T00:00:00" : s); }
export const fmtDate = (s?: string | null) => (s ? parse(s).toLocaleDateString("es-PE") : "—");
export const fmtDateTime = (s?: string | null) =>
  s ? parse(s).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "—";
export const fmtTime = (s?: string | null) =>
  s ? parse(s).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtShortDay = (s: string) => {
  const d = parse(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const today = () => toISODate(new Date());
export const monthStart = () => { const d = new Date(); d.setDate(1); return toISODate(d); };
export const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toISODate(d); };

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
