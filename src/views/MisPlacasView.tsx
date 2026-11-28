import React, { useMemo, useState } from 'react';
import { Copy, FolderOpen, Trash2 } from 'lucide-react';
import { formatearFechaHoraAr } from '../domain/dinero';
import {
  FORMAT_DEFS,
  TEMPLATE_DEFS,
  type PlacaGuardada,
  type TemplateId,
} from '../domain/placas';

interface MisPlacasViewProps {
  plates: PlacaGuardada[];
  onOpenPlate: (plate: PlacaGuardada) => void;
  onDuplicatePlate: (plate: PlacaGuardada) => void;
  onDeletePlate: (id: string) => void;
}

export function MisPlacasView({
  plates,
  onOpenPlate,
  onDuplicatePlate,
  onDeletePlate,
}: MisPlacasViewProps): React.JSX.Element {
  const [filter, setFilter] = useState<'all' | TemplateId>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return plates;
    return plates.filter((p) => p.templateId === filter);
  }, [plates, filter]);

  if (plates.length === 0) {
    return (
      <section className="pf-card">
        <h2 className="pf-card-title">Mis Placas</h2>
        <div className="pf-help-box">
          Todavía no guardaste ninguna placa. Armá una oferta, lista de precios o cartel en el{' '}
          <strong>Editor</strong> y tocá <strong>Guardar</strong> para reutilizarla y cambiar solo
          el precio cuando lo necesites.
        </div>
      </section>
    );
  }

  return (
    <section className="pf-stack">
      <div className="pf-pill-strip" role="tablist" aria-label="Filtrar placas">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`pf-pill ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas ({plates.length})
        </button>
        {TEMPLATE_DEFS.map((tpl) => {
          const count = plates.filter((p) => p.templateId === tpl.id).length;
          if (count === 0) return null;
          return (
            <button
              key={tpl.id}
              type="button"
              role="tab"
              aria-selected={filter === tpl.id}
              className={`pf-pill ${filter === tpl.id ? 'is-active' : ''}`}
              onClick={() => setFilter(tpl.id)}
            >
              {tpl.shortLabel} ({count})
            </button>
          );
        })}
      </div>

      <div className="pf-plates-grid">
        {filtered.map((plate) => {
          const tplLabel =
            TEMPLATE_DEFS.find((t) => t.id === plate.templateId)?.shortLabel ?? plate.templateId;
          const fmtLabel =
            plate.templateId === 'gondola'
              ? 'A4 PDF'
              : (FORMAT_DEFS.find((f) => f.id === plate.formatId)?.label ?? plate.formatId);

          return (
            <article key={plate.id} className="pf-card pf-plate-card">
              <div className="pf-field-head">
                <span className="pf-badge">{tplLabel}</span>
                <span className="pf-mono pf-muted-xs">{fmtLabel}</span>
              </div>

              <div>
                <h3 className="pf-plate-title">{plate.title}</h3>
                <p className="pf-muted-xs" style={{ margin: '4px 0 0' }}>
                  Guardada: {formatearFechaHoraAr(plate.updatedAt)}
                </p>
              </div>

              <div className="pf-inline-actions" style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  className="pf-btn pf-btn-primary pf-btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => onOpenPlate(plate)}
                >
                  <FolderOpen size={15} />
                  <span>Abrir</span>
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn-sm"
                  aria-label={`Duplicar ${plate.title}`}
                  title="Duplicar"
                  onClick={() => onDuplicatePlate(plate)}
                >
                  <Copy size={15} />
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn-sm pf-btn-danger"
                  aria-label={`Eliminar ${plate.title}`}
                  title="Eliminar"
                  onClick={() => onDeletePlate(plate.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
