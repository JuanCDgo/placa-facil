import { aplicarPorcentajePrecio, formatArs, parseMoneyAr, quitarEmojis } from './dinero';
import type { IdentidadComercio } from './identidad';

export type TemplateId = 'oferta' | 'lista' | 'gondola' | 'qr' | 'horarios';
export type FormatId = 'story' | 'post' | 'a4';
export type PosterPaletteId = 'oliva' | 'petroleo' | 'grafito' | 'terracota';
export type GondolaLayout = '2x' | '4x';

export interface PosterPalette {
  id: PosterPaletteId;
  name: string;
  accent: string;
  accentDark: string;
  badgeText: string;
  cardBg: string;
  cardInk: string;
  cardMuted: string;
  softBg: string;
  border: string;
}

export const POSTER_PALETTES: readonly PosterPalette[] = [
  {
    id: 'oliva',
    name: 'Oliva Mostrador',
    accent: '#5F6A22',
    accentDark: '#444C17',
    badgeText: '#FAF6EE',
    cardBg: '#FAF6EE',
    cardInk: '#1F2118',
    cardMuted: '#5A5D4D',
    softBg: '#F1E9D8',
    border: '#D9CFBA',
  },
  {
    id: 'petroleo',
    name: 'Petróleo Mate',
    accent: '#0D7C86',
    accentDark: '#095860',
    badgeText: '#FAF6EE',
    cardBg: '#FFFFFF',
    cardInk: '#162124',
    cardMuted: '#4A5E63',
    softBg: '#ECF5F6',
    border: '#C7DFE2',
  },
  {
    id: 'grafito',
    name: 'Grafito Pizarra',
    accent: '#1F2118',
    accentDark: '#12140E',
    badgeText: '#F1E9D8',
    cardBg: '#FAF6EE',
    cardInk: '#1F2118',
    cardMuted: '#5A5D4D',
    softBg: '#ECE5D5',
    border: '#D4CAB4',
  },
  {
    id: 'terracota',
    name: 'Rojo Oferta',
    accent: '#B93822',
    accentDark: '#8B2615',
    badgeText: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardInk: '#1D1917',
    cardMuted: '#5C534E',
    softBg: '#FBF0ED',
    border: '#E5CFC9',
  },
];

export interface TemplateDef {
  id: TemplateId;
  label: string;
  shortLabel: string;
}

export const TEMPLATE_DEFS: readonly TemplateDef[] = [
  { id: 'oferta', label: 'Oferta del Día', shortLabel: 'Oferta' },
  { id: 'lista', label: 'Lista de Precios', shortLabel: 'Lista' },
  { id: 'gondola', label: 'Góndola A4', shortLabel: 'Góndola A4' },
  { id: 'qr', label: 'QR Alias', shortLabel: 'QR Alias' },
  { id: 'horarios', label: 'Horarios / Feriado', shortLabel: 'Horarios' },
];

export interface FormatDef {
  id: FormatId;
  label: string;
  ratio: string;
  width: number;
  height: number;
}

export const FORMAT_DEFS: readonly FormatDef[] = [
  { id: 'story', label: 'Story 9:16', ratio: '9:16', width: 1080, height: 1920 },
  { id: 'post', label: 'Post 4:5', ratio: '4:5', width: 1080, height: 1350 },
  { id: 'a4', label: 'A4 PDF', ratio: 'A4', width: 1240, height: 1754 },
];

export interface OfertaDraft {
  paletteId: PosterPaletteId;
  badge: string;
  title: string;
  unitNote: string;
  priceInput: string;
  oldPriceInput: string;
  validity: string;
  photoDataUrl: string;
  showLogo: boolean;
  showWhatsapp: boolean;
}

export interface ListaItem {
  id: string;
  name: string;
  detail: string;
  priceInput: string;
}

export interface ListaDraft {
  paletteId: PosterPaletteId;
  badge: string;
  title: string;
  subtitle: string;
  footerNote: string;
  showLogo: boolean;
  showWhatsapp: boolean;
  items: ListaItem[];
}

export interface GondolaCard {
  id: string;
  badge: string;
  title: string;
  oldPriceInput: string;
  priceInput: string;
  detail: string;
}

export interface GondolaDraft {
  paletteId: PosterPaletteId;
  layout: GondolaLayout;
  cards: GondolaCard[];
}

