import { describe, expect, it } from 'vitest';
import { IDENTIDAD_VACIA } from './identidad';
import {
  ajustarGondolaPorPorcentaje,
  ajustarListaPorPorcentaje,
  construirPayloadQrOffline,
  construirTextoWhatsappPlaca,
  crearBorradoresIniciales,
  obtenerTituloPlaca,
} from './placas';

describe('dominio de placas y carteles', () => {
  it('ajusta todos los precios de Lista y Góndola por porcentaje', () => {
    const drafts = crearBorradoresIniciales();
    const listaSubida = ajustarListaPorPorcentaje(drafts.lista, 10);
    expect(listaSubida.items[0].priceInput).toBe('10.780');

    const gondolaSubida = ajustarGondolaPorPorcentaje(drafts.gondola, 20);
    expect(gondolaSubida.cards[0].priceInput).toBe('5.100');
    expect(gondolaSubida.cards[0].oldPriceInput).toBe('5.880');
    expect(gondolaSubida.cards[1].oldPriceInput).toBe('');
  });

  it('construye payload QR 100% offline solo con Alias/CVU y monto opcional', () => {
    const payload = construirPayloadQrOffline(
      { ...IDENTIDAD_VACIA, nombre: 'Despensa Sur', aliasOCbu: 'DESPENSA.SUR', cvu: '0000003100012345678901' },
      '4.500'
    );
    expect(payload).toContain('TRANSFERENCIA - Despensa Sur');
    expect(payload).toContain('Alias: DESPENSA.SUR');
    expect(payload).toContain('CVU/CBU: 0000003100012345678901');
    expect(payload).toContain('Importe: $ 4.500');
  });

  it('arma mensajes de WhatsApp limpios y sin emojis para todas las plantillas', () => {
    const drafts = crearBorradoresIniciales();
    const msg = construirTextoWhatsappPlaca({
      templateId: 'oferta',
      draft: { ...drafts.oferta, badge: '🔥 OFERTA', title: '🥩 Asado' },
      identidad: IDENTIDAD_VACIA,
    });
    expect(msg).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(msg).toContain('Asado: $ 9.800');
    expect(msg).toContain('Pedidos por WhatsApp');
  });

  it('obtiene el título visible para Góndola y otras plantillas', () => {
    const drafts = crearBorradoresIniciales();
    expect(obtenerTituloPlaca('gondola', drafts.gondola)).toContain('Góndola A4');
    expect(obtenerTituloPlaca('oferta', drafts.oferta)).toBe('Asado Novillito x kg');
  });
});
