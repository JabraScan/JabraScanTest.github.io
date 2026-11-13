/**
 * CONSTANTES Y RUTAS CONFIGURABLES (Sin Hardcoding)
 */
export const ENGINE_CONSTANTS = {
  // URLs de fallback y servicios remotos
  CONFIG_WORKER_URL: 'https://jabrascan.net/configobra',
  BASE_IMG_URL: 'https://img.jabrascan.net/',
  DEFAULT_FOOTER_FALLBACK_IMG: 'https://img.jabrascan.net/main/JabraRexScan02-150w.webp',
  DEFAULT_FOOTER_LINKURL: "",
  DEFAULT_FOOTER_LINK_TEXT: 'https://jabrascan.net',

  // IMAGENES DEFECTO
  DEFAULT_HEADER_IMG: [`header.webp`],
  DEFAULT_HEADER_CHAPTER: [0],
  DEFAULT_FOOTER_IMG: [`footer.webp`],
  DEFAULT_FOOTER_CHAPTER: [0],
  
  // Ratios visuales y tipográficos
  DEFAULT_FONT_FAMILY: 'Helvetica, Arial, sans-serif',
  DEFAULT_LINE_HEIGHT_RATIO: 1.5, // ⬅️ ratio del interlineado global Aumentado de 1.3 a 1.5 (o 1.6)
  SCRIPT_SIZE_RATIO: 0.65,        // Factor de escala para subíndices/superíndices
  SCRIPT_OFFSET_RATIO: 0.2,       // Desplazamiento vertical de subíndices/superíndices
  HEADER_FOOTER_ASSET_HEIGHT: 40, // Altura reservada en px para cabeceras/pies
  ASPECT_RATIO_THRESHOLD: 0.40,   // Umbral de relación de aspecto para banners verticales
  MAX_CACHED_IMAGES: 24,          // Nº máximo de imágenes en caché (evita disparar la memoria)

  // Colores por defecto
  LINK_COLOR: '#000000',         //'#0000FF',
  LINK_TEXT_COLOR: '#555555'
};

/**
 * Configuración predeterminada del motor de renderizado.
 * Permite ajustar la apariencia visual sin modificar la lógica interna.
 */
const DEFAULT_SETTINGS = {
  marginTop: 40,                  // Espacio en px arriba y abajo del contenido total
  marginLeft: 40,                 // Margen izquierdo y derecho del texto en px
  // Espacio EXTRA entre párrafos expresado como fracción del interlineado.
  // 0.6 → el hueco total entre párrafos = interlineado × 1.6 (siempre mayor que el interlineado)
  paragraphSpacingRatio: 0.6,
  // Doble salto (\n\n, \n \n, ...): pinta una línea en BLANCO real.
  // 1.0 → el hueco = interlineado completo (una línea vacía visible).
  blankLineRatio: 1.0,
  // Imágenes dentro del texto (elementos {tipo: 'imagen'}):
  imageMargin: 18,                // Espacio vertical (px) alrededor de la imagen
  imageMaxHeight: 1400,           // Alto máximo (px) de seguridad para una imagen inline
  bannerMaxHeight: 220,           // Alto máximo (px) de una imagen con formato 'banner'
  pageHeightLimit: 2500,          // Altura máxima de cada bloque de canvas para evitar colapsos de memoria
  defaultFontSize: 12,            // Tamaño de fuente base en puntos (pt)
  bgColor: "#FFFFFF",           // Color de fondo del canvas
  defaultTextColor: "#000000",  // Color de texto cuando no se especifica uno en el fragmento
  lineHeightDefault: 24,          // Altura mínima de línea en px para evitar valores NaN o 0
  dpi: 96
};

/**
 * FORMATO DEL ARRAY DE CAPÍTULOS (entrada del motor)
 *
 * Cada elemento es un fragmento de texto:
 *   { texto: '...', fuente: 'Arial', tamano: 14.0, color: '000000', align: 'left' }
 *
 * ...o una imagen insertada entre fragmentos de texto:
 *   { tipo: 'imagen', src: 'https://.../imagen.webp', alt: 'Descripción',
 *     maxWidth: 0.95, align: 'center', formato: 'inline' }
 *
 * - `src`: URL absoluta, ruta relativa al documento ('./img.webp') o nombre suelto
 *   (se resuelve contra la base de imágenes de la obra).
 * - `maxWidth`: fracción del ancho de página que puede ocupar (0 < maxWidth <= 1).
 * - `align`: 'left' | 'center' | 'right' (por defecto 'center').
 * - `formato`: cómo se pinta la imagen:
 *     · 'inline'  (por defecto): imagen dentro del texto, con margen vertical y
 *       alto máximo `imageMaxHeight` (1400 px).
 *     · 'pagina':  imagen a página completa: ocupa el ancho de la página y puede
 *       ser tan alta como una página de texto (`pageHeightLimit`, 2500 px).
 *     · 'banner':  banda ancha como el header/footer: ancho de página y alto
 *       máximo `bannerMaxHeight` (220 px).
 *
 * Cada imagen se pinta en un canvas propio (igual que el header/footer) y corta
 * el flujo de texto: el texto anterior y el posterior siguen su curso.
 */
