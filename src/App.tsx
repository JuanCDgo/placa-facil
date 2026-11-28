import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Download,
  FileText,
  Maximize2,
  Moon,
  Printer,
  Share2,
  Sun,
  X,
} from 'lucide-react';
import { BottomNav, type TabId } from './components/BottomNav';
import { LicenciaVencidaView } from './components/LicenciaVencidaView';
import { TemplateForm } from './components/TemplateForm';
import { obtenerHoyArgentinaISO } from './domain/dinero';
import { activarLicenciaConCodigo, evaluarAccesoLicencia } from './domain/licencia';
import {
  FORMAT_DEFS,
  getFormatSpec,
  MAX_PLACAS_GUARDADAS,
  mezclarBorradorPlantilla,
  obtenerTituloPlaca,
  TEMPLATE_DEFS,
  type DraftsPorPlantilla,
  type FormatId,
  type PlacaGuardada,
  type TemplateId,
} from './domain/placas';
import {
  importarRespaldoJson,
  nombreArchivoRespaldo,
  serializarRespaldo,
  type EstadoPlacaFacil,
} from './domain/respaldo';
import { guardarEstadoLocal, leerEstadoLocal } from './domain/storage';
import {
  exportCanvasAsPdf,
  exportCanvasAsPng,
  renderPosterToCanvas,
  sharePosterViaWhatsApp,
} from './utils/posterCanvas';
import { MisPlacasView } from './views/MisPlacasView';
import { NegocioView } from './views/NegocioView';

interface ToastState {
  message: string;
  action?: { label: string; onClick: () => void };
}

