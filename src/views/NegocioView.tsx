import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatearFechaCorta } from '../domain/dinero';
import {
  comprimirLogoABase64,
  obtenerIniciales,
  type IdentidadComercio,
} from '../domain/identidad';
import {
  generarMensajePedidoActivacion,
  type EstadoAccesoLicencia,
} from '../domain/licencia';
import { construirPayloadQrOffline, construirUrlWhatsapp } from '../domain/placas';

interface NegocioViewProps {
  identidad: IdentidadComercio;
  acceso: EstadoAccesoLicencia;
  savedCount: number;
  onChangeIdentidad: (next: IdentidadComercio) => void;
  onActivarLicencia: (
    nombreNegocio: string,
    codigo: string
  ) => { ok: true } | { ok: false; error: string };
  onExportBackup: () => void;
  onImportBackup: (rawText: string) => void;
  onNotify: (msg: string) => void;
}

export function NegocioView({
  identidad,
  acceso,
  savedCount,
  onChangeIdentidad,
  onActivarLicencia,
  onExportBackup,
  onImportBackup,
  onNotify,
}: NegocioViewProps): React.JSX.Element {
  const [codigoInput, setCodigoInput] = useState('');
  const [licError, setLicError] = useState('');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const update = <K extends keyof IdentidadComercio>(field: K, value: IdentidadComercio[K]) => {
    onChangeIdentidad({ ...identidad, [field]: value });
  };

  useEffect(() => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !identidad.aliasOCbu.trim()) return;
    const payload = construirPayloadQrOffline(identidad);
    QRCode.toCanvas(canvas, payload, {
      width: 168,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1F2118', light: '#FFFFFF' },
    }).catch(() => {
      // Ignorar si falla renderizado menor
    });
  }, [identidad]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await comprimirLogoABase64(file);
      update('logoBase64', compressed);
      onNotify('Logo transparente guardado.');
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'No se pudo procesar el logo.');
    }
  };

  const handleCopyAlias = async () => {
    const alias = identidad.aliasOCbu.trim();
    if (!alias) {
      onNotify('Primero cargá tu Alias o CVU.');
      return;
    }
    try {
      await navigator.clipboard.writeText(alias);
      onNotify(`Alias copiado: ${alias}`);
    } catch {
      onNotify('No se pudo copiar automáticamente. Copialo desde el campo.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      onImportBackup(text);
    } catch {
      onNotify('No se pudo leer el archivo JSON.');
    }
  };

  const handleActivarSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = onActivarLicencia(identidad.nombre, codigoInput);
    if (!res.ok) {
      setLicError(res.error);
      return;
    }
    setLicError('');
    setCodigoInput('');
    onNotify('Licencia activada correctamente.');
  };

  const handlePedirCodigo = () => {
    const msg = generarMensajePedidoActivacion(identidad.nombre);
    window.open(construirUrlWhatsapp(msg), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="pf-business-grid">
      <section className="pf-card">
        <h2 className="pf-card-title">
          <span>Identidad del comercio</span>
          <span className="pf-badge">Offline</span>
        </h2>

        <form className="pf-stack" onSubmit={(e) => e.preventDefault()}>
          <div className="pf-subcard">
            <span className="pf-label">Logo (sin fondo blanco)</span>
            <div className="pf-logo-row">
              <div className="pf-logo-preview">
                {identidad.logoBase64 ? (
                  <img src={identidad.logoBase64} alt="Logo del comercio" />
                ) : (
                  <span className="pf-logo-initials">{obtenerIniciales(identidad.nombre)}</span>
                )}
              </div>
              <div className="pf-inline-actions" style={{ flex: 1 }}>
                <label className="pf-btn pf-btn-sm" style={{ flex: 1 }}>
                  <Upload size={15} />
                  <span>{identidad.logoBase64 ? 'Cambiar' : 'Subir logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleLogoUpload}
                  />
                </label>
                {identidad.logoBase64 ? (
                  <button
                    type="button"
                    className="pf-btn pf-btn-sm pf-btn-danger"
                    onClick={() => update('logoBase64', '')}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="pf-field">
            <label className="pf-label" htmlFor="biz-name">
              Nombre del comercio
            </label>
            <input
              id="biz-name"
              className="pf-input"
              type="text"
              maxLength={80}
              value={identidad.nombre}
              onChange={(e) => update('nombre', e.target.value)}
            />
          </div>

          <div className="pf-row-2">
            <div className="pf-field">
              <label className="pf-label" htmlFor="biz-wa">
                WhatsApp de pedidos
              </label>
              <input
                id="biz-wa"
                className="pf-input pf-mono"
                type="tel"
                inputMode="tel"
                placeholder="11 5482-9100"
                value={identidad.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
              />
            </div>
            <div className="pf-field">
              <label className="pf-label" htmlFor="biz-dir">
                Dirección
              </label>
              <input
                id="biz-dir"
                className="pf-input"
                type="text"
                maxLength={120}
                value={identidad.direccion}
                onChange={(e) => update('direccion', e.target.value)}
              />
            </div>
          </div>

          <div className="pf-subcard">
            <div className="pf-field-head">
              <span className="pf-label">Cobro por transferencia (QR 100% offline)</span>
              <button
                type="button"
                className="pf-btn pf-btn-xs"
                onClick={handleCopyAlias}
              >
                <Copy size={13} />
                <span>Copiar Alias</span>
              </button>
            </div>

            <div className="pf-row-2">
              <div className="pf-field">
                <label className="pf-label" htmlFor="biz-alias">
                  Alias
                </label>
                <input
                  id="biz-alias"
                  className="pf-input pf-mono"
                  type="text"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="MI.COMERCIO.MP"
                  value={identidad.aliasOCbu}
                  onChange={(e) => update('aliasOCbu', e.target.value)}
                />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="biz-banco">
                  Billetera / Banco
                </label>
                <input
                  id="biz-banco"
                  className="pf-input"
                  type="text"
                  placeholder="Mercado Pago / Cuenta DNI"
                  value={identidad.banco}
                  onChange={(e) => update('banco', e.target.value)}
                />
              </div>
            </div>

            <div className="pf-row-2">
              <div className="pf-field">
                <label className="pf-label" htmlFor="biz-cvu">
                  CVU / CBU (opc.)
                </label>
                <input
                  id="biz-cvu"
                  className="pf-input pf-mono"
                  type="text"
                  inputMode="numeric"
                  maxLength={24}
                  value={identidad.cvu}
                  onChange={(e) => update('cvu', e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="biz-titular">
                  Titular (opc.)
                </label>
                <input
                  id="biz-titular"
                  className="pf-input"
                  type="text"
                  maxLength={80}
                  value={identidad.titularCuenta}
                  onChange={(e) => update('titularCuenta', e.target.value)}
                />
              </div>
            </div>

            {identidad.aliasOCbu.trim() ? (
              <div className="pf-qr-mini">
                <canvas ref={qrCanvasRef} aria-label="Vista previa QR offline" />
                <div>
                  <div className="pf-mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {identidad.aliasOCbu.toUpperCase()}
                  </div>
                  <p className="pf-muted-xs" style={{ margin: '4px 0 0' }}>
                    Se usa en tus carteles QR Alias y para cobro rápido sin internet.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </form>
      </section>

      <aside className="pf-stack">
        <section className="pf-card">
          <h2 className="pf-card-title">
            <span className="pf-inline-icon">
              <KeyRound size={17} />
              Licencia
            </span>
            <span className="pf-badge">
              {acceso.estado === 'activa'
                ? 'Activa'
                : acceso.estado === 'prueba'
                  ? `Prueba: ${acceso.diasRestantes} d`
                  : 'Vencida'}
            </span>
          </h2>

          {acceso.estado === 'activa' ? (
            <div className="pf-help-box">
              Licencia completa activa para <strong>{acceso.nombreLicencia}</strong> desde el{' '}
              {formatearFechaCorta(acceso.activadaEnISO)}.
            </div>
          ) : (
            <form className="pf-stack" onSubmit={handleActivarSubmit}>
              <p className="pf-muted">
                Tenés 15 días de prueba completa. Si ya tenés tu código offline, ingresalo acá:
              </p>
              <div className="pf-field">
                <label className="pf-label" htmlFor="lic-code">
                  Código de activación
                </label>
                <input
                  id="lic-code"
                  className="pf-input pf-mono"
                  type="text"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  placeholder="PF2-XXXX-XXXX-XXXX"
                  value={codigoInput}
                  onChange={(e) => {
                    setLicError('');
                    setCodigoInput(e.target.value.toUpperCase());
                  }}
                />
              </div>
              {licError ? <p className="pf-alert-error">{licError}</p> : null}
              <div className="pf-row-2">
                <button type="submit" className="pf-btn pf-btn-primary pf-btn-sm">
                  <Check size={15} />
                  <span>Activar</span>
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn-wa pf-btn-sm"
                  onClick={handlePedirCodigo}
                >
                  <Share2 size={15} />
                  <span>Pedir código</span>
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="pf-card">
          <h2 className="pf-card-title">
            <span>Respaldo JSON</span>
            <span className="pf-mono pf-muted-xs">{savedCount} placas</span>
          </h2>
          <p className="pf-muted">
            Todos tus datos viven en este celular a costo $0. Descargá una copia JSON y guardala en{' '}
            <strong>Google Drive</strong> para no perder tu logo, Alias ni placas guardadas.
          </p>
          <div className="pf-stack-sm">
            <button
              type="button"
              className="pf-btn pf-btn-primary pf-btn-full"
              onClick={onExportBackup}
            >
              <Download size={17} />
              <span>Exportar Respaldo JSON</span>
            </button>
            <label className="pf-btn pf-btn-full">
              <Upload size={17} />
              <span>Restaurar Respaldo JSON</span>
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={handleImportFile}
              />
            </label>
          </div>
        </section>
      </aside>
    </div>
  );
}