export interface QrDraft {
  paletteId: PosterPaletteId;
  badge: string;
  title: string;
  amountInput: string;
  footerNote: string;
  showLogo: boolean;
  showWhatsapp: boolean;
}

export interface HorarioLine {
  id: string;
  label: string;
  hours: string;
}

export interface HorariosDraft {
  paletteId: PosterPaletteId;
  statusTag: string;
  title: string;
  scheduleLines: HorarioLine[];
  note: string;
  showAddress: boolean;
  showLogo: boolean;
  showWhatsapp: boolean;
}

export interface DraftsPorPlantilla {
  oferta: OfertaDraft;
  lista: ListaDraft;
  gondola: GondolaDraft;
  qr: QrDraft;
  horarios: HorariosDraft;
}

export interface EstadoEditor {
  activeTemplate: TemplateId;
  activeFormat: FormatId;
  drafts: DraftsPorPlantilla;
}

export interface PlacaGuardada {
  id: string;
  templateId: TemplateId;
  formatId: FormatId;
  title: string;
  data: DraftsPorPlantilla[TemplateId];
  updatedAt: string;
}

export const MAX_PLACAS_GUARDADAS = 40;

export function getPaletteById(id: string): PosterPalette {
  const mapped =
    id === 'almacen' ? 'oliva' : id === 'azul' ? 'petroleo' : id;
  return POSTER_PALETTES.find((p) => p.id === mapped) ?? POSTER_PALETTES[0];
}

export function getFormatSpec(formatId: FormatId): FormatDef {
  return FORMAT_DEFS.find((f) => f.id === formatId) ?? FORMAT_DEFS[0];
}

export function esTemplateValido(val: unknown): val is TemplateId {
  return typeof val === 'string' && TEMPLATE_DEFS.some((t) => t.id === val);
}

export function esFormatValido(val: unknown): val is FormatId {
  return typeof val === 'string' && FORMAT_DEFS.some((f) => f.id === val);
}

function sanitizarPaletteId(val: unknown, fallback: PosterPaletteId): PosterPaletteId {
  if (typeof val !== 'string') return fallback;
  if (val === 'almacen') return 'oliva';
  if (val === 'azul') return 'petroleo';
  return POSTER_PALETTES.some((p) => p.id === val) ? (val as PosterPaletteId) : fallback;
}

export function crearBorradoresIniciales(): DraftsPorPlantilla {
  return {
    oferta: {
      paletteId: 'oliva',
      badge: 'OFERTA DEL DÍA',
      title: 'Asado Novillito x kg',
      unitNote: 'Corte fresco seleccionado · Precio por kilo',
      priceInput: '9.800',
      oldPriceInput: '11.200',
      validity: 'Solo hoy · Hasta agotar stock',
      photoDataUrl: '',
      showLogo: true,
      showWhatsapp: true,
    },
    lista: {
      paletteId: 'oliva',
      badge: 'LISTA DE PRECIOS',
      title: 'Especiales de la Semana',
      subtitle: 'Efectivo o transferencia al Alias · Precios finales',
      footerNote: 'Hacé tu pedido por WhatsApp y retirá sin fila',
      showLogo: true,
      showWhatsapp: true,
      items: [
        { id: 'i1', name: 'Asado Novillito', detail: 'x kg', priceInput: '9.800' },
        { id: 'i2', name: 'Vacío Tierno', detail: 'x kg', priceInput: '10.900' },
        { id: 'i3', name: 'Milanesa de Nalga', detail: 'x kg', priceInput: '9.400' },
        { id: 'i4', name: 'Pollo Entero', detail: 'x kg', priceInput: '3.850' },
        { id: 'i5', name: 'Chorizo Puro Cerdo', detail: 'x kg', priceInput: '6.200' },
      ],
    },
    gondola: {
      paletteId: 'terracota',
      layout: '4x',
      cards: [
        {
          id: 'g1',
          badge: 'SÚPER OFERTA',
          title: 'YERBA PLAYADITO 1 KG',
          oldPriceInput: '4.900',
          priceInput: '4.250',
          detail: 'Válido hasta agotar stock',
        },
        {
          id: 'g2',
          badge: 'PROMO ESPECIAL',
          title: 'ACEITE GIRASOL 1,5 L',
          oldPriceInput: '',
          priceInput: '3.100',
          detail: 'Llevando 2 unidades',
        },
        {
          id: 'g3',
          badge: 'SELECCIÓN',
          title: 'ASADO NOVILLITO x KG',
          oldPriceInput: '',
          priceInput: '9.800',
          detail: 'Oferta de la semana',
        },
        {
          id: 'g4',
          badge: 'BEBIDAS',
          title: 'FERNET BRANCA 750 ML',
          oldPriceInput: '',
          priceInput: '12.400',
          detail: 'Efectivo / Transferencia',
        },
      ],
    },
    qr: {
      paletteId: 'grafito',
      badge: 'COBRO INMEDIATO',
      title: 'PAGÁ CON TRANSFERENCIA',
      amountInput: '',
      footerNote: 'Sin recargo · Enviá tu comprobante por WhatsApp',
      showLogo: true,
      showWhatsapp: true,
    },
    horarios: {
      paletteId: 'petroleo',
      statusTag: 'ATENCIÓN NORMAL',
      title: 'HORARIOS DE ATENCIÓN',
      scheduleLines: [
        { id: 'h1', label: 'Lunes a Sábados', hours: '08:30 a 13:00 · 17:00 a 21:00' },
        { id: 'h2', label: 'Domingos y Feriados', hours: '09:00 a 13:30' },
      ],
      note: 'Pedidos con envío a domicilio hasta las 20:30 hs',
      showAddress: true,
      showLogo: true,
      showWhatsapp: true,
    },
  };
}

