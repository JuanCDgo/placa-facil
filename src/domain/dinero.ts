/**
 * Utilidades puras de dinero (ARS $), texto limpio y fechas locales de Argentina.
 */

export const MONTO_MAXIMO_REALISTA = 50_000_000;

export function redondearCentavos(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor * 100) / 100;
}

/**
 * Parsea entradas monetarias argentinas:
 * - "1500", "1.500", "1.500,50", "1500.50", "$ 2.400,25"
 * Devuelve 0 si la entrada es vacía o inválida.
 */
export function parseMoneyAr(input: string | number): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? redondearCentavos(input) : 0;
  }

  const limpio = input.trim().replace(/[$\s]/g, '');
  if (!limpio) return 0;
  if (limpio.startsWith('-')) return 0;

  let normalizado = limpio;
  const tieneComa = normalizado.includes(',');
  const tienePunto = normalizado.includes('.');

  if (tieneComa && tienePunto) {
    normalizado = normalizado.replace(/\./g, '').replace(',', '.');
  } else if (tieneComa) {
    normalizado = normalizado.replace(',', '.');
  } else if (tienePunto) {
    const partes = normalizado.split('.');
    const pareceMiles =
      partes.length > 2 ||
      (partes.length === 2 && partes[1].length === 3 && partes[0].length >= 1);
    if (pareceMiles) {
      normalizado = partes.join('');
    }
  }

  const parsed = Number(normalizado);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return redondearCentavos(parsed);
}

/**
 * Limpia caracteres inválidos mientras el usuario escribe un importe en teclado móvil.
 */
export function sanitizeDecimalInput(raw: string): string {
  const soloPermitidos = raw.replace(/[^0-9.,]/g, '');
  const idxSep = soloPermitidos.search(/[.,]/);
  if (idxSep === -1) return soloPermitidos;
  const sep = soloPermitidos[idxSep];
  const entero = soloPermitidos.slice(0, idxSep);
  const decimal = soloPermitidos
    .slice(idxSep + 1)
    .replace(/[.,]/g, '')
    .slice(0, 2);
  return `${entero}${sep}${decimal}`;
}

/**
 * Formatea en pesos argentinos: "$ 3.400" (sin decimales si es entero) o "$ 3.400,50".
 */
export function formatArs(valor: number): string {
  const safe = Number.isFinite(valor) ? valor : 0;
  const negativo = safe < 0;
  const abs = Math.abs(redondearCentavos(safe));
  const esEntero = Math.abs(abs - Math.round(abs)) < 0.001;

  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: esEntero ? 0 : 2,
    maximumFractionDigits: esEntero ? 0 : 2,
  }).format(abs);

  return negativo ? `-$ ${formatted}` : `$ ${formatted}`;
}

/**
 * Formatea un importe para campo editable sin símbolo $: "9.800" o "9.800,50".
 */
export function formatArsInput(valor: number): string {
  const safe = Number.isFinite(valor) && valor > 0 ? redondearCentavos(valor) : 0;
  if (safe === 0) return '';
  const esEntero = Math.abs(safe - Math.round(safe)) < 0.001;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: esEntero ? 0 : 2,
    maximumFractionDigits: esEntero ? 0 : 2,
  }).format(safe);
}

/**
 * Aplica un porcentaje de ajuste (ej. +10 o -5) a un string de precio AR.
 * Redondea a entero si el resultado es >= 100 para precios limpios de mostrador.
 */
export function aplicarPorcentajePrecio(precioInput: string, porcentaje: number): string {
  const actual = parseMoneyAr(precioInput);
  if (actual <= 0 || !Number.isFinite(porcentaje)) return precioInput;
  const factor = 1 + porcentaje / 100;
  if (factor <= 0) return precioInput;
  const nuevo = actual * factor;
  const redondeado = nuevo >= 100 ? Math.round(nuevo) : redondearCentavos(nuevo);
  return formatArsInput(Math.min(MONTO_MAXIMO_REALISTA, redondeado));
}

/**
 * Elimina emojis y símbolos pictográficos para textos limpios de WhatsApp.
 */
export function quitarEmojis(texto: string): string {
  return texto
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\uFE0F/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Devuelve la fecha actual en Argentina (YYYY-MM-DD).
 */
export function obtenerHoyArgentinaISO(fecha: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(fecha);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback a fecha local
  }
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY.
 */
export function formatearFechaCorta(dayKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim());
  if (!match) return dayKey;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Formatea un ISO timestamp a DD/MM/YYYY HH:MM en hora argentina.
 */
export function formatearFechaHoraAr(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}
