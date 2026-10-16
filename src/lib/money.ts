// Montos y tasas: siempre con máximo 2 decimales
export const round2 = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export const formatBs = (n: number) =>
  round2(n).toLocaleString("es-VE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