export class TxtReaderEngine {
  constructor(options) {
    this.initialCanvas = options.canvas;
    this.container = options.container || (options.canvas ? options.canvas.parentElement : null);
    this.dpi = options.dpi || DEFAULT_SETTINGS.dpi;
    this.FONT_FAMILY = options.fontFamily || ENGINE_CONSTANTS.DEFAULT_FONT_FAMILY;
    this.LINE_HEIGHT_RATIO = options.lineHeightRatio || ENGINE_CONSTANTS.DEFAULT_LINE_HEIGHT_RATIO;

    this.clave = options.clave || "";
    // Asegurar que el capítulo está definido (puedes pasarlo en options o leerlo de la instancia)
    this.capitulo = options?.capitulo || this.capitulo || 1;

    // Fusión de ajustes por defecto con opciones personalizadas del usuario
    this.settings = { ...DEFAULT_SETTINGS, ...options.settings };

    this.allLines = [];
    this.pages = [];
    this.flow = [];                // Secuencia de bloques a renderizar (páginas de texto + imágenes)
    this.pageCanvasIndex = [];     // Página de texto → índice de su canvas en canvasElements
    this.canvasElements = []; // Registro de los canvas múltiples creados en cascada
    this.isInfiniteScroll = options.isInfiniteScroll || false;
    this.resources = { headerImg: null, footerImg: null };
    this.config = {};
    this._imageCache = new Map();  // URL → Promise<HTMLImageElement|null> (caché LRU simple)

    // Setup de redimensionamiento responsivo
    this._setupResizeListener();
  }

  get DEFAULT_CONFIG() {
    return {
      headerbaseUrl: `${ENGINE_CONSTANTS.BASE_IMG_URL}${this.clave}/`,
      headerBannerUrl: ENGINE_CONSTANTS.DEFAULT_HEADER_IMG,
      headerChapters: ENGINE_CONSTANTS.DEFAULT_HEADER_CHAPTER,
      headerBannerUrlFallback: null,

      footerbaseUrl: `${ENGINE_CONSTANTS.BASE_IMG_URL}${this.clave}/`,
      footerBannerUrl: ENGINE_CONSTANTS.DEFAULT_FOOTER_IMG,
      footerChapters: ENGINE_CONSTANTS.DEFAULT_FOOTER_CHAPTER,
      footerBannerUrlFallback: ENGINE_CONSTANTS.DEFAULT_FOOTER_FALLBACK_IMG,
      
      footerLinkUrl: ENGINE_CONSTANTS.DEFAULT_FOOTER_LINKURL, 
      footerLinkText: ENGINE_CONSTANTS.DEFAULT_FOOTER_LINK_TEXT
    };
  }

