import { describe, expect, it } from 'vitest';
import { crearEstadoInicial } from './storage';
import { importarRespaldoJson, serializarRespaldo } from './respaldo';

describe('respaldo y restauración JSON', () => {
  it('exporta y restaura respaldo v2 completo', () => {
    const inicial = crearEstadoInicial();
    inicial.identidad.nombre = 'Verdulería La Esquina';
    inicial.identidad.aliasOCbu = 'LA.ESQUINA.MP';
    inicial.placasGuardadas = [
      {
        id: 'pf-1',
        templateId: 'oferta',
        formatId: 'story',
        title: 'Tomate Redondo',
        data: inicial.editor.drafts.oferta,
        updatedAt: '2026-11-28T10:00:00.000Z',
      },
    ];

    const json = serializarRespaldo(inicial);
    const res = importarRespaldoJson(json);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.estado.identidad.nombre).toBe('Verdulería La Esquina');
      expect(res.estado.identidad.aliasOCbu).toBe('LA.ESQUINA.MP');
      expect(res.estado.placasGuardadas).toHaveLength(1);
    }
  });

  it('importa respaldos legacy de PlacaFácil v1 sin perder datos', () => {
    const legacyV1 = JSON.stringify({
      app: 'PlacaFacil',
      schemaVersion: 1,
      business: { name: 'Kiosco Pepe', alias: 'PEPE.ALIAS', bankName: 'Cuenta DNI', whatsapp: '11 2222-3333' },
      draftState: { activeTemplate: 'lista', activeFormat: 'post', drafts: {} },
      savedPlates: [],
    });

    const res = importarRespaldoJson(legacyV1);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.estado.identidad.nombre).toBe('Kiosco Pepe');
      expect(res.estado.identidad.aliasOCbu).toBe('PEPE.ALIAS');
      expect(res.estado.editor.activeTemplate).toBe('lista');
    }
  });

  it('rechaza archivos inválidos o de otra app', () => {
    expect(importarRespaldoJson('no-es-json').ok).toBe(false);
    expect(importarRespaldoJson(JSON.stringify({ app: 'kiosco-facil', estado: {} })).ok).toBe(false);
  });
});
