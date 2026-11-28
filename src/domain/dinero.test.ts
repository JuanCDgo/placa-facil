import { describe, expect, it } from 'vitest';
import {
  aplicarPorcentajePrecio,
  formatArs,
  formatearFechaCorta,
  parseMoneyAr,
  quitarEmojis,
  sanitizeDecimalInput,
} from './dinero';

describe('dinero y texto AR', () => {
  it('parsea formatos monetarios argentinos', () => {
    expect(parseMoneyAr('9.800')).toBe(9800);
    expect(parseMoneyAr('1.500,50')).toBe(1500.5);
    expect(parseMoneyAr('$ 2.400,25')).toBe(2400.25);
    expect(parseMoneyAr('350')).toBe(350);
    expect(parseMoneyAr('-500')).toBe(0);
    expect(parseMoneyAr('')).toBe(0);
  });

  it('formatea ARS sin decimales innecesarios y con coma cuando hay centavos', () => {
    expect(formatArs(9800)).toBe('$ 9.800');
    expect(formatArs(1500.5)).toBe('$ 1.500,50');
    expect(formatArs(0)).toBe('$ 0');
  });

  it('sanitiza entrada decimal en teclado móvil', () => {
    expect(sanitizeDecimalInput('12a,345')).toBe('12,34');
    expect(sanitizeDecimalInput('$ 9.800')).toBe('9.80');
  });

  it('aplica porcentaje de ajuste de precios correctamente', () => {
    expect(aplicarPorcentajePrecio('10.000', 10)).toBe('11.000');
    expect(aplicarPorcentajePrecio('5.000', -10)).toBe('4.500');
    expect(aplicarPorcentajePrecio('', 10)).toBe('');
  });

  it('elimina emojis de cualquier texto', () => {
    expect(quitarEmojis('🔥 Oferta del día 🥩 Asado')).toBe('Oferta del día Asado');
  });

  it('formatea fechas cortas AR', () => {
    expect(formatearFechaCorta('2026-11-28')).toBe('28/11/2026');
  });
});
