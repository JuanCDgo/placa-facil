import { describe, expect, it } from 'vitest';
import {
  activarLicenciaConCodigo,
  crearLicenciaInicial,
  evaluarAccesoLicencia,
  generarCodigoActivacion,
  generarMensajePedidoActivacion,
  verificarCodigoActivacion,
} from './licencia';

describe('licencia offline PlacaFácil v2', () => {
  it('genera códigos determinísticos PF2-XXXX-XXXX-XXXX ignorando tildes y mayúsculas', () => {
    const c1 = generarCodigoActivacion('Carnicería Don Tito');
    const c2 = generarCodigoActivacion('  CARNICERIA don tito  ');
    expect(c1).toMatch(/^PF2-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(c1).toBe(c2);
    expect(verificarCodigoActivacion('Carniceria Don Tito', c1.replace(/-/g, ''))).toBe(true);
  });

  it('calcula 15 días de prueba y avisa en los últimos 3 días', () => {
    const lic = crearLicenciaInicial('2026-11-01');
    const dia5 = evaluarAccesoLicencia(lic, 'Don Tito', '2026-11-06');
    expect(dia5).toEqual({
      estado: 'prueba',
      diasRestantes: 10,
      diasTranscurridos: 5,
      mostrarAviso: false,
    });

    const dia13 = evaluarAccesoLicencia(lic, 'Don Tito', '2026-11-14');
    expect(dia13).toEqual({
      estado: 'prueba',
      diasRestantes: 2,
      diasTranscurridos: 13,
      mostrarAviso: true,
    });

    const vencida = evaluarAccesoLicencia(lic, 'Don Tito', '2026-11-16');
    expect(vencida).toEqual({ estado: 'vencida', diasTranscurridos: 15 });
  });

  it('activa licencia offline y desbloquea acceso permanente', () => {
    const lic = crearLicenciaInicial('2026-11-01');
    const code = generarCodigoActivacion('Almacén Sol');
    const bad = activarLicenciaConCodigo(lic, 'Almacén Sol', 'PF2-AAAA-BBBB-CCCC', '2026-11-20');
    expect(bad.ok).toBe(false);

    const ok = activarLicenciaConCodigo(lic, 'Almacén Sol', code, '2026-11-20');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      const acc = evaluarAccesoLicencia(ok.licencia, 'Otro Nombre', '2027-05-01');
      expect(acc.estado).toBe('activa');
    }
  });

  it('arma mensaje de pedido sin emojis', () => {
    const msg = generarMensajePedidoActivacion('Almacén Sol');
    expect(msg).toContain('PlacaFacil');
    expect(msg).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
