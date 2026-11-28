import { IDENTIDAD_VACIA } from './identidad';
import { crearLicenciaInicial, TRIAL_STORAGE_KEY } from './licencia';
import { crearBorradoresIniciales } from './placas';
import { sanitizarEstadoPlacaFacil, type EstadoPlacaFacil } from './respaldo';

export const STORAGE_KEY = 'placa_facil_v2_state';

export function crearEstadoInicial(): EstadoPlacaFacil {
  return {
    identidad: { ...IDENTIDAD_VACIA },
    licencia: crearLicenciaInicial(),
    editor: {
      activeTemplate: 'oferta',
      activeFormat: 'story',
      drafts: crearBorradoresIniciales(),
    },
    placasGuardadas: [],
  };
}

export function leerEstadoLocal(): EstadoPlacaFacil {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const fechaTrialGuardada = localStorage.getItem(TRIAL_STORAGE_KEY);
    const estado = raw
      ? sanitizarEstadoPlacaFacil(JSON.parse(raw) as unknown)
      : crearEstadoInicial();

    if (fechaTrialGuardada && /^\d{4}-\d{2}-\d{2}$/.test(fechaTrialGuardada)) {
      if (fechaTrialGuardada < estado.licencia.inicioPruebaISO) {
        estado.licencia = { ...estado.licencia, inicioPruebaISO: fechaTrialGuardada };
      }
    } else {
      localStorage.setItem(TRIAL_STORAGE_KEY, estado.licencia.inicioPruebaISO);
    }
    return estado;
  } catch {
    return crearEstadoInicial();
  }
}

export function guardarEstadoLocal(estado: EstadoPlacaFacil): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    if (!localStorage.getItem(TRIAL_STORAGE_KEY)) {
      localStorage.setItem(TRIAL_STORAGE_KEY, estado.licencia.inicioPruebaISO);
    }
    return true;
  } catch {
    return false;
  }
}
