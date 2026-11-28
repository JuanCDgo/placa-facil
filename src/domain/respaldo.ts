import { obtenerHoyArgentinaISO } from './dinero';
import { sanitizarIdentidad, type IdentidadComercio } from './identidad';
import { sanitizarLicencia, type LicenciaEstado } from './licencia';
import {
  crearBorradoresIniciales,
  esFormatValido,
  esTemplateValido,
  MAX_PLACAS_GUARDADAS,
  mezclarBorradorPlantilla,
  type DraftsPorPlantilla,
  type EstadoEditor,
  type PlacaGuardada,
  type TemplateId,
} from './placas';

export const APP_RESPALDO_ID = 'placa-facil';
export const VERSION_RESPALDO = 2;

export interface EstadoPlacaFacil {
  identidad: IdentidadComercio;
  licencia: LicenciaEstado;
  editor: EstadoEditor;
  placasGuardadas: PlacaGuardada[];
}

export interface ArchivoRespaldo {
  app: typeof APP_RESPALDO_ID;
  version: number;
  exportadoEn: string;
  estado: EstadoPlacaFacil;
}

function sanitizarEditor(raw: unknown): EstadoEditor {
  const defaults = crearBorradoresIniciales();
  if (typeof raw !== 'object' || raw === null) {
    return { activeTemplate: 'oferta', activeFormat: 'story', drafts: defaults };
  }
  const obj = raw as Record<string, unknown>;
  const rawDrafts =
    typeof obj.drafts === 'object' && obj.drafts !== null
      ? (obj.drafts as Record<string, unknown>)
      : {};

  const drafts: DraftsPorPlantilla = {
    oferta: mezclarBorradorPlantilla('oferta', rawDrafts.oferta),
    lista: mezclarBorradorPlantilla('lista', rawDrafts.lista),
    gondola: mezclarBorradorPlantilla('gondola', rawDrafts.gondola),
    qr: mezclarBorradorPlantilla('qr', rawDrafts.qr),
    horarios: mezclarBorradorPlantilla('horarios', rawDrafts.horarios),
  };

  return {
    activeTemplate: esTemplateValido(obj.activeTemplate) ? obj.activeTemplate : 'oferta',
    activeFormat: esFormatValido(obj.activeFormat) ? obj.activeFormat : 'story',
    drafts,
  };
}

function sanitizarPlacasGuardadas(raw: unknown): PlacaGuardada[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: PlacaGuardada[] = [];

  for (const item of raw) {
    if (out.length >= MAX_PLACAS_GUARDADAS) break;
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.id !== 'string' || !obj.id.trim() || seen.has(obj.id)) continue;
    if (!esTemplateValido(obj.templateId)) continue;

    seen.add(obj.id);
    const tpl: TemplateId = obj.templateId;
    const fmt = tpl === 'gondola' ? 'a4' : esFormatValido(obj.formatId) ? obj.formatId : 'story';

    out.push({
      id: obj.id.trim(),
      templateId: tpl,
      formatId: fmt,
      title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim().slice(0, 80) : 'Placa sin título',
      data: mezclarBorradorPlantilla(tpl, obj.data),
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
    });
  }

  return out;
}

export function sanitizarEstadoPlacaFacil(raw: unknown): EstadoPlacaFacil {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    identidad: sanitizarIdentidad(obj.identidad),
    licencia: sanitizarLicencia(obj.licencia),
    editor: sanitizarEditor(obj.editor),
    placasGuardadas: sanitizarPlacasGuardadas(obj.placasGuardadas),
  };
}

export function serializarRespaldo(estado: EstadoPlacaFacil): string {
  const payload: ArchivoRespaldo = {
    app: APP_RESPALDO_ID,
    version: VERSION_RESPALDO,
    exportadoEn: new Date().toISOString(),
    estado,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Importa respaldo JSON v2 o v1 de PlacaFácil.
 */
export function importarRespaldoJson(
  jsonText: string
): { ok: true; estado: EstadoPlacaFacil } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'El archivo seleccionado no es un JSON válido.' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'El respaldo tiene un formato inválido.' };
  }

  const obj = parsed as Record<string, unknown>;

  // Formato v2
  if (obj.app === APP_RESPALDO_ID && typeof obj.estado === 'object' && obj.estado !== null) {
    return { ok: true, estado: sanitizarEstadoPlacaFacil(obj.estado) };
  }

  // Compatibilidad con respaldo v1 (app: "PlacaFacil")
  if (obj.app === 'PlacaFacil' && typeof obj.business === 'object' && obj.business !== null) {
    const estadoV1 = sanitizarEstadoPlacaFacil({
      identidad: obj.business,
      editor: obj.draftState,
      placasGuardadas: obj.savedPlates,
    });
    return { ok: true, estado: estadoV1 };
  }

  return { ok: false, error: 'Este archivo no corresponde a un respaldo de PlacaFácil.' };
}

export function nombreArchivoRespaldo(hoyISO: string = obtenerHoyArgentinaISO()): string {
  return `placafacil-respaldo-${hoyISO}.json`;
}