  _setupResizeListener() {

    let resizeTimer;
    let lastWidth = this.container.clientWidth;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newWidth = this.container.clientWidth;
        
        if (Math.abs(newWidth - lastWidth) < 50) {
          return;
        }      
        lastWidth = newWidth;

        if (this.lastTextContent) {
          this._processText(this.lastTextContent);
          this.render().catch(() => {});
        }
      }, 300);
    });

}
  ptToPx(pt) { return (pt * this.dpi) / 72; }

  async load(txtContent, configUrl) {
    this.lastTextContent = txtContent;
    let fetchedConfig = {};
    
    if (configUrl && typeof configUrl === 'string') {
      try {
        const res = await fetch(ENGINE_CONSTANTS.CONFIG_WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: configUrl })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            fetchedConfig = data; // ✅ Guardado correcto aquí
          }
        }
      } catch (e) {
        // Silenciar errores de red
      }
    }

    // Filtrar valores vacíos o nulos de la configuración remota
    const validFetchedConfig = Object.fromEntries(
      Object.entries(fetchedConfig).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );

    // Combinación limpia: por defecto + configuración remota válida
    this.config = {
      ...this.DEFAULT_CONFIG,
      ...validFetchedConfig
    };

    await this._loadResources();
    this._processText(txtContent);
    await this.render();
  }

  _parsePythonArray(text) {
    try {
      // Conversión segura de booleanos de Python a JS (True -> true, False -> false)
      const formatted = text.replace(/\\bTrue\\b/g, 'true').replace(/\\bFalse\\b/g, 'false');
      return new Function(`return ${formatted}`)();
    } catch (e) {
      console.error("Error parseando array:", e);
      return null;
    }
  }

  // --- MÉTODO _processText CORREGIDO PARA RESPETAR LA ALINEACIÓN POR PÁRRAFO ---
  _processText(text) {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const maxContentWidth = availableWidth - (this.settings.marginLeft * 2);

    const data = this._parsePythonArray(text);
    if (!data || !Array.isArray(data)) {
      this.allLines = [];
      this.pages = [];
      this.flow = [];
      return;
    }

    const allLines = [];

    // Canvas auxiliar exclusivo para mediciones de texto
    const dummyCanvas = document.createElement('canvas');
    const dummyCtx = dummyCanvas.getContext('2d');

    let currentLineFragments = [];
    let currentLineWidth = 0;
    let maxHeightInLine = 0;
    let currentAlign = 'left';

    // ⚠️ El array llega separado por estilos: el mismo salto de párrafo puede caer
    // al final de un fragmento, al inicio del siguiente o partirse en medio ("\n" + "\n").
    // Por eso el salto NO se materializa en el momento: se marca como pendiente y el
    // hueco se inserta UNA sola vez, justo antes del primer texto del párrafo siguiente.
    // Reglas: un \n simple = hueco de párrafo (mayor que el interlineado); un \n\n
    // seguido = línea en blanco real; un \n centrado = solo cambio de línea (títulos
    // a dos líneas). El resultado es idéntico aunque el texto venga partido en N
    // fragmentos por estilo, porque todo depende de la alineación y del orden de
    // saltos/contenido, no de cómo se haya cortado el array.
    let pendingParagraphBreak = false;
    let pendingSpacerHeight = 0;
    // Un salto simple DENTRO de un bloque centrado (título a dos líneas) es solo
    // un cambio de línea: NO abre párrafo. El hueco solo se materializa si el
    // contenido siguiente no continúa el bloque centrado (separación título → cuerpo).
    // La decisión es por ALINEACIÓN, no por identidad de fragmento, para que el
    // resultado no cambie si el generador parte el array por estilos.
    let pendingCenteredOnly = false;

    // Función auxiliar para volcar la línea actual al array global de líneas
    const flushLine = (height, isSpacer = false, align = 'left') => {
      allLines.push({
        fragments: [...currentLineFragments],
        height: height || maxHeightInLine || this.settings.lineHeightDefault,
        isSpacer: isSpacer,
        align: align
      });
      currentLineFragments = [];
      currentLineWidth = 0;
      maxHeightInLine = 0;
    };

    // Vuelca el hueco de párrafo pendiente (si lo hay) antes del contenido siguiente
    const pushParagraphSpacer = () => {
      if (!pendingParagraphBreak) return;

      // Salto simple de un título centrado + contenido también centrado:
      // sigue siendo el mismo bloque (Capítulo 1: / Prólogo) → sin hueco.
      if (pendingCenteredOnly && currentAlign === 'center') {
        pendingParagraphBreak = false;
        pendingSpacerHeight = 0;
        pendingCenteredOnly = false;
        return;
      }

      allLines.push({
        fragments: [],
        height: pendingSpacerHeight,
        isSpacer: true,
        align: currentAlign
      });
      pendingParagraphBreak = false;
      pendingSpacerHeight = 0;
      pendingCenteredOnly = false;
    };

    for (const frag of data) {
      // 🖼️ Elemento de imagen: corta el flujo de texto y se renderiza después
      // en su propio canvas (igual que el header/footer). No lleva texto ni saltos.
      if (this._isImageFragment(frag)) {
        const image = this._normalizeImageFragment(frag);
        if (image) {
          // Cerramos la línea en curso y materializamos el salto pendiente para
          // que la imagen quede separada del párrafo anterior.
          if (currentLineFragments.length > 0) {
            flushLine(maxHeightInLine || this.settings.lineHeightDefault, false, currentAlign);
          }
          pushParagraphSpacer();
          allLines.push({ isImage: true, ...image });
        }
        continue;
      }

      const sizePx = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
      const lineHeightPx = sizePx * this.LINE_HEIGHT_RATIO;
      if (lineHeightPx > maxHeightInLine) {
        maxHeightInLine = lineHeightPx;
      }
      currentAlign = frag.align || 'left';

      const weight = frag.negrita ? 'bold' : '';
      const style = frag.cursiva ? 'italic' : '';
      dummyCtx.font = `${style} ${weight} ${sizePx}px ${this.FONT_FAMILY}`.trim();

      // Normalización: convertimos \n literales en saltos reales
      let textStr = (frag.texto || "").replace(/\\n/g, '\n');

      // Separar por saltos de línea para respetar los quiebres explícitos
      const parts = textStr.split(/(\r?\n)/);

      for (let p = 0; p < parts.length; p++) {
        const part = parts[p];
        if (part === '\n' || part === '\r\n') {
          // Altura de referencia del párrafo que se acaba de cerrar (antes de resetear)
          const breakHeight = Math.max(maxHeightInLine, lineHeightPx);

          // Si hay una línea acumulada, la volcamos manteniendo el alineamiento del fragmento actual
          if (currentLineFragments.length > 0) {
            flushLine(maxHeightInLine || lineHeightPx, false, currentAlign);
          }

          if (pendingParagraphBreak) {
            // Hay un salto pendiente sin contenido real entre medias: este es el
            // segundo (\n\n, \n \n, ...) → se pinta una LÍNEA EN BLANCO real
            // (antes de la corrección todos los saltos colapsaban al mismo hueco).
            pendingCenteredOnly = false;
            pendingSpacerHeight = Math.max(
              pendingSpacerHeight,
              breakHeight * this.settings.blankLineRatio
            );
          } else if (currentAlign === 'center') {
            // Salto simple dentro de un bloque centrado (título a dos líneas):
            // solo cambio de línea, sin hueco. Se guarda un candidato por si el
            // contenido siguiente no es centrado (ahí sí haría falta separar bloques).
            pendingParagraphBreak = true;
            pendingCenteredOnly = true;
            pendingSpacerHeight = breakHeight * this.settings.paragraphSpacingRatio;
          } else {
            pendingParagraphBreak = true;
            pendingCenteredOnly = false;
            pendingSpacerHeight = breakHeight * this.settings.paragraphSpacingRatio;
          }
          continue;
        }

        if (part === '') continue;

        // Un espacio suelto junto a un salto (" \n") no debe abrir una línea vacía:
        // si la línea está en blanco se descarta, así el render no cambia según cómo
        // haya partido el array el generador (un espacio puede caer en un fragmento
        // o en el siguiente).
        if (part.trim() === '' && currentLineFragments.length === 0) continue;

        // Contenido real: si quedaba un salto de párrafo pendiente, se vuelca aquí.
        // El espaciado depende del interlineado, nunca de cómo se haya partido el array.
        if (part.trim() !== '') {
          pushParagraphSpacer();
        }

        // Word Wrap por palabras manteniendo el flujo continuo entre fragmentos
        const words = part.split(' ');
        for (let w = 0; w < words.length; w++) {
          const word = words[w] + (w < words.length - 1 ? ' ' : '');
          if (word === '') continue;

          const wordWidth = dummyCtx.measureText(word).width;

          // Si la palabra excede el ancho, cerramos la línea actual y saltamos
          if (currentLineWidth + wordWidth > maxContentWidth && currentLineFragments.length > 0) {
            flushLine(maxHeightInLine || lineHeightPx, false, currentAlign);
          }

          currentLineFragments.push({ ...frag, texto: word });
          currentLineWidth += wordWidth;
          // Tras un corte de línea (wrap o salto) maxHeightInLine queda a 0:
          // se re-siembra para que la línea en curso mantenga su interlineado real
          // (afecta a la altura de la última línea del capítulo).
          if (lineHeightPx > maxHeightInLine) maxHeightInLine = lineHeightPx;
        }
      }
    }

    // Volcar cualquier residuo pendiente en la última línea
    if (currentLineFragments.length > 0) {
      flushLine(maxHeightInLine || this.settings.lineHeightDefault, false, currentAlign);
    }
    // Un salto final de párrafo NO genera hueco: no hay párrafo siguiente.

    this.allLines = allLines;

    // PAGINACIÓN INTERNA (Gestión de bloques seguros para los canvas en cascada)
    // Las imágenes son bloques independientes: cortan el flujo de texto y se
    // pintan en su propio canvas. NO cuentan como página de texto (así el
    // contador de páginas y la lectura en voz alta no se ven afectados).
    const PAGE_HEIGHT_LIMIT = this.settings.pageHeightLimit;
    const pages = [];
    const flow = [];
    let currentPageLines = [];
    let currentH = this.settings.marginTop;

    const closeTextPage = () => {
      if (currentPageLines.length === 0) return;
      const pageIdx = pages.length;
      pages.push(currentPageLines);
      flow.push({ type: 'text', pageIdx, lines: currentPageLines });
      currentPageLines = [];
      currentH = 0; // Sin margen acumulado entre bloques para garantizar continuidad exacta
    };

    this.allLines.forEach(line => {
      if (line.isImage) {
        closeTextPage();
        flow.push({ type: 'image', item: line });
        return;
      }
      const h = line.height || this.settings.lineHeightDefault;
      if (currentH + h > PAGE_HEIGHT_LIMIT) {
        closeTextPage();
      }
      currentPageLines.push(line);
      currentH += h;
    });

    closeTextPage();

    this.pages = pages;
    this.flow = flow;
  }

  /**
   * Carga una imagen y la cachea por URL (una sola descarga por imagen).
   * Si el servidor no envía cabeceras CORS se reintenta sin `crossOrigin`:
   * el canvas quedaría "tainted", pero aquí nunca se leen píxeles de él.
   * @param {string} url - URL completa de la imagen
   * @returns {Promise<HTMLImageElement|null>} La imagen cargada o null si falla
   */
  _loadImage(url) {
    if (!url) return Promise.resolve(null);
    if (this._imageCache.has(url)) return this._imageCache.get(url);

    const load = (useCors) => new Promise((resolve) => {
      const img = new Image();
      if (useCors) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });

    const promise = load(true).then((img) => (img ? img : load(false)));
    this._imageCache.set(url, promise);

    // Caché LRU sencilla: si crece demasiado se descarta la entrada más antigua
    while (this._imageCache.size > ENGINE_CONSTANTS.MAX_CACHED_IMAGES) {
      const oldest = this._imageCache.keys().next().value;
      this._imageCache.delete(oldest);
    }

    return promise;
  }

  /**
   * ¿Es este fragmento una imagen insertada entre el texto?
   * Formato: {tipo: 'imagen', src: '...', alt: '...', maxWidth: 0.95, align: 'center'}
   * @param {Object} frag - Fragmento del array de la obra
   * @returns {boolean}
   */
  _isImageFragment(frag) {
    if (!frag || typeof frag !== 'object') return false;
    const tipo = frag.tipo ? String(frag.tipo).toLowerCase() : '';
    if (tipo === 'imagen' || tipo === 'image') return true;
    return typeof frag.imagen === 'string' && frag.imagen.length > 0;
  }

  /**
   * Normaliza el "formato" de una imagen insertada:
   * - 'inline'  : imagen dentro del texto (por defecto), limitada por imageMaxHeight.
   * - 'pagina'  : imagen a página completa, ocupa el ancho de la página y puede
   *               ser tan alta como una página de texto (pageHeightLimit).
   * - 'banner'  : banda ancha (como el header/footer), altura limitada por bannerMaxHeight.
   * @param {string} value - Valor recibido en el array
   * @returns {string} 'inline' | 'pagina' | 'banner'
   */
  _normalizeImageFormat(value) {
    const format = String(value || '').trim().toLowerCase();
    if (format === 'pagina' || format === 'página' || format === 'page' || format === 'pagina-completa') {
      return 'pagina';
    }
    if (format === 'banner' || format === 'banda') return 'banner';
    return 'inline';
  }

  /**
   * Normaliza un fragmento de imagen y resuelve su URL.
   * @param {Object} frag - Fragmento del array de la obra
   * @returns {Object|null} {src, alt, maxWidth, align, formato} o null si no es usable
   */
  _normalizeImageFragment(frag) {
    const rawSrc = frag.src || frag.imagen || frag.url || '';
    if (!rawSrc) return null;

    const ratio = Number(frag.maxWidth);
    const maxWidth = Number.isFinite(ratio) && ratio > 0 ? Math.min(1, ratio) : 1;
    const align = ['left', 'right', 'center'].includes(frag.align) ? frag.align : 'center';

    return {
      src: this._resolveImageUrl(rawSrc),
      alt: frag.alt || '',
      maxWidth,
      align,
      formato: this._normalizeImageFormat(frag.formato)
    };
  }

  /**
   * Resuelve la ruta de una imagen:
   * - URL absoluta (http/https/data): se usa tal cual.
   * - Ruta relativa al documento ("./img.webp", "../img.webp", "/img.webp"):
   *   se resuelve contra la URL de la página.
   * - Nombre suelto ("img.webp"): se resuelve contra la base de imágenes de la obra.
   * @param {string} rawSrc
   * @returns {string}
   */
  _resolveImageUrl(rawSrc) {
    if (/^(https?:)?\/\//i.test(rawSrc) || rawSrc.startsWith('data:')) return rawSrc;

    // Rutas relativas al documento actual
    if (/^\.{1,2}\//.test(rawSrc) || rawSrc.startsWith('/')) {
      const base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : undefined;
      try {
        return base ? new URL(rawSrc, base).href : rawSrc;
      } catch (e) {
        return rawSrc;
      }
    }

    const base = this.config?.imagebaseUrl || this.config?.headerbaseUrl || '';
    if (!base) return rawSrc;
    return `${base}${rawSrc.replace(/^\/+/, '')}`;
  }

  async _loadResources() {
    // Procesa el array de banners del JSON (ej: headerBannerUrl: ['img1.webp', 'img2.webp'])
    const processBanners = async (baseUrl, bannerUrls, fallbackUrl) => {
      const banners = Array.isArray(bannerUrls) ? bannerUrls : [bannerUrls].filter(Boolean);
      const loadedImgs = [];
      for (const filename of banners) {
        const url = filename.startsWith('http') ? filename : `${baseUrl}${filename}`;
        let img = await this._loadImage(url);
        // Si la imagen del array falla al cargar, intentamos cargar el fallback correspondiente
        if (!img && fallbackUrl) {
          img = await this._loadImage(fallbackUrl);
        }
        // Guardamos el resultado en el array (manteniendo el índice exacto para que el capítulo coincida)
        loadedImgs.push(img);
      }
      return loadedImgs;
    };
    //Cargamos los arrays de cabecera y pie
    this.resources.headerImg = await processBanners(
      this.config?.headerbaseUrl || "",
      this.config?.headerBannerUrl,
      this.config?.headerBannerUrlFallback
    );

    this.resources.footerImg = await processBanners(
      this.config?.footerbaseUrl || "",
      this.config?.footerBannerUrl,
      this.config?.footerBannerUrlFallback
    );
  }

  _getBannerByChapter(chaptersArray, imgsArray, currentChapter) {
    if (!imgsArray || imgsArray.length === 0) return null;
    if (!chaptersArray || chaptersArray.length === 0) return imgsArray[0] || null;

    const numCurrent = Number(currentChapter) || 0;
    let selectedIndex = 0;

    for (let i = 0; i < chaptersArray.length; i++) {
      const threshold = Number(chaptersArray[i]) || 0;
      if (numCurrent >= threshold) {
        if (i < imgsArray.length) {
          selectedIndex = i;
        }
      } else {
        break;
      }
    }
    return imgsArray[selectedIndex] !== undefined ? imgsArray[selectedIndex] : imgsArray[0];
  }

  _renderAsset(img, text, isLink, availableWidth, marginPx) {
    if (!img && !text) return;

    const TAMANO_BASE = this.settings.defaultFontSize;
    let computedHeight = marginPx;

    // 1. Calculamos la altura exacta de antemano de forma limpia
    if (img) {
      if ((img.width / img.height) <=  ENGINE_CONSTANTS.ASPECT_RATIO_THRESHOLD) {
        computedHeight = marginPx;
      } else {
        computedHeight = img.height * (availableWidth / img.width);
      }
    } else if (text) {
      const fontSizePt = TAMANO_BASE - 2;
      computedHeight = this.ptToPx(fontSizePt) * this.LINE_HEIGHT_RATIO;
    }
    // 2. Creamos el canvas con sus dimensiones definitivas a la primera
    const finalAssetHeight = Math.round(computedHeight);
    const canvasNode = document.createElement('canvas');
    canvasNode.width = availableWidth;
    //canvasNode.height = computedHeight;
    canvasNode.height = finalAssetHeight;
    //canvasNode.style.height = `${computedHeight}px`;
    canvasNode.style.width = `${availableWidth}px`;
    canvasNode.height = finalAssetHeight;
    canvasNode.style.display = 'block';
    canvasNode.style.margin = '0 auto';

    const ctx = canvasNode.getContext('2d');
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, availableWidth, computedHeight);

    // 3. Pintamos el contenido una sola vez
    if (img) {
      let ancho, xPos;
      if ((img.width / img.height) <= ENGINE_CONSTANTS.ASPECT_RATIO_THRESHOLD) {
        ancho = img.width * (marginPx / img.height);
        xPos = (availableWidth - ancho) / 2;
        ctx.drawImage(img, xPos, 0, ancho, computedHeight);
      } else {
        ctx.drawImage(img, 0, 0, availableWidth, computedHeight);
      }
    } else if (text) {
      const fontSizePt = TAMANO_BASE - 2;
      ctx.font = fontSizePt + 'pt ' + this.FONT_FAMILY;
      ctx.fillStyle = isLink ? ENGINE_CONSTANTS.LINK_COLOR : ENGINE_CONSTANTS.LINK_TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(text, availableWidth / 2, 0);
      ctx.textAlign = 'left';
    }

    if (canvasNode) {
      this.container.appendChild(canvasNode);
      this.canvasElements.push(canvasNode);
    }
  }

  //--- RENDERIZADO EN CASCADA CON SCROLL INFINITO (CANVAS MÚLTIPLES SEGUROS) ---
  /**
   * Pinta el capítulo completo: bloques de texto y bloques de imagen, en orden.
   * Las imágenes se cargan antes de pintar para que el capítulo no dé saltos.
   * @returns {Promise<void>}
   */
  async render() {
    if (!this.container) return;

    // Limpiamos el contenedor y la pila anterior de canvas
    this.container.innerHTML = '';
    this.canvasElements = [];
    this.pageCanvasIndex = [];

    const availableWidth = this.container.clientWidth || window.innerWidth;
    const flow = this.flow || [];
    const config = this.config || {};
    const imgHeader = this._getBannerByChapter(config.headerChapters, this.resources.headerImg, this.capitulo);
    const imgFooter = this._getBannerByChapter(config.footerChapters, this.resources.footerImg, this.capitulo);
    const margenPx = this.settings.marginTop;

    // Las imágenes inline se cargan ANTES de pintar: así el capítulo aparece
    // completo (y sin saltos de maquetación) aunque tarden en descargarse.
    await Promise.all(flow.map(async (block) => {
      if (block.type !== 'image') return;
      block.item.image = await this._loadImage(block.item.src);
    }));

    // Cabecera (banner) antes del primer bloque, igual que el lector original
    if (imgHeader || config.headerText) {
      this._renderAsset(imgHeader, config.headerText, false, availableWidth, margenPx);
    }

    for (const block of flow) {
      if (block.type === 'image') {
        this._renderImageCanvas(block.item, availableWidth);
        continue;
      }
      this._renderTextPage(block.lines, block.pageIdx, availableWidth, margenPx, config);
    }

    // Inserción de Pie de Pagina (Footer)
    if ((imgFooter || config.footerLinkText)) {
      this._renderAsset(imgFooter, config.footerLinkText, !!config.footerLinkUrl, availableWidth, margenPx);
    }
  }

  /**
   * Pinta una página de texto en su propio canvas (bloque seguro para GPU/móvil).
   * @param {Array} pageLines - Líneas de la página
   * @param {number} pageIdx - Índice de la página dentro de this.pages
   * @param {number} availableWidth - Ancho disponible en px
   * @param {number} margenPx - Margen superior/inferior
   * @param {Object} config - Configuración remota
   */
  _renderTextPage(pageLines, pageIdx, availableWidth, margenPx, config) {
    let blockH = 0;

    pageLines.forEach(l => {
      blockH += (l.height || this.settings.lineHeightDefault);
    });

    // Solo el primer bloque lleva el margen superior y la cabecera opcional
    if (pageIdx === 0) {
      blockH += margenPx/2;
      //if (imgHeader || config.headerText) blockH += ENGINE_CONSTANTS.HEADER_FOOTER_ASSET_HEIGHT;
    }

    // Solo el último bloque lleva el pie de página opcional y el margen inferior
    if (pageIdx === this.pages.length - 1) {
       blockH += margenPx / 2;
      //  if (imgFooter || config.footerLinkText) blockH += ENGINE_CONSTANTS.HEADER_FOOTER_ASSET_HEIGHT;
      //  blockH += margenPx;
    }

    // Creamos un canvas independiente por cada bloque seguro para evitar límites de GPU/móviles
    const finalBlockH = Math.round(blockH);
    const canvasNode = document.createElement('canvas');
    canvasNode.width = availableWidth;
    //canvasNode.height = blockH;
    canvasNode.height = finalBlockH;
    canvasNode.style.width = `${availableWidth}px`;
    //canvasNode.style.height = `${blockH}px`;
    canvasNode.style.height = `${finalBlockH}px`;
    canvasNode.style.display = 'block';
    canvasNode.style.margin = '0';
    canvasNode.style.padding = '0';

    const ctx = canvasNode.getContext('2d');
    ctx.fillStyle = this.settings.bgColor;
    ctx.fillRect(0, 0, availableWidth, blockH);
    ctx.textBaseline = "top";

    let y = 0;

    if (pageIdx === 0) {
      y = margenPx / 2;
    }

    pageLines.forEach(line => {
      if (line.isSpacer) {
        y += line.height;
        return;
      }

      let x = this.settings.marginLeft;
      const maxContentWidth = availableWidth - (this.settings.marginLeft * 2);

      if (line.fragments) {
        // Si la línea está centrada, calculamos su ancho total primero para posicionarla en el medio
        if (line.align === 'center') {
          let totalLineWidth = 0;
          line.fragments.forEach(frag => {
            let size = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
            if (frag.superindice || frag.subindice) size *= 0.65;
            const weight = frag.negrita ? 'bold' : 'normal';
            const style = frag.cursiva ? 'italic' : 'normal';
            ctx.font = `${style} ${weight} ${size}px ${this.FONT_FAMILY}`;
            totalLineWidth += ctx.measureText(frag.texto).width;
          });
          x = this.settings.marginLeft + (maxContentWidth - totalLineWidth) / 2;
        }

        line.fragments.forEach(frag => {
          let size = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
          let offsetY = 0;

          if (frag.superindice) {
            size *= ENGINE_CONSTANTS.SCRIPT_SIZE_RATIO;
            offsetY = -size * ENGINE_CONSTANTS.SCRIPT_OFFSET_RATIO;
          } else if (frag.subindice) {
            size *= ENGINE_CONSTANTS.SCRIPT_SIZE_RATIO;
            offsetY = size * ENGINE_CONSTANTS.SCRIPT_OFFSET_RATIO;
          }

          const weight = frag.negrita ? 'bold' : 'normal';
          const style = frag.cursiva ? 'italic' : 'normal';
          ctx.font = `${style} ${weight} ${size}px ${this.FONT_FAMILY}`;
          ctx.fillStyle = frag.color ? `#${frag.color}` : this.settings.defaultTextColor;

          ctx.fillText(frag.texto, x, y + offsetY);

          if (frag.subrayado) {
            const textWidth = ctx.measureText(frag.texto).width;
            ctx.beginPath();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            ctx.moveTo(x, y + size * 0.9);
            ctx.lineTo(x + textWidth, y + size * 0.9);
            ctx.stroke();
          }

          x += ctx.measureText(frag.texto).width;
        });
      }
      y += line.height || this.settings.lineHeightDefault;
    });

    // Inyectamos el canvas en cadena al DOM del contenedor para el scroll continuo
    this.container.appendChild(canvasNode);
    this.canvasElements.push(canvasNode);
    // Guardamos qué canvas corresponde a esta página de texto: entre páginas
    // puede haber canvases de imágenes que desplazan la posición en la lista.
    this.pageCanvasIndex[pageIdx] = this.canvasElements.length - 1;
  }

  /**
   * Pinta una imagen insertada entre fragmentos de texto en su propio canvas,
   * según el "formato" indicado: inline (dentro del texto), pagina (a página
   * completa) o banner (banda ancha, como el header/footer).
   * Si la imagen no se pudo cargar, se salta y el texto continúa.
   * @param {Object} item - Bloque de imagen {src, alt, maxWidth, align, formato, image}
   * @param {number} availableWidth - Ancho disponible en px
   */
  _renderImageCanvas(item, availableWidth) {
    const img = item.image;
    if (!img || !img.width || !img.height) return;

    if (item.formato === 'pagina') {
      this._renderPageImage(img, item, availableWidth);
      return;
    }
    if (item.formato === 'banner') {
      this._renderBannerImage(img, item, availableWidth);
      return;
    }
    this._renderInlineImage(img, item, availableWidth);
  }

  /**
   * Crea el canvas de una imagen (fondo, tamaño y accesibilidad) y lo engancha
   * al contenedor en cascada.
   * @param {number} availableWidth - Ancho disponible en px
   * @param {number} height - Alto del canvas en px
   * @param {string} alt - Texto alternativo (opcional)
   * @returns {CanvasRenderingContext2D} Contexto del canvas ya insertado
   */
  _createImageCanvas(availableWidth, height, alt) {
    const canvasNode = document.createElement('canvas');
    canvasNode.width = availableWidth;
    canvasNode.height = height;
    canvasNode.style.width = `${availableWidth}px`;
    canvasNode.style.height = `${height}px`;
    canvasNode.style.display = 'block';
    canvasNode.style.margin = '0';
    canvasNode.style.padding = '0';

    if (alt) {
      canvasNode.setAttribute('role', 'img');
      canvasNode.setAttribute('aria-label', alt);
    }

    const ctx = canvasNode.getContext('2d');
    ctx.fillStyle = this.settings.bgColor;
    ctx.fillRect(0, 0, availableWidth, height);

    this.container.appendChild(canvasNode);
    this.canvasElements.push(canvasNode);
    return ctx;
  }

  /**
   * Calcula la posición horizontal de la imagen según su alineación.
   * @param {string} align - 'left' | 'center' | 'right'
   * @param {number} availableWidth - Ancho disponible en px
   * @param {number} drawW - Ancho dibujado de la imagen
   * @returns {number} Coordenada X
   */
  _imageX(align, availableWidth, drawW) {
    if (align === 'left') return this.settings.marginLeft;
    if (align === 'right') return availableWidth - this.settings.marginLeft - drawW;
    return (availableWidth - drawW) / 2;
  }

  /**
   * Imagen insertada dentro del texto: tamaño proporcional al ancho pedido,
   * con margen vertical y alto máximo de seguridad.
   * @param {HTMLImageElement} img - Imagen ya cargada
   * @param {Object} item - Bloque de imagen
   * @param {number} availableWidth - Ancho disponible en px
   */
  _renderInlineImage(img, item, availableWidth) {
    const marginPx = this.settings.imageMargin;
    const maxContentWidth = Math.max(1, availableWidth - (this.settings.marginLeft * 2));
    const maxWidth = Math.min(maxContentWidth * (item.maxWidth || 1), availableWidth);

    // Alto proporcional al ancho original de la imagen
    let drawW = Math.max(1, Math.round(maxWidth));
    let drawH = Math.max(1, Math.round((img.height / img.width) * drawW));

    // Límite de seguridad: evita canvas gigantes en imágenes muy verticales
    if (drawH > this.settings.imageMaxHeight) {
      drawH = this.settings.imageMaxHeight;
      drawW = Math.max(1, Math.round((img.width / img.height) * drawH));
    }

    const ctx = this._createImageCanvas(availableWidth, drawH + marginPx * 2, item.alt);
    ctx.drawImage(img, this._imageX(item.align, availableWidth, drawW), marginPx, drawW, drawH);
  }

  /**
   * Imagen a página completa: ocupa el ancho de la página y puede ser tan alta
   * como una página de texto (sin margen vertical: es la página).
   * @param {HTMLImageElement} img - Imagen ya cargada
   * @param {Object} item - Bloque de imagen
   * @param {number} availableWidth - Ancho disponible en px
   */
  _renderPageImage(img, item, availableWidth) {
    const maxContentWidth = Math.max(1, availableWidth - (this.settings.marginLeft * 2));
    const maxWidth = Math.min(maxContentWidth * (item.maxWidth || 1), availableWidth);

    let drawW = Math.max(1, Math.round(maxWidth));
    let drawH = Math.max(1, Math.round((img.height / img.width) * drawW));

    // Una imagen de página no puede superar la altura de una página de texto
    if (drawH > this.settings.pageHeightLimit) {
      drawH = this.settings.pageHeightLimit;
      drawW = Math.max(1, Math.round((img.width / img.height) * drawH));
    }

    const ctx = this._createImageCanvas(availableWidth, drawH, item.alt);
    ctx.drawImage(img, this._imageX(item.align, availableWidth, drawW), 0, drawW, drawH);
  }

  /**
   * Banner: banda ancha al ancho de la página (como el header/footer) con la
   * altura limitada para que no domine el texto.
   * @param {HTMLImageElement} img - Imagen ya cargada
   * @param {Object} item - Bloque de imagen
   * @param {number} availableWidth - Ancho disponible en px
   */
  _renderBannerImage(img, item, availableWidth) {
    const marginPx = this.settings.imageMargin;
    const maxWidth = Math.min(availableWidth * (item.maxWidth || 1), availableWidth);

    let drawW = Math.max(1, Math.round(maxWidth));
    let drawH = Math.max(1, Math.round((img.height / img.width) * drawW));

    // Un banner es ancho y bajo: si es demasiado alto se reduce (contenido)
    if (drawH > this.settings.bannerMaxHeight) {
      drawH = this.settings.bannerMaxHeight;
      drawW = Math.max(1, Math.round((img.width / img.height) * drawH));
    }

    const ctx = this._createImageCanvas(availableWidth, drawH + marginPx * 2, item.alt);
    ctx.drawImage(img, this._imageX(item.align, availableWidth, drawW), marginPx, drawW, drawH);
  }

  // --- Métodos de compatibilidad con SPA ---
  getTotalPages()  { return this.pages.length; }
  getCurrentPage() { return 1; }
  nextPage() {
    if (this.currentPageIndex < this.pages.length - 1) {
      this.renderPage(this.currentPageIndex + 2);
    }
  }
  previousPage() {
    if (this.currentPageIndex > 0) {
      this.renderPage(this.currentPageIndex);
    }
  }
  async getPage(pageNum) {
    const idx = Math.max(0, pageNum - 1);
    // El canvas de una página de texto puede no ser el que le toca por índice
    // si hay imágenes intercaladas: usamos el mapa pageCanvasIndex.
    const canvasIdx = this.pageCanvasIndex[idx] ?? idx;
    const targetCanvas = this.canvasElements[canvasIdx] || this.canvasElements[0];
    
    // 🔍 Extraemos el texto real de los fragmentos de esta página para el Text-to-Speech
    const pageLines = this.pages[idx] || [];
    const items = [];
    pageLines.forEach(line => {
      if (line.fragments) {
        line.fragments.forEach(frag => {
          items.push({ str: frag.texto });
        });
      }
    });

    return {
      num: pageNum,
      getViewport: () => ({ 
        width: targetCanvas ? targetCanvas.width : (this.container ? this.container.clientWidth : 0), 
        height: targetCanvas ? targetCanvas.height : 0 
      }),
      render: () => this.render(),
      getTextContent: async () => ({ items })
    };
  }

  fitToContainer() { this.render().catch(() => {}); }
  
  // 📄 Devolvemos el total de páginas reales calculadas en el procesamiento del texto
  get numPages() { return this.pages.length || 1; }
}