export function mezclarBorradorPlantilla<T extends TemplateId>(
  templateId: T,
  incoming: unknown
): DraftsPorPlantilla[T] {
  const defaults = crearBorradoresIniciales();
  const base = defaults[templateId];
  if (typeof incoming !== 'object' || incoming === null) {
    return JSON.parse(JSON.stringify(base)) as DraftsPorPlantilla[T];
  }
  const inc = incoming as Record<string, unknown>;

  if (templateId === 'oferta') {
    const def = defaults.oferta;
    const photoRaw = typeof inc.photoDataUrl === 'string' ? inc.photoDataUrl.trim() : '';
    return {
      paletteId: sanitizarPaletteId(inc.paletteId, def.paletteId),
      badge: typeof inc.badge === 'string' ? inc.badge.slice(0, 32) : def.badge,
      title: typeof inc.title === 'string' ? inc.title.slice(0, 64) : def.title,
      unitNote: typeof inc.unitNote === 'string' ? inc.unitNote.slice(0, 72) : def.unitNote,
      priceInput: typeof inc.priceInput === 'string' ? inc.priceInput.slice(0, 20) : def.priceInput,
      oldPriceInput:
        typeof inc.oldPriceInput === 'string' ? inc.oldPriceInput.slice(0, 20) : def.oldPriceInput,
      validity: typeof inc.validity === 'string' ? inc.validity.slice(0, 56) : def.validity,
      photoDataUrl: photoRaw.startsWith('data:image/') ? photoRaw : '',
      showLogo: inc.showLogo !== false,
      showWhatsapp: inc.showWhatsapp !== false,
    } as DraftsPorPlantilla[T];
  }

  if (templateId === 'lista') {
    const def = defaults.lista;
    const rawItems = Array.isArray(inc.items) && inc.items.length > 0 ? inc.items : def.items;
    const items: ListaItem[] = rawItems.slice(0, 10).map((it, idx) => {
      const obj = typeof it === 'object' && it !== null ? (it as Record<string, unknown>) : {};
      return {
        id: typeof obj.id === 'string' && obj.id.trim() ? obj.id : `item-${idx + 1}`,
        name: typeof obj.name === 'string' ? obj.name.slice(0, 48) : '',
        detail: typeof obj.detail === 'string' ? obj.detail.slice(0, 28) : '',
        priceInput: typeof obj.priceInput === 'string' ? obj.priceInput.slice(0, 20) : '',
      };
    });
    return {
      paletteId: sanitizarPaletteId(inc.paletteId, def.paletteId),
      badge: typeof inc.badge === 'string' ? inc.badge.slice(0, 32) : def.badge,
      title: typeof inc.title === 'string' ? inc.title.slice(0, 48) : def.title,
      subtitle: typeof inc.subtitle === 'string' ? inc.subtitle.slice(0, 72) : def.subtitle,
      footerNote: typeof inc.footerNote === 'string' ? inc.footerNote.slice(0, 72) : def.footerNote,
      showLogo: inc.showLogo !== false,
      showWhatsapp: inc.showWhatsapp !== false,
      items,
    } as DraftsPorPlantilla[T];
  }

  if (templateId === 'gondola') {
    const def = defaults.gondola;
    const rawCards = Array.isArray(inc.cards) ? inc.cards : [];
    const cards: GondolaCard[] = def.cards.map((defCard, idx) => {
      const raw = rawCards[idx];
      if (typeof raw !== 'object' || raw === null) return { ...defCard };
      const obj = raw as Record<string, unknown>;
      return {
        id: typeof obj.id === 'string' && obj.id.trim() ? obj.id : defCard.id,
        badge: typeof obj.badge === 'string' ? obj.badge.slice(0, 28) : defCard.badge,
        title: typeof obj.title === 'string' ? obj.title.slice(0, 48) : defCard.title,
        oldPriceInput:
          typeof obj.oldPriceInput === 'string' ? obj.oldPriceInput.slice(0, 20) : defCard.oldPriceInput,
        priceInput:
          typeof obj.priceInput === 'string' ? obj.priceInput.slice(0, 20) : defCard.priceInput,
        detail: typeof obj.detail === 'string' ? obj.detail.slice(0, 48) : defCard.detail,
      };
    });
    return {
      paletteId: sanitizarPaletteId(inc.paletteId, def.paletteId),
      layout: inc.layout === '2x' ? '2x' : '4x',
      cards,
    } as DraftsPorPlantilla[T];
  }

  if (templateId === 'qr') {
    const def = defaults.qr;
    return {
      paletteId: sanitizarPaletteId(inc.paletteId, def.paletteId),
      badge: typeof inc.badge === 'string' ? inc.badge.slice(0, 28) : def.badge,
      title: typeof inc.title === 'string' ? inc.title.slice(0, 44) : def.title,
      amountInput: typeof inc.amountInput === 'string' ? inc.amountInput.slice(0, 20) : def.amountInput,
      footerNote: typeof inc.footerNote === 'string' ? inc.footerNote.slice(0, 68) : def.footerNote,
      showLogo: inc.showLogo !== false,
      showWhatsapp: inc.showWhatsapp !== false,
    } as DraftsPorPlantilla[T];
  }

  // horarios
  const def = defaults.horarios;
  const rawLines =
    Array.isArray(inc.scheduleLines) && inc.scheduleLines.length > 0
      ? inc.scheduleLines
      : def.scheduleLines;
  const scheduleLines: HorarioLine[] = rawLines.slice(0, 4).map((l, idx) => {
    const obj = typeof l === 'object' && l !== null ? (l as Record<string, unknown>) : {};
    return {
      id: typeof obj.id === 'string' && obj.id.trim() ? obj.id : `h-${idx + 1}`,
      label: typeof obj.label === 'string' ? obj.label.slice(0, 40) : '',
      hours: typeof obj.hours === 'string' ? obj.hours.slice(0, 48) : '',
    };
  });
  return {
    paletteId: sanitizarPaletteId(inc.paletteId, def.paletteId),
    statusTag: typeof inc.statusTag === 'string' ? inc.statusTag.slice(0, 32) : def.statusTag,
    title: typeof inc.title === 'string' ? inc.title.slice(0, 48) : def.title,
    scheduleLines,
    note: typeof inc.note === 'string' ? inc.note.slice(0, 76) : def.note,
    showAddress: inc.showAddress !== false,
    showLogo: inc.showLogo !== false,
    showWhatsapp: inc.showWhatsapp !== false,
  } as DraftsPorPlantilla[T];
}