function crearIdPlaca(): string {
  return `pf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function App(): React.JSX.Element {
  const [estado, setEstado] = useState<EstadoPlacaFacil>(() => leerEstadoLocal());
  const [activeTab, setActiveTab] = useState<TabId>('editor');
  const [isExporting, setIsExporting] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const lastSaveRef = useRef<{ fp: string; ts: number }>({ fp: '', ts: 0 });

  const { identidad, licencia, editor, placasGuardadas } = estado;
  const { activeTemplate, activeFormat, drafts } = editor;
  const isA4Mode = activeTemplate === 'gondola' || activeFormat === 'a4';
  const acceso = evaluarAccesoLicencia(licencia, identidad.nombre);

  const notify = (message: string, action?: ToastState['action']) => {
    setToast({ message, action });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(
      () => setToast(null),
      action ? 5200 : 3200
    );
  };

  useEffect(() => {
    document.documentElement.dataset.theme = identidad.tema;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', identidad.tema === 'noche' ? '#1D1F19' : '#5F6A22');
    }
  }, [identidad.tema]);

  useEffect(() => {
    if (!guardarEstadoLocal(estado)) {
      notify('Memoria llena en este dispositivo. Exportá un respaldo JSON o borrá placas viejas.');
    }
  }, [estado]);

  useEffect(() => {
    if (activeTab !== 'editor' || acceso.estado === 'vencida') return;
    let cancelled = false;
    renderPosterToCanvas({
      canvas: canvasRef.current,
      templateId: activeTemplate,
      formatId: activeFormat,
      drafts,
      identidad,
      isCancelled: () => cancelled,
    }).catch(() => {
      if (!cancelled) notify('No se pudo actualizar la vista previa.');
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, activeTemplate, activeFormat, drafts, identidad, acceso.estado]);

  useEffect(() => {
    if (!previewExpanded) return;
    let cancelled = false;
    renderPosterToCanvas({
      canvas: modalCanvasRef.current,
      templateId: activeTemplate,
      formatId: activeFormat,
      drafts,
      identidad,
      isCancelled: () => cancelled,
    }).catch(() => {
      // Ignorar
    });
    return () => {
      cancelled = true;
    };
  }, [previewExpanded, activeTemplate, activeFormat, drafts, identidad]);

  const setTema = (tema: 'dia' | 'noche') => {
    setEstado((prev) => ({ ...prev, identidad: { ...prev.identidad, tema } }));
  };

  const handleSelectTemplate = (tpl: TemplateId) => {
    setEstado((prev) => ({
      ...prev,
      editor: { ...prev.editor, activeTemplate: tpl },
    }));
  };

  const handleSelectFormat = (fmt: FormatId) => {
    setEstado((prev) => ({
      ...prev,
      editor: { ...prev.editor, activeFormat: fmt },
    }));
  };

  const handleChangeCurrentDraft = (nextDraft: DraftsPorPlantilla[TemplateId]) => {
    setEstado((prev) => ({
      ...prev,
      editor: {
        ...prev.editor,
        drafts: {
          ...prev.editor.drafts,
          [prev.editor.activeTemplate]: nextDraft,
        },
      },
    }));
  };

  const handleSavePlate = () => {
    const currentDraft = drafts[activeTemplate];
    const resolvedFormat: FormatId = activeTemplate === 'gondola' ? 'a4' : activeFormat;
    const serialized = JSON.stringify(currentDraft);
    const fp = `${activeTemplate}|${resolvedFormat}|${serialized}`;
    const now = Date.now();
    if (lastSaveRef.current.fp === fp && now - lastSaveRef.current.ts < 1200) {
      return;
    }
    lastSaveRef.current = { fp, ts: now };

    const nueva: PlacaGuardada = {
      id: crearIdPlaca(),
      templateId: activeTemplate,
      formatId: resolvedFormat,
      title: obtenerTituloPlaca(activeTemplate, currentDraft),
      data: JSON.parse(serialized) as DraftsPorPlantilla[TemplateId],
      updatedAt: new Date(now).toISOString(),
    };

    setEstado((prev) => ({
      ...prev,
      placasGuardadas: [nueva, ...prev.placasGuardadas].slice(0, MAX_PLACAS_GUARDADAS),
    }));
    notify('Placa guardada en Mis Placas.');
  };

  const handleOpenSavedPlate = (plate: PlacaGuardada) => {
    const safeData = mezclarBorradorPlantilla(plate.templateId, plate.data);
    setEstado((prev) => ({
      ...prev,
      editor: {
        activeTemplate: plate.templateId,
        activeFormat: plate.templateId === 'gondola' ? prev.editor.activeFormat : plate.formatId,
        drafts: {
          ...prev.editor.drafts,
          [plate.templateId]: safeData,
        },
      },
    }));
    setActiveTab('editor');
    notify(`Abierta: ${plate.title}`);
  };

  const handleDuplicatePlate = (plate: PlacaGuardada) => {
    const copy: PlacaGuardada = {
      ...(JSON.parse(JSON.stringify(plate)) as PlacaGuardada),
      id: crearIdPlaca(),
      title: `${plate.title} (copia)`,
      updatedAt: new Date().toISOString(),
    };
    setEstado((prev) => ({
      ...prev,
      placasGuardadas: [copy, ...prev.placasGuardadas].slice(0, MAX_PLACAS_GUARDADAS),
    }));
    notify('Placa duplicada.');
  };

  const handleDeletePlate = (id: string) => {
    const idx = placasGuardadas.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const deleted = placasGuardadas[idx];
    setEstado((prev) => ({
      ...prev,
      placasGuardadas: prev.placasGuardadas.filter((p) => p.id !== id),
    }));
    notify(`Eliminada: ${deleted.title}`, {
      label: 'Deshacer',
      onClick: () => {
        setEstado((prev) => {
          if (prev.placasGuardadas.some((p) => p.id === deleted.id)) return prev;
          const restored = [...prev.placasGuardadas];
          restored.splice(Math.min(idx, restored.length), 0, deleted);
          return { ...prev, placasGuardadas: restored.slice(0, MAX_PLACAS_GUARDADAS) };
        });
        setToast(null);
      },
    });
  };

  const handleExport = async (mode: 'png' | 'pdf' | 'whatsapp') => {
    const canvas = canvasRef.current;
    if (!canvas || isExporting) return;
    setIsExporting(true);
    try {
      await renderPosterToCanvas({
        canvas,
        templateId: activeTemplate,
        formatId: activeFormat,
        drafts,
        identidad,
      });

      const slug = `${activeTemplate}-${obtenerHoyArgentinaISO()}`;
      if (mode === 'pdf') {
        await exportCanvasAsPdf(canvas, `placafacil-${slug}.pdf`);
        notify('PDF A4 descargado listo para imprimir.');
        return;
      }
      if (mode === 'png') {
        exportCanvasAsPng(canvas, `placafacil-${slug}.png`);
        notify('PNG exportado sin marca de agua.');
        return;
      }
      const res = await sharePosterViaWhatsApp({
        canvas,
        filename: `placafacil-${slug}.png`,
        identidad,
        templateId: activeTemplate,
        draft: drafts[activeTemplate],
      });
      if (res === 'native-share') {
        notify('Abriendo selector para compartir la placa...');
      } else if (res === 'download-popup-blocked') {
        notify('Imagen descargada. Habilitá ventanas emergentes para abrir WhatsApp.');
      } else {
        notify('Imagen descargada y mensaje abierto en WhatsApp.');
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        notify('No se pudo exportar la placa. Probá de nuevo.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBackup = () => {
    const json = serializarRespaldo(estado);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivoRespaldo();
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify('Respaldo JSON descargado. Guardalo en Google Drive.');
  };

  const handleImportBackup = (rawText: string) => {
    const res = importarRespaldoJson(rawText);
    if (!res.ok) {
      notify(res.error);
      return;
    }
    setEstado(res.estado);
    notify('Respaldo restaurado correctamente.');
  };

  const handleActivarLicencia = (
    nombreNegocio: string,
    codigo: string
  ): { ok: true } | { ok: false; error: string } => {
    const res = activarLicenciaConCodigo(estado.licencia, nombreNegocio, codigo);
    if (!res.ok) return res;
    setEstado((prev) => ({
      ...prev,
      identidad: { ...prev.identidad, nombre: nombreNegocio.trim() || prev.identidad.nombre },
      licencia: res.licencia,
    }));
    return { ok: true };
  };

  const currentFormatSpec = getFormatSpec(activeFormat);

  const renderPrimaryActions = () => {
    if (isA4Mode) {
      return (
        <>
          <button type="button" className="pf-btn" onClick={handleSavePlate}>
            <BookmarkPlus size={17} />
            <span>Guardar</span>
          </button>
          <button
            type="button"
            className="pf-btn pf-btn-primary"
            disabled={isExporting}
            onClick={() => handleExport('pdf')}
          >
            <FileText size={17} />
            <span>{isExporting ? 'Generando...' : 'PDF A4'}</span>
          </button>
          <button
            type="button"
            className="pf-btn pf-btn-wa"
            disabled={isExporting}
            onClick={() => window.print()}
            aria-label="Imprimir hoja A4"
          >
            <Printer size={17} />
            <span>Imprimir</span>
          </button>
        </>
      );
    }

    return (
      <>
        <button type="button" className="pf-btn" onClick={handleSavePlate}>
          <BookmarkPlus size={17} />
          <span>Guardar</span>
        </button>
        <button
          type="button"
          className="pf-btn pf-btn-primary"
          disabled={isExporting}
          onClick={() => handleExport('png')}
        >
          <Download size={17} />
          <span>{isExporting ? 'Exportando...' : 'Exportar PNG'}</span>
        </button>
        <button
          type="button"
          className="pf-btn pf-btn-wa"
          disabled={isExporting}
          onClick={() => handleExport('whatsapp')}
        >
          <Share2 size={17} />
          <span>WhatsApp</span>
        </button>
      </>
    );
  };

  return (
    <div className="pf-shell">
      <header className="pf-header">
        <div className="pf-header-inner">
          <div className="pf-brand-group">
            <span className="pf-wordmark">PlacaFácil</span>
            <span className="pf-store-chip" title={identidad.nombre}>
              {identidad.nombre || 'Mi Comercio'}
            </span>
          </div>

          <div className="pf-theme-switch" role="group" aria-label="Modo visual">
            <button
              type="button"
              className={`pf-theme-opt ${identidad.tema === 'dia' ? 'is-active' : ''}`}
              aria-pressed={identidad.tema === 'dia'}
              onClick={() => setTema('dia')}
            >
              <Sun size={14} />
              <span>Día</span>
            </button>
            <button
              type="button"
              className={`pf-theme-opt ${identidad.tema === 'noche' ? 'is-active' : ''}`}
              aria-pressed={identidad.tema === 'noche'}
              onClick={() => setTema('noche')}
            >
              <Moon size={14} />
              <span>Noche</span>
            </button>
          </div>
        </div>
      </header>

      {acceso.estado === 'prueba' && acceso.mostrarAviso ? (
        <div className="pf-trial-banner" role="status">
          <span>
            Te quedan <strong>{acceso.diasRestantes} días</strong> de prueba gratuita.
          </span>
          <button
            type="button"
            className="pf-btn pf-btn-xs"
            onClick={() => setActiveTab('negocio')}
          >
            Activar
          </button>
        </div>
      ) : null}

      {toast ? (
        <div className="pf-toast" role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              className="pf-toast-action"
              onClick={toast.action.onClick}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}

      <main className="pf-main">
        {acceso.estado === 'vencida' ? (
          <LicenciaVencidaView estado={estado} onActivar={handleActivarLicencia} />
        ) : (
          <>
            {activeTab === 'editor' ? (
              <div className="pf-stack">
                <div className="pf-pill-strip" role="tablist" aria-label="Plantillas">
                  {TEMPLATE_DEFS.map((tpl) => {
                    const active = activeTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`pf-pill ${active ? 'is-active' : ''}`}
                        onClick={() => handleSelectTemplate(tpl.id)}
                      >
                        {tpl.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {activeTemplate !== 'gondola' ? (
                  <div className="pf-segmented" role="group" aria-label="Formato de salida">
                    {FORMAT_DEFS.map((fmt) => {
                      const active = activeFormat === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          aria-pressed={active}
                          className={`pf-seg-btn ${active ? 'is-active' : ''}`}
                          onClick={() => handleSelectFormat(fmt.id)}
                        >
                          <span>{fmt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="pf-workspace">
                  <section className="pf-preview-card">
                    <div className="pf-preview-meta">
                      <span className="pf-mono">
                        {activeTemplate === 'gondola'
                          ? `A4 · ${drafts.gondola.layout === '2x' ? '2 por hoja' : '4 por hoja'}`
                          : `${currentFormatSpec.ratio} · ${currentFormatSpec.width}×${currentFormatSpec.height}`}
                      </span>
                      <button
                        type="button"
                        className="pf-btn pf-btn-xs"
                        onClick={() => setPreviewExpanded(true)}
                      >
                        <Maximize2 size={13} />
                        <span>Ampliar</span>
                      </button>
                    </div>

                    <div
                      className="pf-canvas-stage"
                      onClick={() => setPreviewExpanded(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setPreviewExpanded(true);
                      }}
                      aria-label="Ampliar vista previa de la placa"
                    >
                      <canvas
                        ref={canvasRef}
                        className={`pf-preview-canvas ${isA4Mode ? 'is-a4' : ''}`}
                      />
                    </div>

                    <div className="pf-desktop-actions">{renderPrimaryActions()}</div>
                  </section>

                  <section className="pf-card">
                    <h2 className="pf-card-title">
                      <span>
                        {TEMPLATE_DEFS.find((t) => t.id === activeTemplate)?.label}
                      </span>
                      <span className="pf-badge">Sin marca de agua</span>
                    </h2>
                    <TemplateForm
                      templateId={activeTemplate}
                      draft={drafts[activeTemplate]}
                      identidad={identidad}
                      onChangeDraft={handleChangeCurrentDraft}
                      onNotify={notify}
                    />
                  </section>
                </div>
              </div>
            ) : null}

            {activeTab === 'placas' ? (
              <MisPlacasView
                plates={placasGuardadas}
                onOpenPlate={handleOpenSavedPlate}
                onDuplicatePlate={handleDuplicatePlate}
                onDeletePlate={handleDeletePlate}
              />
            ) : null}

            {activeTab === 'negocio' ? (
              <NegocioView
                identidad={identidad}
                acceso={acceso}
                savedCount={placasGuardadas.length}
                onChangeIdentidad={(next) => setEstado((prev) => ({ ...prev, identidad: next }))}
                onActivarLicencia={handleActivarLicencia}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onNotify={notify}
              />
            ) : null}
          </>
        )}
      </main>

      {acceso.estado !== 'vencida' && activeTab === 'editor' ? (
        <div className="pf-action-bar">
          <div className="pf-action-bar-inner">{renderPrimaryActions()}</div>
        </div>
      ) : null}

      {acceso.estado !== 'vencida' ? (
        <BottomNav
          activeTab={activeTab}
          savedCount={placasGuardadas.length}
          onSelect={setActiveTab}
        />
      ) : null}

      {previewExpanded ? (
        <div
          className="pf-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa ampliada"
          onClick={() => setPreviewExpanded(false)}
        >
          <div className="pf-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pf-field-head">
              <span className="pf-label">Vista previa en tamaño real</span>
              <button
                type="button"
                className="pf-btn pf-btn-xs"
                onClick={() => setPreviewExpanded(false)}
              >
                <X size={15} />
                <span>Cerrar</span>
              </button>
            </div>
            <div className="pf-modal-canvas-wrap">
              <canvas ref={modalCanvasRef} className="pf-modal-canvas" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
