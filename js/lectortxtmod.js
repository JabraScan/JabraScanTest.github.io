/**
 * Configuración predeterminada del motor de renderizado.
 * Permite ajustar la apariencia visual sin modificar la lógica interna.
 */
const DEFAULT_SETTINGS = {
  marginTop: 40,               // Espacio en px arriba y abajo del contenido total
  marginLeft: 20,               // Margen izquierdo y derecho del texto en px
  paragraphSpacingRatio: 1.8,   // Multiplicador de altura para saltos de párrafo (\n\n)
  pageHeightLimit: 2500,        // Altura máxima de cada bloque de canvas para evitar colapsos de memoria
  defaultFontSize: 12,          // Tamaño de fuente base en puntos (pt)
  bgColor: "#FFFFFF",           // Color de fondo del canvas
  defaultTextColor: "#000000",  // Color de texto cuando no se especifica uno en el fragmento
  lineHeightDefault: 20         // Altura mínima de línea en px para evitar valores NaN o 0
};

export class TxtReaderEngine {
  constructor(options) {
    this.initialCanvas = options.canvas;
    this.container = options.container || (options.canvas ? options.canvas.parentElement : null);
    this.dpi = 96;
    this.FONT_FAMILY = "Arial";
    this.LINE_HEIGHT_RATIO = 1.3;

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
      headerbaseUrl: `https://img.jabrascan.net/${this.clave}/`,
      headerBannerUrl: [`header.webp`],
      headerChapters: [0],
      headerBannerUrlFallback: null,

      footerbaseUrl: `https://img.jabrascan.net/${this.clave}/`,
      footerBannerUrl: [`footer.webp`],
      footerChapters: [0],
      footerBannerUrlFallback: `https://img.jabrascan.net/main/JabraRexScan02-150w.webp`,
      
      footerLinkUrl: "", 
      footerLinkText: "https://jabrascan.net"
    };
  }

  _setupResizeListener() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.lastTextContent) {
          this._processText(this.lastTextContent);
          this.render();
        }
      }, 200);
    });
  }

  ptToPx(pt) { return (pt * this.dpi) / 72; }

  async load(txtContent, configUrl) {
    this.lastTextContent = txtContent;
    let fetchedConfig = {};
    
    if (configUrl && typeof configUrl === 'string') {
      try {
        // Llamada POST a tu Worker configobra para evitar errores 404 en consola
        const res = await fetch('https://jabrascan.net/configobra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: configUrl })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            this.config = { ...this.config, ...data };
          }
        }
      } catch (e) {
        // Silenciamos cualquier fallo o error de red para mantener la consola limpia
      }
    }
    // Filtrar valores vacíos o nulos de la configuración remota
    const validFetchedConfig = Object.fromEntries(
      Object.entries(fetchedConfig).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    // Combinar la configuración por defecto con la remota ya filtrada
    this.config = {
      ...this.DEFAULT_CONFIG,
      ...validFetchedConfig
    };

    // Cargamos los recursos gráficos (banners filtrados por capítulo)
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

  // --- TU _processText ORIGINAL 100% INTACTO ---
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

    // Canvas auxiliar invisible exclusivamente para mediciones de texto
    const dummyCanvas = document.createElement('canvas');
    const dummyCtx = dummyCanvas.getContext('2d');

    for (const frag of data) {
      const sizePx = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
      const lineHeightPx = sizePx * this.LINE_HEIGHT_RATIO;
      
      // Normalización: convertimos \n literales en saltos reales
      let textStr = (frag.texto || "").replace(/\\n/g, '\n');
      const parts = textStr.split(/\r?\n/);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // Manejo de saltos de línea explícitos
        if (part === '' && i > 0) {
          // Salto doble = Párrafo
          if (i + 1 < parts.length && parts[i+1] === '') {
            allLines.push({ fragments: [], height: lineHeightPx * this.settings.paragraphSpacingRatio, isSpacer: true });
            i++; 
          } else {
            // Salto simple = Línea vacía visible
            allLines.push({ fragments: [], height: lineHeightPx, isSpacer: false });
          }
          continue;
        }

        if (part.length > 0) {
          dummyCtx.font = `${sizePx}px ${this.FONT_FAMILY}`;
          
          // Word Wrap: Solo si el fragmento excede el ancho del contenedor
          if (dummyCtx.measureText(part).width > maxContentWidth) {
            const words = part.split(' ');
            let currentLineFragments = [];
            let currentX = 0;

            for (let w = 0; w < words.length; w++) {
              const word = words[w] + (w < words.length - 1 ? ' ' : '');
              const wordWidth = dummyCtx.measureText(word).width;

              if (currentX + wordWidth > maxContentWidth && currentLineFragments.length > 0) {
                allLines.push({ fragments: currentLineFragments, height: lineHeightPx });
                currentLineFragments = [];
                currentX = 0;
              }
              currentLineFragments.push({ ...frag, texto: word });
              currentX += wordWidth;
            }
            if (currentLineFragments.length > 0) {
              allLines.push({ fragments: currentLineFragments, height: lineHeightPx });
            }
          } else {
            allLines.push({ 
              fragments: [{ ...frag, texto: part }], 
              height: lineHeightPx 
            });
          }
        }
      }
    }

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

    const processBanners = async (baseUrl, bannerUrls, fallbackUrl) => {
      const banners = Array.isArray(bannerUrls) ? bannerUrls : [bannerUrls].filter(Boolean);
      const loadedImgs = [];
      for (const filename of banners) {
        const url = filename.startsWith('http') ? filename : `${baseUrl}${filename}`;
        let img = await loadImg(url);
        if (!img && fallbackUrl) {
          img = await loadImg(fallbackUrl);
        }
        loadedImgs.push(img);
      }
      return loadedImgs;
    };

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
      if ((img.width / img.height) <= 0.40) {
        computedHeight = marginPx;
      } else {
        computedHeight = img.height * (availableWidth / img.width);
      }
    } else if (text) {
      const fontSizePt = TAMANO_BASE - 2;
      computedHeight = this.ptToPx(fontSizePt) * this.LINE_HEIGHT_RATIO;
    }

    // 2. Creamos el canvas con sus dimensiones definitivas a la primera
    const canvasNode = document.createElement('canvas');
    canvasNode.width = availableWidth;
    canvasNode.height = computedHeight;
    canvasNode.style.width = `${availableWidth}px`;
    canvasNode.style.height = `${computedHeight}px`;
    canvasNode.style.display = 'block';
    canvasNode.style.margin = '0 auto';

    const ctx = canvasNode.getContext('2d');
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, availableWidth, computedHeight);

    // 3. Pintamos el contenido una sola vez
    if (img) {
      let ancho, xPos;
      if ((img.width / img.height) <= 0.40) {
        ancho = img.width * (marginPx / img.height);
        xPos = (availableWidth - ancho) / 2;
        ctx.drawImage(img, xPos, 0, ancho, computedHeight);
      } else {
        ctx.drawImage(img, 0, 0, availableWidth, computedHeight);
      }
    } else if (text) {
      const fontSizePt = TAMANO_BASE - 2;
      ctx.font = fontSizePt + 'pt ' + this.FONT_FAMILY;
      ctx.fillStyle = isLink ? '#0000FF' : '#555555';
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

  // --- RENDERIZADO EN CASCADA CON SCROLL INFINITO (CANVAS MÚLTIPLES SEGUROS) ---
  render() {
    if (!this.container) return;

    // Limpiamos el contenedor y la pila anterior de canvas
    this.container.innerHTML = '';
    this.canvasElements = [];

    const availableWidth = this.container.clientWidth || window.innerWidth;
    const pages = this.pages || [];
    const config = this.config || {};
    const imgHeader = this.resources.headerImg;
    const imgFooter = this.resources.footerImg;
    const margenPx = this.settings.marginTop;

    pages.forEach((pageLines, pageIdx) => {
      let blockH = 0;

      // Solo el primer bloque lleva el margen superior y la cabecera opcional
      if (pageIdx === 0) {
        blockH += margenPx;
        if (imgHeader || config.headerText) blockH += 40;
      }

      pageLines.forEach(l => {
        blockH += (l.height || this.settings.lineHeightDefault);
      });

      // Solo el último bloque lleva el pie de página opcional y el margen inferior
      if (pageIdx === pages.length - 1) {
        if (imgFooter || config.footerLinkText) blockH += 40;
        blockH += margenPx;
      }

      // Creamos un canvas independiente por cada bloque seguro para evitar límites de GPU/móviles
      const canvasNode = document.createElement('canvas');
      canvasNode.width = availableWidth;
      canvasNode.height = blockH;
      canvasNode.style.width = `${availableWidth}px`;
      canvasNode.style.height = `${blockH}px`;
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
          //const headerHeight = this._renderAsset(imgHeader, config.headerText, false, y, availableWidth, margenPx);
          y += headerHeight > 0 ? headerHeight + 10 : margenPx;
        } else {
          y = margenPx;
        }
      }

      pageLines.forEach(line => {
        if (line.isSpacer) {
          y += line.height;
          return;
        }

        let x = this.settings.marginLeft;
        if (line.fragments) {
          line.fragments.forEach(frag => {
            let size = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
            let offsetY = 0;

            if (frag.superindice) {
              size *= 0.65;
              offsetY = -size * 0.2;
            } else if (frag.subindice) {
              size *= 0.65;
              offsetY = size * 0.2;
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

      if (pageIdx === pages.length - 1 && (imgFooter || config.footerLinkText)) {
        let yFooter = y + (margenPx / 2);
        //this._renderAsset(imgFooter, config.footerLinkText, !!config.footerLinkUrl, yFooter, availableWidth, margenPx);
      }

      // Inyectamos el canvas en cadena al DOM del contenedor para el scroll continuo
      this.container.appendChild(canvasNode);
      this.canvasElements.push(canvasNode);
    });
  }

  async getPage(pageNum) {
    const idx = Math.max(0, pageNum - 1);
    const targetCanvas = this.canvasElements[idx] || this.canvasElements[0];
    return {
      num: pageNum,
      getViewport: () => ({ 
        width: targetCanvas ? targetCanvas.width : (this.container ? this.container.clientWidth : 0), 
        height: targetCanvas ? targetCanvas.height : 0 
      }),
      render: () => this.render(),
      getTextContent: async () => ({ items: [] })
    };
  }

  fitToContainer() { this.render(); }
  get numPages() { return 1; }
}