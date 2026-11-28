import { obtenerHoyArgentinaISO } from './dinero';

export const DIAS_PRUEBA = 15;
export const DIAS_AVISO_PRUEBA = 3;
export const TRIAL_STORAGE_KEY = 'placa_facil_v2_trial_start';

export interface LicenciaEstado {
  inicioPruebaISO: string;
  codigoActivacion: string;
  nombreLicencia: string;
  activadaEnISO: string;
}

export type EstadoAccesoLicencia =
  | { estado: 'activa'; nombreLicencia: string; activadaEnISO: string }
  | { estado: 'prueba'; diasRestantes: number; diasTranscurridos: number; mostrarAviso: boolean }
  | { estado: 'vencida'; diasTranscurridos: number };

const ALFABETO_CLAVE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SALT_INTERNO = 'PF2::LINEA-FACIL::2026::AR';

export function normalizarNombreLicencia(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hashBloque32(texto: string, semilla: number): number {
  let h = semilla >>> 0;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function codificarBase32(valor: number, longitud: number): string {
  let v = valor >>> 0;
  let out = '';
  for (let i = 0; i < longitud; i += 1) {
    out += ALFABETO_CLAVE[v & 31];
    v >>>= 5;
  }
  return out;
}

/**
 * Genera el código determinístico de activación offline para un comercio:
 * Formato: PF2-XXXX-XXXX-XXXX
 */
export function generarCodigoActivacion(nombreNegocio: string): string {
  const norm = normalizarNombreLicencia(nombreNegocio);
  if (norm.length < 2) return '';

  const base = `${SALT_INTERNO}|${norm}`;
  const b1 = codificarBase32(hashBloque32(`${base}|B1`, 0x811c9dc5), 4);
  const b2 = codificarBase32(hashBloque32(`${base}|B2`, 0x9e3779b1), 4);
  const b3 = codificarBase32(hashBloque32(`${base}|B3`, 0x243f6a88), 4);
  return `PF2-${b1}-${b2}-${b3}`;
}

export function normalizarCodigoIngresado(raw: string): string {
  const limpio = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpio.length === 15 && limpio.startsWith('PF2')) {
    return `${limpio.slice(0, 3)}-${limpio.slice(3, 7)}-${limpio.slice(7, 11)}-${limpio.slice(11, 15)}`;
  }
  return raw.trim().toUpperCase();
}

export function verificarCodigoActivacion(nombreNegocio: string, codigoRaw: string): boolean {
  const esperado = generarCodigoActivacion(nombreNegocio);
  if (!esperado) return false;
  return normalizarCodigoIngresado(codigoRaw) === esperado;
}

export function calcularDiasEntreISO(desdeISO: string, hastaISO: string): number {
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(desdeISO);
  const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hastaISO);
  if (!m1 || !m2) return 0;

  const d1 = Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
  const d2 = Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  return Math.max(0, Math.floor((d2 - d1) / 86_400_000));
}

export function crearLicenciaInicial(hoyISO: string = obtenerHoyArgentinaISO()): LicenciaEstado {
  return {
    inicioPruebaISO: hoyISO,
    codigoActivacion: '',
    nombreLicencia: '',
    activadaEnISO: '',
  };
}

export function sanitizarLicencia(
  raw: unknown,
  hoyISO: string = obtenerHoyArgentinaISO()
): LicenciaEstado {
  if (typeof raw !== 'object' || raw === null) {
    return crearLicenciaInicial(hoyISO);
  }
  const obj = raw as Record<string, unknown>;
  const inicio =
    typeof obj.inicioPruebaISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.inicioPruebaISO)
      ? obj.inicioPruebaISO
      : hoyISO;
  const codigo =
    typeof obj.codigoActivacion === 'string' ? normalizarCodigoIngresado(obj.codigoActivacion) : '';
  const nombreLic = typeof obj.nombreLicencia === 'string' ? obj.nombreLicencia.trim().slice(0, 80) : '';
  const activadaEn =
    typeof obj.activadaEnISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.activadaEnISO)
      ? obj.activadaEnISO
      : '';

  return {
    inicioPruebaISO: inicio,
    codigoActivacion: codigo,
    nombreLicencia: nombreLic,
    activadaEnISO: activadaEn,
  };
}

export function evaluarAccesoLicencia(
  licencia: LicenciaEstado,
  nombreNegocioActual: string,
  hoyISO: string = obtenerHoyArgentinaISO()
): EstadoAccesoLicencia {
  const nombreParaValidar = licencia.nombreLicencia || nombreNegocioActual;
  if (
    licencia.codigoActivacion &&
    verificarCodigoActivacion(nombreParaValidar, licencia.codigoActivacion)
  ) {
    return {
      estado: 'activa',
      nombreLicencia: nombreParaValidar,
      activadaEnISO: licencia.activadaEnISO || hoyISO,
    };
  }

  const diasTranscurridos = calcularDiasEntreISO(licencia.inicioPruebaISO, hoyISO);
  const diasRestantes = Math.max(0, DIAS_PRUEBA - diasTranscurridos);

  if (diasRestantes <= 0) {
    return {
      estado: 'vencida',
      diasTranscurridos,
    };
  }

  return {
    estado: 'prueba',
    diasRestantes,
    diasTranscurridos,
    mostrarAviso: diasRestantes <= DIAS_AVISO_PRUEBA,
  };
}

export function activarLicenciaConCodigo(
  licenciaActual: LicenciaEstado,
  nombreNegocio: string,
  codigoRaw: string,
  hoyISO: string = obtenerHoyArgentinaISO()
): { ok: true; licencia: LicenciaEstado } | { ok: false; error: string } {
  const nombreLimpio = nombreNegocio.trim();
  if (normalizarNombreLicencia(nombreLimpio).length < 2) {
    return {
      ok: false,
      error: 'Primero ingresá el nombre de tu negocio para validar el código.',
    };
  }

  const codigo = normalizarCodigoIngresado(codigoRaw);
  if (!verificarCodigoActivacion(nombreLimpio, codigo)) {
    return {
      ok: false,
      error: 'El código no coincide con el nombre del negocio. Revisá que esté bien escrito.',
    };
  }

  return {
    ok: true,
    licencia: {
      ...licenciaActual,
      codigoActivacion: codigo,
      nombreLicencia: nombreLimpio,
      activadaEnISO: hoyISO,
    },
  };
}

/**
 * Genera el mensaje de WhatsApp sin emojis para solicitar el código de activación.
 */
export function generarMensajePedidoActivacion(nombreNegocio: string): string {
  const negocio = nombreNegocio.trim() || 'Mi Comercio';
  return [
    'Hola! Quiero activar mi licencia de PlacaFacil.',
    `Nombre de mi negocio: ${negocio}`,
  ].join('\n');
}