export function obtenerTituloPlaca(
  templateId: TemplateId,
  draft: DraftsPorPlantilla[TemplateId]
): string {
  if (templateId === 'gondola') {
    const g = draft as GondolaDraft;
    const primero = g.cards[0]?.title.trim();
    return primero ? `Góndola A4 · ${primero}` : 'Carteles de Góndola A4';
  }
  const titulo = 'title' in draft ? draft.title.trim() : '';
  return titulo || TEMPLATE_DEFS.find((t) => t.id === templateId)?.label || 'Placa';
}

/**
 * Ajusta todos los precios de Lista de Precios o Góndola A4 por un porcentaje (ej. +10 o -5).
 */
export function ajustarListaPorPorcentaje(draft: ListaDraft, porcentaje: number): ListaDraft {
  return {
    ...draft,
    items: draft.items.map((item) => ({
      ...item,
      priceInput: aplicarPorcentajePrecio(item.priceInput, porcentaje),
    })),
  };
}

export function ajustarGondolaPorPorcentaje(draft: GondolaDraft, porcentaje: number): GondolaDraft {
  return {
    ...draft,
    cards: draft.cards.map((card) => ({
      ...card,
      priceInput: aplicarPorcentajePrecio(card.priceInput, porcentaje),
      oldPriceInput: card.oldPriceInput
        ? aplicarPorcentajePrecio(card.oldPriceInput, porcentaje)
        : '',
    })),
  };
}

