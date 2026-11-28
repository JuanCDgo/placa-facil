import React, { useState } from 'react';
import { Check, Download, KeyRound, Share2 } from 'lucide-react';
import { generarMensajePedidoActivacion } from '../domain/licencia';
import { construirUrlWhatsapp } from '../domain/placas';
import {
  nombreArchivoRespaldo,
  serializarRespaldo,
  type EstadoPlacaFacil,
} from '../domain/respaldo';

interface LicenciaVencidaViewProps {
  estado: EstadoPlacaFacil;
  onActivar: (
    nombreNegocio: string,
    codigo: string
  ) => { ok: true } | { ok: false; error: string };
}

export function LicenciaVencidaView({
  estado,
  onActivar,
}: LicenciaVencidaViewProps): React.JSX.Element {
  const [nombre, setNombre] = useState(estado.identidad.nombre);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const res = onActivar(nombre, codigo);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError('');
  }

  function handlePedirWhatsapp(): void {
    const msg = generarMensajePedidoActivacion(nombre);
    window.open(construirUrlWhatsapp(msg), '_blank', 'noopener,noreferrer');
  }

  function handleExportarRespaldo(): void {
    try {
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
    } catch {
      setError('No se pudo exportar el respaldo.');
    }
  }

  return (
    <section className="pf-stack" aria-label="Activación de licencia">
      <div className="pf-card">
        <h2 className="pf-card-title">
          <span className="pf-inline-icon">
            <KeyRound size={18} />
            Fin de prueba gratuita (15 días)
          </span>
        </h2>
        <p className="pf-muted">
          Tus placas guardadas y los datos de tu negocio siguen en este dispositivo. Para continuar
          usando PlacaFácil sin límites, ingresá tu código de activación.
        </p>

        <form className="pf-stack" onSubmit={handleSubmit}>
          <div className="pf-field">
            <label className="pf-label" htmlFor="lic-lock-nombre">
              Nombre de tu negocio
            </label>
            <input
              id="lic-lock-nombre"
              className="pf-input"
              type="text"
              required
              maxLength={80}
              value={nombre}
              onChange={(e) => {
                setError('');
                setNombre(e.target.value);
              }}
            />
          </div>

          <div className="pf-field">
            <label className="pf-label" htmlFor="lic-lock-codigo">
              Código de activación
            </label>
            <input
              id="lic-lock-codigo"
              className="pf-input pf-mono"
              type="text"
              required
              autoCorrect="off"
              autoCapitalize="characters"
              placeholder="Ej: PF2-XXXX-XXXX-XXXX"
              value={codigo}
              onChange={(e) => {
                setError('');
                setCodigo(e.target.value.toUpperCase());
              }}
            />
          </div>

          {error ? <p className="pf-alert-error">{error}</p> : null}

          <button type="submit" className="pf-btn pf-btn-primary pf-btn-full">
            <Check size={18} />
            <span>Activar PlacaFácil</span>
          </button>
        </form>

        <div className="pf-row-2" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="pf-btn pf-btn-wa"
            onClick={handlePedirWhatsapp}
          >
            <Share2 size={16} />
            <span>Pedir código</span>
          </button>
          <button
            type="button"
            className="pf-btn"
            onClick={handleExportarRespaldo}
          >
            <Download size={16} />
            <span>Respaldo JSON</span>
          </button>
        </div>
      </div>
    </section>
  );
}
