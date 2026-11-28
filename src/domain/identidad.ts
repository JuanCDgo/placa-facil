export type TemaApp = 'dia' | 'noche';

export interface IdentidadComercio {
  nombre: string;
  whatsapp: string;
  direccion: string;
  aliasOCbu: string;
  cvu: string;
  banco: string;
  titularCuenta: string;
  logoBase64: string;
  tema: TemaApp;
}

export const IDENTIDAD_VACIA: IdentidadComercio = {
  nombre: 'Carnicería Don Tito',
  whatsapp: '11 5482-9100',
  direccion: 'Av. San Martín 1420',
  aliasOCbu: 'DON.TITO.MP',
  cvu: '',
  banco: 'Mercado Pago',
  titularCuenta: '',
  logoBase64: '',
  tema: 'dia',
};

export function obtenerIniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return 'PF';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return `${palabras[0][0]}${palabras[1][0]}`.toUpperCase();
}

export function sanitizarIdentidad(raw: unknown): IdentidadComercio {
  if (typeof raw !== 'object' || raw === null) {
    return { ...IDENTIDAD_VACIA };
  }
  const obj = raw as Record<string, unknown>;
  const logoRaw =
    typeof obj.logoBase64 === 'string'
      ? obj.logoBase64.trim()
      : typeof obj.logoDataUrl === 'string'
        ? obj.logoDataUrl.trim()
        : '';
  const logoValido = logoRaw.startsWith('data:image/') ? logoRaw : '';

  const nombreRaw =
    typeof obj.nombre === 'string'
      ? obj.nombre.trim().slice(0, 80)
      : typeof obj.name === 'string'
        ? obj.name.trim().slice(0, 80)
        : '';

  const aliasRaw =
    typeof obj.aliasOCbu === 'string'
      ? obj.aliasOCbu.trim().slice(0, 80)
      : typeof obj.alias === 'string'
        ? obj.alias.trim().slice(0, 80)
        : '';

  const cvuRaw = typeof obj.cvu === 'string' ? obj.cvu.replace(/\D/g, '').slice(0, 24) : '';
  const bancoRaw =
    typeof obj.banco === 'string'
      ? obj.banco.trim().slice(0, 60)
      : typeof obj.bankName === 'string'
        ? obj.bankName.trim().slice(0, 60)
        : '';
  const titularRaw =
    typeof obj.titularCuenta === 'string'
      ? obj.titularCuenta.trim().slice(0, 80)
      : typeof obj.ownerName === 'string'
        ? obj.ownerName.trim().slice(0, 80)
        : '';
  const direccionRaw =
    typeof obj.direccion === 'string'
      ? obj.direccion.trim().slice(0, 120)
      : typeof obj.address === 'string'
        ? obj.address.trim().slice(0, 120)
        : '';
  const waRaw = typeof obj.whatsapp === 'string' ? obj.whatsapp.trim().slice(0, 40) : '';
  const tema: TemaApp = obj.tema === 'noche' ? 'noche' : 'dia';

  return {
    nombre: nombreRaw || IDENTIDAD_VACIA.nombre,
    whatsapp: waRaw,
    direccion: direccionRaw,
    aliasOCbu: aliasRaw,
    cvu: cvuRaw,
    banco: bancoRaw,
    titularCuenta: titularRaw,
    logoBase64: logoValido,
    tema,
  };
}

/**
 * Comprime un logo a data URL base64 liviano preservando transparencia (sin fondo blanco).
 */
export async function comprimirLogoABase64(file: File, maxLado = 220): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Elegí un archivo de imagen válido (PNG, JPG o WebP).');
  }

  const dataUrlOriginal = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('No se pudo leer la imagen.'));
    };
    reader.onerror = () => reject(new Error('Error leyendo el archivo de imagen.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
    image.src = dataUrlOriginal;
  });

  const escala = Math.min(1, maxLado / Math.max(img.width || 1, img.height || 1));
  const ancho = Math.max(1, Math.round(img.width * escala));
  const alto = Math.max(1, Math.round(img.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Tu navegador no soporta compresión de imágenes en canvas.');
  }

  ctx.clearRect(0, 0, ancho, alto);
  ctx.drawImage(img, 0, 0, ancho, alto);

  const webp = canvas.toDataURL('image/webp', 0.84);
  if (webp.startsWith('data:image/webp')) {
    return webp;
  }
  return canvas.toDataURL('image/png');
}

/**
 * Comprime una foto de producto para la plantilla Oferta del Día.
 */
export async function comprimirFotoProducto(file: File, maxLado = 720): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Elegí una foto válida (JPG, PNG o WebP).');
  }

  const dataUrlOriginal = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('No se pudo leer la foto.'));
    };
    reader.onerror = () => reject(new Error('Error leyendo la foto.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo procesar la foto seleccionada.'));
    image.src = dataUrlOriginal;
  });

  const escala = Math.min(1, maxLado / Math.max(img.width || 1, img.height || 1));
  const ancho = Math.max(1, Math.round(img.width * escala));
  const alto = Math.max(1, Math.round(img.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Tu navegador no soporta compresión de imágenes en canvas.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(img, 0, 0, ancho, alto);

  return canvas.toDataURL('image/jpeg', 0.8);
}
