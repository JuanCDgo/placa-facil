import React from 'react';
import { Percent, Plus, Trash2, Upload, X } from 'lucide-react';
import { sanitizeDecimalInput } from '../domain/dinero';
import { comprimirFotoProducto, type IdentidadComercio } from '../domain/identidad';
import {
  ajustarGondolaPorPorcentaje,
  ajustarListaPorPorcentaje,
  POSTER_PALETTES,
  type DraftsPorPlantilla,
  type GondolaDraft,
  type HorariosDraft,
  type ListaDraft,
  type OfertaDraft,
  type PosterPaletteId,
  type QrDraft,
  type TemplateId,
} from '../domain/placas';

interface TemplateFormProps {
  templateId: TemplateId;
  draft: DraftsPorPlantilla[TemplateId];
  identidad: IdentidadComercio;
  onChangeDraft: (next: DraftsPorPlantilla[TemplateId]) => void;
  onNotify: (msg: string) => void;
}

function PalettePicker({
  value,
  onChange,
}: {
  value: PosterPaletteId;
  onChange: (id: PosterPaletteId) => void;
}): React.JSX.Element {
  const current = POSTER_PALETTES.find((p) => p.id === value) ?? POSTER_PALETTES[0];
  return (
    <div className="pf-field">
      <div className="pf-field-head">
        <span className="pf-label">Tinta del cartel</span>
        <span className="pf-muted-xs">{current.name}</span>
      </div>
      <div className="pf-swatch-list" role="radiogroup" aria-label="Tinta del cartel">
        {POSTER_PALETTES.map((p) => {
          const selected = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={p.name}
              title={p.name}
              className={`pf-swatch-btn ${selected ? 'is-selected' : ''}`}
              style={{ backgroundColor: p.accent }}
              onClick={() => onChange(p.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function TemplateForm({
  templateId,
  draft,
  identidad,
  onChangeDraft,
  onNotify,
}: TemplateFormProps): React.JSX.Element {
  if (templateId === 'oferta') {
    const d = draft as OfertaDraft;
    const update = <K extends keyof OfertaDraft>(field: K, val: OfertaDraft[K]) =>
      onChangeDraft({ ...d, [field]: val });

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const compressed = await comprimirFotoProducto(file);
        update('photoDataUrl', compressed);
        onNotify('Foto cargada en la placa.');
      } catch (err: unknown) {
        onNotify(err instanceof Error ? err.message : 'No se pudo cargar la foto.');
      }
    };

    return (
      <form className="pf-stack" onSubmit={(e) => e.preventDefault()}>
        <div className="pf-field">
          <label className="pf-label" htmlFor="oferta-title">
            Producto / Encabezado
          </label>
          <input
            id="oferta-title"
            className="pf-input"
            type="text"
            maxLength={64}
            value={d.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>

        <div className="pf-row-2">
          <div className="pf-field">
            <label className="pf-label" htmlFor="oferta-price">
              Precio ($ ARS)
            </label>
            <div className="pf-input-prefix-wrap">
              <span className="pf-input-prefix">$</span>
              <input
                id="oferta-price"
                className="pf-input pf-mono"
                type="text"
                inputMode="decimal"
                value={d.priceInput}
                onChange={(e) => update('priceInput', sanitizeDecimalInput(e.target.value))}
              />
            </div>
          </div>
          <div className="pf-field">
            <label className="pf-label" htmlFor="oferta-old-price">
              Precio anterior
            </label>
            <div className="pf-input-prefix-wrap">
              <span className="pf-input-prefix">$</span>
              <input
                id="oferta-old-price"
                className="pf-input pf-mono"
                type="text"
                inputMode="decimal"
                placeholder="Opcional"
                value={d.oldPriceInput}
                onChange={(e) => update('oldPriceInput', sanitizeDecimalInput(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="pf-field">
          <label className="pf-label" htmlFor="oferta-unit">
            Detalle / Unidad (opcional)
          </label>
          <input
            id="oferta-unit"
            className="pf-input"
            type="text"
            maxLength={72}
            value={d.unitNote}
            onChange={(e) => update('unitNote', e.target.value)}
          />
        </div>

        <div className="pf-row-2">
          <div className="pf-field">
            <label className="pf-label" htmlFor="oferta-badge">
              Etiqueta superior
            </label>
            <input
              id="oferta-badge"
              className="pf-input"
              type="text"
              maxLength={32}
              value={d.badge}
              onChange={(e) => update('badge', e.target.value)}
            />
          </div>
          <div className="pf-field">
            <label className="pf-label" htmlFor="oferta-validity">
              Vigencia
            </label>
            <input
              id="oferta-validity"
              className="pf-input"
              type="text"
              maxLength={56}
              value={d.validity}
              onChange={(e) => update('validity', e.target.value)}
            />
          </div>
        </div>

        <div className="pf-field">
          <span className="pf-label">Foto del producto (opcional)</span>
          <div className="pf-inline-actions">
            <label className="pf-btn pf-btn-sm" style={{ flex: 1 }}>
              <Upload size={15} />
              <span>{d.photoDataUrl ? 'Cambiar foto' : 'Subir foto'}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handlePhotoUpload}
              />
            </label>
            {d.photoDataUrl ? (
              <button
                type="button"
                className="pf-btn pf-btn-sm pf-btn-danger"
                onClick={() => update('photoDataUrl', '')}
              >
                <X size={15} />
                <span>Quitar</span>
              </button>
            ) : null}
          </div>
        </div>

        <PalettePicker value={d.paletteId} onChange={(pid) => update('paletteId', pid)} />

        <div className="pf-row-2">
          <label className="pf-check-row">
            <input
              type="checkbox"
              checked={d.showLogo}
              onChange={(e) => update('showLogo', e.target.checked)}
            />
            <span>Mostrar logo</span>
          </label>
          <label className="pf-check-row">
            <input
              type="checkbox"
              checked={d.showWhatsapp}
              onChange={(e) => update('showWhatsapp', e.target.checked)}
            />
            <span>Mostrar WhatsApp</span>
          </label>
        </div>
      </form>
    );
  }

  if (templateId === 'lista') {
    const d = draft as ListaDraft;
    const update = <K extends keyof ListaDraft>(field: K, val: ListaDraft[K]) =>
      onChangeDraft({ ...d, [field]: val });

    const updateItem = (idx: number, field: 'name' | 'detail' | 'priceInput', val: string) => {
      const next = d.items.map((it, i) => (i === idx ? { ...it, [field]: val } : it));
      update('items', next);
    };

    const addItem = () => {
      if (d.items.length >= 10) return;
      update('items', [
        ...d.items,
        { id: `item-${Date.now()}`, name: 'Nuevo producto', detail: 'x u', priceInput: '1.500' },
      ]);
    };

    const removeItem = (idx: number) => {
      if (d.items.length <= 1) return;
      update(
        'items',
        d.items.filter((_, i) => i !== idx)
      );
    };

    const applyPercent = (pct: number) => {
      onChangeDraft(ajustarListaPorPorcentaje(d, pct));
      onNotify(`Precios de la lista ajustados ${pct > 0 ? `+${pct}%` : `${pct}%`}.`);
    };

    return (
      <form className="pf-stack" onSubmit={(e) => e.preventDefault()}>
        <div className="pf-row-2">
          <div className="pf-field">
            <label className="pf-label" htmlFor="lista-badge">
              Etiqueta
            </label>
            <input
              id="lista-badge"
              className="pf-input"
              type="text"
              maxLength={32}
              value={d.badge}
              onChange={(e) => update('badge', e.target.value)}
            />
          </div>
          <div className="pf-field">
            <label className="pf-label" htmlFor="lista-title">
              Título principal
            </label>
            <input
              id="lista-title"
              className="pf-input"
              type="text"
              maxLength={48}
              value={d.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </div>
        </div>

        <div className="pf-field">
          <label className="pf-label" htmlFor="lista-sub">
            Subtítulo / Aclaración
          </label>
          <input
            id="lista-sub"
            className="pf-input"
            type="text"
            maxLength={72}
            value={d.subtitle}
            onChange={(e) => update('subtitle', e.target.value)}
          />
        </div>

        <div className="pf-subcard">
          <div className="pf-field-head">
            <span className="pf-label pf-inline-icon">
              <Percent size={14} /> Ajuste rápido de lista
            </span>
          </div>
          <div className="pf-pct-row">
            <button type="button" className="pf-btn pf-btn-xs" onClick={() => applyPercent(-5)}>
              -5%
            </button>
            <button type="button" className="pf-btn pf-btn-xs" onClick={() => applyPercent(5)}>
              +5%
            </button>
            <button type="button" className="pf-btn pf-btn-xs" onClick={() => applyPercent(10)}>
              +10%
            </button>
            <button type="button" className="pf-btn pf-btn-xs" onClick={() => applyPercent(15)}>
              +15%
            </button>
          </div>
        </div>

        <div className="pf-field">
          <div className="pf-field-head">
            <span className="pf-label">Productos ({d.items.length}/10)</span>
            <button
              type="button"
              className="pf-btn pf-btn-xs"
              disabled={d.items.length >= 10}
              onClick={addItem}
            >
              <Plus size={14} />
              <span>Agregar</span>
            </button>
          </div>
          <div className="pf-stack-sm">
            {d.items.map((item, idx) => (
              <div key={item.id} className="pf-subcard">
                <div className="pf-field-head">
                  <span className="pf-muted-xs">Ítem #{idx + 1}</span>
                  {d.items.length > 1 ? (
                    <button
                      type="button"
                      className="pf-btn pf-btn-xs pf-btn-danger"
                      aria-label={`Quitar ítem ${idx + 1}`}
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>
                <input
                  className="pf-input"
                  type="text"
                  aria-label={`Nombre ítem ${idx + 1}`}
                  placeholder="Producto"
                  value={item.name}
                  onChange={(e) => updateItem(idx, 'name', e.target.value)}
                />
                <div className="pf-row-2">
                  <input
                    className="pf-input"
                    type="text"
                    aria-label={`Detalle ítem ${idx + 1}`}
                    placeholder="x kg / x u"
                    value={item.detail}
                    onChange={(e) => updateItem(idx, 'detail', e.target.value)}
                  />
                  <div className="pf-input-prefix-wrap">
                    <span className="pf-input-prefix">$</span>
                    <input
                      className="pf-input pf-mono"
                      type="text"
                      inputMode="decimal"
                      aria-label={`Precio ítem ${idx + 1}`}
                      value={item.priceInput}
                      onChange={(e) =>
                        updateItem(idx, 'priceInput', sanitizeDecimalInput(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pf-field">
          <label className="pf-label" htmlFor="lista-foot">
            Pie de lista
          </label>
          <input
            id="lista-foot"
            className="pf-input"
            type="text"
            maxLength={72}
            value={d.footerNote}
            onChange={(e) => update('footerNote', e.target.value)}
          />
        </div>

        <PalettePicker value={d.paletteId} onChange={(pid) => update('paletteId', pid)} />

        <div className="pf-row-2">
          <label className="pf-check-row">
            <input
              type="checkbox"
              checked={d.showLogo}
              onChange={(e) => update('showLogo', e.target.checked)}
            />
            <span>Mostrar logo</span>
          </label>
          <label className="pf-check-row">
            <input
              type="checkbox"
              checked={d.showWhatsapp}
              onChange={(e) => update('showWhatsapp', e.target.checked)}
            />
            <span>Mostrar WhatsApp</span>
          </label>
        </div>
      </form>
    );
  }

  if (templateId === 'gondola') {
    const d = draft as GondolaDraft;
    const visibleCount = d.layout === '2x' ? 2 : 4;
    const update = <K extends keyof GondolaDraft>(field: K, val: GondolaDraft[K]) =>
      onChangeDraft({ ...d, [field]: val });

    const updateCard = (
      idx: number,
      field: 'badge' | 'title' | 'priceInput' | 'oldPriceInput' | 'detail',
      val: string
    ) => {
      const next = d.cards.map((c, i) => (i === idx ? { ...c, [field]: val } : c));
      update('cards', next);
    };

    const applyPercent = (pct: number) => {
      onChangeDraft(ajustarGondolaPorPorcentaje(d, pct));
      onNotify(`Carteles de góndola ajustados ${pct > 0 ? `+${pct}%` : `${pct}%`}.`);
    };

    return (
      <form className="pf-stack" onSubmit={(e) => e.preventDefault()}>
        <div className="pf-field">
          <span className="pf-label">Hoja A4 (210 × 297 mm)</span>
          <div className="pf-segmented pf-segmented-2">
            <button
              type="button"
              aria-pressed={d.layout === '2x'}
              className={`pf-seg-btn ${d.layout === '2x' ? 'is-active' : ''}`}
              onClick={() => update('layout', '2x')}
            >
              <span>2 por hoja (A5)</span>
            </button>
            <button
              type="button"
              aria-pressed={d.layout === '4x'}
              className={`pf-seg-btn ${d.layout === '4x' ? 'is-active' : ''}`}
              onClick={() => update('layout', '4x')}
            >
              <span>4 por hoja (2×2)</span>
            </button>
          </div>
        </div>

        <div className="pf-subcard">
          <div className="pf-field-head">
            <span className="pf-label pf-inline-icon">
              <Percent size={14} /> Ajuste rápido de precios
            </span>
          </div>
          <div className="pf-pct-row">
            <button type="button" className="pf-btn pf-btn-xs" onClick={() => applyPercent(-5)}>
              -5%
            </button>
            <button type="button" className="pf-btn pf-btn-xs" onClick={() => applyPercent(5)}>
              +5%
            </button>
            <button type="button" className="pf-btn pf-btn-xs" onClick={() => applyPercent(10)}>
              +10%
            </button>
            <button type="button" className="pf-btn pf-btn-xs" onClick={() => applyPercent(15)}>
              +15%
            </button>
          </div>
        </div>

        <PalettePicker value={d.paletteId} onChange={(pid) => update('paletteId', pid)} />

        {d.cards.slice(0, visibleCount).map((card, idx) => (
          <div key={card.id} className="pf-subcard">
            <div className="pf-field-head">
              <span className="pf-label">Cartel #{idx + 1}</span>
              <span className="pf-mono pf-muted-xs">
                {card.priceInput ? `$ ${card.priceInput}` : ''}
              </span>
            </div>
            <input
              className="pf-input"
              type="text"
              aria-label={`Producto cartel ${idx + 1}`}
              placeholder="Nombre del producto"
              value={card.title}
              onChange={(e) => updateCard(idx, 'title', e.target.value)}
            />
            <div className="pf-row-2">
              <div className="pf-input-prefix-wrap">
                <span className="pf-input-prefix">$</span>
                <input
                  className="pf-input pf-mono"
                  type="text"
                  inputMode="decimal"
                  aria-label={`Precio cartel ${idx + 1}`}
                  value={card.priceInput}
                  onChange={(e) =>
                    updateCard(idx, 'priceInput', sanitizeDecimalInput(e.target.value))
                  }
                />
              </div>
              <div className="pf-input-prefix-wrap">
                <span className="pf-input-prefix">$</span>
                <input
                  className="pf-input pf-mono"
                  type="text"
                  inputMode="decimal"
                  aria-label={`Precio anterior cartel ${idx + 1}`}
                  placeholder="Antes (opc.)"
                  value={card.oldPriceInput}
                  onChange={(e) =>
                    updateCard(idx, 'oldPriceInput', sanitizeDecimalInput(e.target.value))
                  }
                />
              </div>
            </div>
            <div className="pf-row-2">
              <input
                className="pf-input"
                type="text"
                aria-label={`Etiqueta cartel ${idx + 1}`}
                placeholder="SÚPER OFERTA"
                value={card.badge}
                onChange={(e) => updateCard(idx, 'badge', e.target.value)}
              />
              <input
                className="pf-input"
                type="text"
                aria-label={`Aclaración cartel ${idx + 1}`}
                placeholder="Llevando 2 u."
                value={card.detail}
                onChange={(e) => updateCard(idx, 'detail', e.target.value)}
              />
            </div>
          </div>
        ))}
      </form>
    );
  }

  if (templateId === 'qr') {
    const d = draft as QrDraft;
    const update = <K extends keyof QrDraft>(field: K, val: QrDraft[K]) =>
      onChangeDraft({ ...d, [field]: val });

    return (
      <form className="pf-stack" onSubmit={(e) => e.preventDefault()}>
        <div className="pf-help-box">
          QR 100% offline generado desde tu Alias:{' '}
          <strong className="pf-mono">{identidad.aliasOCbu || 'Sin configurar'}</strong>
          {identidad.banco ? ` · ${identidad.banco}` : ''}. Editalo en <strong>Mi Negocio</strong>.
        </div>

        <div className="pf-field">
          <label className="pf-label" htmlFor="qr-title">
            Título del cartel
          </label>
          <input
            id="qr-title"
            className="pf-input"
            type="text"
            maxLength={44}
            value={d.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>

        <div className="pf-row-2">
          <div className="pf-field">
            <label className="pf-label" htmlFor="qr-badge">
              Etiqueta superior
            </label>
            <input
              id="qr-badge"
              className="pf-input"
              type="text"
              maxLength={28}
              value={d.badge}
              onChange={(e) => update('badge', e.target.value)}
            />
          </div>
          <div className="pf-field">
            <label className="pf-label" htmlFor="qr-amount">
              Monto fijo (opc.)
            </label>
            <div className="pf-input-prefix-wrap">
              <span className="pf-input-prefix">$</span>
              <input
                id="qr-amount"
                className="pf-input pf-mono"
                type="text"
                inputMode="decimal"
                placeholder="Libre"
                value={d.amountInput}
                onChange={(e) => update('amountInput', sanitizeDecimalInput(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="pf-field">
          <label className="pf-label" htmlFor="qr-foot">
            Nota al pie
          </label>
          <input
            id="qr-foot"
            className="pf-input"
            type="text"
            maxLength={68}
            value={d.footerNote}
            onChange={(e) => update('footerNote', e.target.value)}
          />
        </div>

        <PalettePicker value={d.paletteId} onChange={(pid) => update('paletteId', pid)} />

        <div className="pf-row-2">
          <label className="pf-check-row">
            <input
              type="checkbox"
              checked={d.showLogo}
              onChange={(e) => update('showLogo', e.target.checked)}
            />
            <span>Mostrar logo</span>
          </label>
          <label className="pf-check-row">
            <input
              type="checkbox"
              checked={d.showWhatsapp}
              onChange={(e) => update('showWhatsapp', e.target.checked)}
            />
            <span>Mostrar WhatsApp</span>
          </label>
        </div>
      </form>
    );
  }

  // horarios
  const d = draft as HorariosDraft;
  const update = <K extends keyof HorariosDraft>(field: K, val: HorariosDraft[K]) =>
    onChangeDraft({ ...d, [field]: val });

  const updateLine = (idx: number, field: 'label' | 'hours', val: string) => {
    const next = d.scheduleLines.map((l, i) => (i === idx ? { ...l, [field]: val } : l));
    update('scheduleLines', next);
  };

  const addLine = () => {
    if (d.scheduleLines.length >= 4) return;
    update('scheduleLines', [
      ...d.scheduleLines,
      { id: `h-${Date.now()}`, label: 'Feriados', hours: '09:00 a 13:00' },
    ]);
  };

  const removeLine = (idx: number) => {
    if (d.scheduleLines.length <= 1) return;
    update(
      'scheduleLines',
      d.scheduleLines.filter((_, i) => i !== idx)
    );
  };

  return (
    <form className="pf-stack" onSubmit={(e) => e.preventDefault()}>
      <div className="pf-row-2">
        <div className="pf-field">
          <label className="pf-label" htmlFor="hor-status">
            Estado / Aviso
          </label>
          <input
            id="hor-status"
            className="pf-input"
            type="text"
            maxLength={32}
            value={d.statusTag}
            onChange={(e) => update('statusTag', e.target.value)}
          />
        </div>
        <div className="pf-field">
          <label className="pf-label" htmlFor="hor-title">
            Título grande
          </label>
          <input
            id="hor-title"
            className="pf-input"
            type="text"
            maxLength={48}
            value={d.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>
      </div>

      <div className="pf-field">
        <div className="pf-field-head">
          <span className="pf-label">Franjas horarias ({d.scheduleLines.length}/4)</span>
          <button
            type="button"
            className="pf-btn pf-btn-xs"
            disabled={d.scheduleLines.length >= 4}
            onClick={addLine}
          >
            <Plus size={14} />
            <span>Agregar</span>
          </button>
        </div>
        <div className="pf-stack-sm">
          {d.scheduleLines.map((line, idx) => (
            <div key={line.id} className="pf-subcard">
              <div className="pf-field-head">
                <span className="pf-muted-xs">Franja #{idx + 1}</span>
                {d.scheduleLines.length > 1 ? (
                  <button
                    type="button"
                    className="pf-btn pf-btn-xs pf-btn-danger"
                    aria-label={`Quitar franja ${idx + 1}`}
                    onClick={() => removeLine(idx)}
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
              <input
                className="pf-input"
                type="text"
                aria-label={`Días franja ${idx + 1}`}
                value={line.label}
                onChange={(e) => updateLine(idx, 'label', e.target.value)}
              />
              <input
                className="pf-input pf-mono"
                type="text"
                aria-label={`Horario franja ${idx + 1}`}
                value={line.hours}
                onChange={(e) => updateLine(idx, 'hours', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pf-field">
        <label className="pf-label" htmlFor="hor-note">
          Aclaración (ej. feriados / envíos)
        </label>
        <input
          id="hor-note"
          className="pf-input"
          type="text"
          maxLength={76}
          value={d.note}
          onChange={(e) => update('note', e.target.value)}
        />
      </div>

      <label className="pf-check-row">
        <input
          type="checkbox"
          checked={d.showAddress}
          onChange={(e) => update('showAddress', e.target.checked)}
        />
        <span>Mostrar dirección del comercio</span>
      </label>

      <PalettePicker value={d.paletteId} onChange={(pid) => update('paletteId', pid)} />
    </form>
  );
}
