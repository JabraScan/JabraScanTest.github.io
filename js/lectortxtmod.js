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

    // Fusión de ajustes por defecto con opciones personalizadas del usuario
    this.settings = { ...DEFAULT_SETTINGS, ...options.settings };

    this.allLines = [];
    this.pages = [];
    this.canvasElements = []; // Referencias a la pila de canvas dinámicos en cascada
    this.isInfiniteScroll = options.isInfiniteScroll || false;
    this.resources = { headerImg: null, footerImg: null };
    this.config = {};

    // Setup de redimensionamiento responsivo
    this._setupResizeListener();
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
    try {
      if (configUrl && typeof configUrl === 'string') {
        const res = await fetch(configUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            this.config = { ...this.config, ...data };
          }
        }
      }
    } catch (e) {}

    this._processText(txtContent);
    this.render();
  }

  _parsePythonArray(text) {
    try {
      // Conversión segura de booleanos de Python a JS (True -> true, False -> false)
      const formatted = text.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
      return new Function(`return ${formatted}`)();
    } catch (e) {
      console.error("Error parseando array:", e);
      return null;
    }
  }

  // --- LÓGICA DE PROCESADO DE TEXTO EXACTA E INTACTA ---
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

    // Contexto auxiliar para mediciones de texto antes de crear canvas
    const dummyCanvas = document.createElement('canvas');
    const dummyCtx = dummyCanvas.getContext('2d');

    for (const frag of data) {
      const sizePx = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
      const lineHeightPx = sizePx * this.LINE_HEIGHT_RATIO;
      
      let textStr = (frag.texto || "").replace(/\\n/g, '\n');
      const parts = textStr.split(/\r?\n/);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part === '' && i > 0) {
          if (i + 1 < parts.length && parts[i+1] === '') {
            allLines.push({ fragments: [], height: lineHeightPx * this.settings.paragraphSpacingRatio, isSpacer: true });
            i++; 
          } else {
            allLines.push({ fragments: [], height: lineHeightPx, isSpacer: false });
          }
          continue;
        }

        if (part.length > 0) {
          dummyCtx.font = `${sizePx}px ${this.FONT_FAMILY}`;
          
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
    
    // PAGINACIÓN INTERNA (Gestión de memoria acotada a pageHeightLimit)
    const PAGE_HEIGHT_LIMIT = this.settings.pageHeightLimit; 
    const pages = [];
    let currentPageLines = [];
    let currentH = this.settings.marginTop;

    this.allLines.forEach(line => {
      const h = line.height || this.settings.lineHeightDefault;
      if (currentH + h > PAGE_HEIGHT_LIMIT) {
        pages.push(currentPageLines);
        currentPageLines = [];
        currentH = this.settings.marginTop;
      }
      currentPageLines.push(line);
      currentH += h;
    });

    if (currentPageLines.length > 0) {
      pages.push(currentPageLines);
    }

    this.pages = pages;
  }

  // Helper para renderizado opcional de Assets (Cabecera / Pie)
  _renderAsset(ctx, img, text, isLink, yPos, availableWidth, margenPx) {
    const TAMANO_BASE = this.settings.defaultFontSize;
    if (img) {
      let ancho, alto, xPos;
      if ((img.width / img.height) <= 0.40) {
        let proporcion = margenPx / img.height;
        ancho = img.width * proporcion;
        alto = margenPx;
        xPos = (availableWidth - ancho) / 2;
      } else {
        let proporcion = availableWidth / img.width;
        ancho = availableWidth;
        alto = img.height * proporcion;
        xPos = 0;
      }
      ctx.drawImage(img, xPos, yPos, ancho, alto);
      return alto;
    } else if (text) {
      const fontSizePt = TAMANO_BASE - 2;
      ctx.font = fontSizePt + 'pt ' + this.FONT_FAMILY;
      ctx.fillStyle = isLink ? '#0000FF' : '#555555';
      ctx.textAlign = 'center';
      ctx.fillText(text, availableWidth / 2, yPos);
      ctx.textAlign = 'left';
      return this.ptToPx(fontSizePt) * this.LINE_HEIGHT_RATIO;
    }
    return 0;
  }

  // --- RENDERIZADO EN CASCADA (Múltiples canvas dinámicos en el DOM) ---
  render() {
    if (!this.container) return;

    // 1. Limpiar el contenedor de los canvas de llamadas anteriores
    this.container.innerHTML = '';
    this.canvasElements = [];

    const availableWidth = this.container.clientWidth || window.innerWidth;
    const pages = this.pages || [];
    const config = this.config || {};
    const imgHeader = this.resources.headerImg;
    const imgFooter = this.resources.footerImg;
    const margenPx = this.settings.marginTop;

    // 2. Iterar bloque a bloque sobre THIS.PAGES y generar un canvas individual por bloque
    pages.forEach((pageLines, pageIdx) => {
      // Calcular la altura exacta de esta página acotada
      let blockH = margenPx;
      if (pageIdx === 0 && (imgHeader || config.headerText)) blockH += 40;

      pageLines.forEach(l => {
        blockH += (l.height || this.settings.lineHeightDefault);
      });

      if (pageIdx === pages.length - 1 && (imgFooter || config.footerLinkText)) blockH += 40;
      blockH += margenPx;

      // Crear elemento <canvas> dinámico para esta página
      const canvasNode = document.createElement('canvas');
      canvasNode.width = availableWidth;
      canvasNode.height = blockH;
      canvasNode.style.width = `${availableWidth}px`;
      canvasNode.style.height = `${blockH}px`;
      canvasNode.style.display = 'block';

      const ctx = canvasNode.getContext('2d');
      ctx.fillStyle = this.settings.bgColor;
      ctx.fillRect(0, 0, availableWidth, blockH);
      ctx.textBaseline = "top";

      let y = margenPx / 2;

      // Cabecera en la primera página del documento
      if (pageIdx === 0 && (imgHeader || config.headerText)) {
        const headerHeight = this._renderAsset(ctx, imgHeader, config.headerText, false, y, availableWidth, margenPx);
        y += headerHeight > 0 ? headerHeight + 10 : margenPx;
      } else {
        y = margenPx;
      }

      // Pintar las líneas de texto del bloque actual
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

      // Pie de página en el último bloque del documento
      if (pageIdx === pages.length - 1 && (imgFooter || config.footerLinkText)) {
        let yFooter = y + (margenPx / 2);
        this._renderAsset(ctx, imgFooter, config.footerLinkText, !!config.footerLinkUrl, yFooter, availableWidth, margenPx);
      }

      // Inyectar el canvas al DOM y guardarlo en el registro del motor
      this.container.appendChild(canvasNode);
      this.canvasElements.push(canvasNode);
    });
  }

  // Métodos de integración transparentes con la SPA / Lector PDF
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
  get numPages() { return this.pages.length > 0 ? this.pages.length : 1; }
}