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
  pageHeightLimit: 2500,          // Altura máxima de cada bloque de canvas para evitar colapsos de memoria
  defaultFontSize: 12,            // Tamaño de fuente base en puntos (pt)
  bgColor: "#FFFFFF",           // Color de fondo del canvas
  defaultTextColor: "#000000",  // Color de texto cuando no se especifica uno en el fragmento
  lineHeightDefault: 24,          // Altura mínima de línea en px para evitar valores NaN o 0
  dpi: 96
};

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
    this.canvasElements = []; // Registro de los canvas múltiples creados en cascada
    this.isInfiniteScroll = options.isInfiniteScroll || false;
    this.resources = { headerImg: null, footerImg: null };
    this.config = {};

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
          this.render();
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
    this.render();
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
    const PAGE_HEIGHT_LIMIT = this.settings.pageHeightLimit; 
    const pages = [];
    let currentPageLines = [];
    let currentH = this.settings.marginTop;

    this.allLines.forEach(line => {
      const h = line.height || this.settings.lineHeightDefault;
      if (currentH + h > PAGE_HEIGHT_LIMIT) {
        pages.push(currentPageLines);
        currentPageLines = [];
        currentH = 0; // Sin margen acumulado entre bloques para garantizar continuidad exacta
      }
      currentPageLines.push(line);
      currentH += h;
    });

    if (currentPageLines.length > 0) {
      pages.push(currentPageLines);
    }

    this.pages = pages;
  }

async _loadResources() {
    // Función auxiliar para cargar una imagen individual por URL
    const loadImg = (url) => {
      if (!url) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };
    // Procesa el array de banners del JSON (ej: headerBannerUrl: ['img1.webp', 'img2.webp'])
    const processBanners = async (baseUrl, bannerUrls, fallbackUrl) => {
      const banners = Array.isArray(bannerUrls) ? bannerUrls : [bannerUrls].filter(Boolean);
      const loadedImgs = [];
      for (const filename of banners) {
        const url = filename.startsWith('http') ? filename : `${baseUrl}${filename}`;
        let img = await loadImg(url);
        // Si la imagen del array falla al cargar, intentamos cargar el fallback correspondiente
        if (!img && fallbackUrl) {
          img = await loadImg(fallbackUrl);
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
  render() {
    if (!this.container) return;

    // Limpiamos el contenedor y la pila anterior de canvas
    this.container.innerHTML = '';
    this.canvasElements = [];

    const availableWidth = this.container.clientWidth || window.innerWidth;
    const pages = this.pages || [];
    const config = this.config || {};
    const imgHeader = this._getBannerByChapter(config.headerChapters, this.resources.headerImg, this.capitulo);
    const imgFooter = this._getBannerByChapter(config.footerChapters, this.resources.footerImg, this.capitulo);
    const margenPx = this.settings.marginTop;

    pages.forEach((pageLines, pageIdx) => {
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
      if (pageIdx === pages.length - 1) {
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
        if (imgHeader || config.headerText) {
          this._renderAsset(imgHeader, config.headerText, false, availableWidth, margenPx);
        }
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
      //console.log({
      //  blockH,
      //  yFinal: y
      //});
    });
    // Inserción de Pie de Pagina (Footer)
    if ((imgFooter || config.footerLinkText)) {
      this._renderAsset(imgFooter, config.footerLinkText, !!config.footerLinkUrl, availableWidth, margenPx);
    }
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
    const targetCanvas = this.canvasElements[idx] || this.canvasElements[0];
    
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

  fitToContainer() { this.render(); }
  
  // 📄 Devolvemos el total de páginas reales calculadas en el procesamiento del texto
  get numPages() { return this.pages.length || 1; }
}