/**
 * Construye el payload QR 100% offline solo a partir del Alias / CVU del comercio.
 */
export function construirPayloadQrOffline(
  identidad: IdentidadComercio,
  montoInput = ''
): string {
  const nombre = identidad.nombre.trim() || 'Comercio';
  const alias = identidad.aliasOCbu.trim();
  const cvu = identidad.cvu.trim();
  const banco = identidad.banco.trim();
  const titular = identidad.titularCuenta.trim();

  const lines: string[] = [`TRANSFERENCIA - ${nombre}`];
  if (alias) lines.push(`Alias: ${alias}`);
  if (cvu) lines.push(`CVU/CBU: ${cvu}`);
  if (banco) lines.push(`Cuenta: ${banco}`);
  if (titular) lines.push(`Titular: ${titular}`);

  const monto = parseMoneyAr(montoInput);
  if (monto > 0) {
    lines.push(`Importe: ${formatArs(monto)}`);
  }

  return lines.length > 1 ? lines.join('\n') : `TRANSFERENCIA - ${nombre}\nAlias pendiente`;
}

/**
 * Construye texto limpio para WhatsApp (CERO emojis).
 */
export function construirTextoWhatsappPlaca(params: {
  templateId: TemplateId;
  draft: DraftsPorPlantilla[TemplateId];
  identidad: IdentidadComercio;
}): string {
  const { templateId, draft, identidad } = params;
  const comercio = quitarEmojis(identidad.nombre || 'Mi Comercio');
  const wa = identidad.whatsapp.trim();
  const alias = identidad.aliasOCbu.trim();
  const lines: string[] = [];

  if (templateId === 'oferta') {
    const d = draft as OfertaDraft;
    const precio = parseMoneyAr(d.priceInput);
    lines.push(`${comercio} - ${quitarEmojis(d.badge || 'OFERTA DEL DIA')}`);
    lines.push(`${quitarEmojis(d.title || 'Producto')}${precio > 0 ? `: ${formatArs(precio)}` : ''}`);
    if (d.validity.trim()) lines.push(quitarEmojis(d.validity));
  } else if (templateId === 'lista') {
    const d = draft as ListaDraft;
    lines.push(`${comercio} - ${quitarEmojis(d.title || 'Lista de precios')}`);
    for (const item of d.items.slice(0, 10)) {
      const p = parseMoneyAr(item.priceInput);
      const nom = quitarEmojis(item.name);
      if (!nom) continue;
      const det = item.detail.trim() ? ` (${quitarEmojis(item.detail)})` : '';
      lines.push(`- ${nom}${det}: ${p > 0 ? formatArs(p) : item.priceInput}`);
    }
  } else if (templateId === 'qr') {
    const d = draft as QrDraft;
    lines.push(`${comercio} - Datos para transferencia`);
    if (alias) lines.push(`Alias: ${alias}`);
    if (identidad.cvu.trim()) lines.push(`CVU/CBU: ${identidad.cvu.trim()}`);
    const monto = parseMoneyAr(d.amountInput);
    if (monto > 0) lines.push(`Importe: ${formatArs(monto)}`);
  } else if (templateId === 'horarios') {
    const d = draft as HorariosDraft;
    lines.push(`${comercio} - ${quitarEmojis(d.title || 'Horarios de atencion')}`);
    for (const h of d.scheduleLines) {
      if (h.label.trim() || h.hours.trim()) {
        lines.push(`${quitarEmojis(h.label)}: ${quitarEmojis(h.hours)}`);
      }
    }
    if (d.note.trim()) lines.push(quitarEmojis(d.note));
  } else {
    lines.push(`${comercio} - Carteles de gondola A4`);
  }

  if (wa) {
    lines.push(`Pedidos por WhatsApp: ${wa}`);
  }

  return quitarEmojis(lines.join('\n'));
}

export function construirUrlWhatsapp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(quitarEmojis(texto))}`;
}
