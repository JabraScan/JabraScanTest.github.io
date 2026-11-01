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
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.container = options.container || this.canvas.parentElement;
    this.dpi = 96;
    this.FONT_FAMILY = "Arial";
    this.LINE_HEIGHT_RATIO = 1.3; 

    // Fusión de ajustes por defecto con opciones personalizadas del usuario
    this.settings = { ...DEFAULT_SETTINGS, ...options.settings };

    this.allLines = [];
    this.pages = [];
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
      const formatted = text.replace(/\\bTrue\\b/g, 'true').replace(/\\bFalse\\b/g, 'false');
      return new Function(`return ${formatted}`)();
    } catch (e) {
      console.error("Error parseando array:", e);
      return null;
    }
  }

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

    // 1. CONSTRUCCIÓN DE TOKENS: Desglosamos cada fragmento en palabras y espacios manteniendo su estilo
    let inlineTokens = [];
    for (const frag of data) {
      let textStr = (frag.texto || "").replace(/\\n/g, '\n');
      
      const rawParts = textStr.split(/(\r?\n)/);

      for (let p = 0; p < rawParts.length; p++) {
        const part = rawParts[p];
        if (part === '') continue;

        if (part === '\n' || part === '\r\n') {
          inlineTokens.push({ type: 'newline', frag });
        } else {
          const words = part.split(' ');
          for (let w = 0; w < words.length; w++) {
            if (words[w] !== '') {
              inlineTokens.push({ type: 'word', texto: words[w], frag });
            }
            if (w < words.length - 1) {
              inlineTokens.push({ type: 'space', texto: ' ', frag });
            }
          }
        }
      }
    }

    // 2. AGRUPACIÓN EN LÍNEAS VISUALES CON WORD WRAP FLUIDO
    let currentLineFragments = [];
    let currentLineWidth = 0;
    
    const getLineHeight = (frags) => {
      const sizePt = frags.length > 0 && frags[0].tamano ? frags[0].tamano : this.settings.defaultFontSize;
      return this.ptToPx(sizePt) * this.LINE_HEIGHT_RATIO;
    };

    const flushLine = (frags, isSpacer = false, customHeight = null) => {
      const height = customHeight !== null ? customHeight : (frags.length > 0 ? getLineHeight(frags) : this.settings.lineHeightDefault);
      allLines.push({ fragments: [...frags], height, isSpacer });
    };

    let i = 0;
    while (i < inlineTokens.length) {
      const token = inlineTokens[i];

      if (token.type === 'newline') {
        let consecutiveNewlines = 1;
        let peekIdx = i + 1;
        while (peekIdx < inlineTokens.length && inlineTokens[peekIdx].type === 'newline') {
          consecutiveNewlines++;
          peekIdx++;
        }

        if (currentLineFragments.length > 0) {
          flushLine(currentLineFragments);
          currentLineFragments = [];
          currentLineWidth = 0;
        }

        const baseSizePx = this.ptToPx(token.frag.tamano || this.settings.defaultFontSize);
        const baseLineH = baseSizePx * this.LINE_HEIGHT_RATIO;

        if (consecutiveNewlines >= 2) {
          flushLine([], true, baseLineH * this.settings.paragraphSpacingRatio);
          i = peekIdx;
          continue;
        } else {
          flushLine([], false, baseLineH);
          i++;
          continue;
        }
      }

      // Medir ancho del token actual de forma limpia
      const sizePx = this.ptToPx(token.frag.tamano || this.settings.defaultFontSize);
      const weight = token.frag.negrita ? 'bold' : 'normal';
      const style = token.frag.cursiva ? 'italic' : 'normal';
      
      this.ctx.font = `${style} ${weight} ${sizePx}px ${this.FONT_FAMILY}`;
      const tokenText = token.texto;
      const tokenWidth = this.ctx.measureText(tokenText).width;

      if (currentLineWidth + tokenWidth > maxContentWidth && currentLineFragments.length > 0) {
        flushLine(currentLineFragments);
        currentLineFragments = [];
        currentLineWidth = 0;
        if (token.type === 'space') {
          i++;
          continue;
        }
      }

      const lastFrag = currentLineFragments[currentLineFragments.length - 1];
      const isSameStyle = lastFrag &&
        lastFrag.tamano === token.frag.tamano &&
        lastFrag.negrita === token.frag.negrita &&
        lastFrag.cursiva === token.frag.cursiva &&
        lastFrag.subrayado === token.frag.subrayado &&
        lastFrag.superindice === token.frag.superindice &&
        lastFrag.subindice === token.frag.subindice &&
        lastFrag.color === token.frag.color;

      if (isSameStyle) {
        lastFrag.texto += tokenText;
      } else {
        currentLineFragments.push({ ...token.frag, texto: tokenText });
      }

      currentLineWidth += tokenWidth;
      i++;
    }

    if (currentLineFragments.length > 0) {
      flushLine(currentLineFragments);
    }

    this.allLines = allLines;
    
    // PAGINACIÓN INTERNA (Gestión de memoria)
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

  render() {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const allLinesToRender = this.allLines || [];

    // Altura total exacta basada en la simulación de todas las líneas
    let totalH = this.settings.marginTop;
    allLinesToRender.forEach(l => {
      totalH += (l.height || this.settings.lineHeightDefault);
    });
    totalH += this.settings.marginTop;

    this.canvas.width = availableWidth;
    this.canvas.height = totalH;
    this.canvas.style.width = `${availableWidth}px`;
    this.canvas.style.height = `${totalH}px`;

    const ctx = this.ctx;
    ctx.fillStyle = this.settings.bgColor;
    ctx.fillRect(0, 0, availableWidth, totalH);
    ctx.textBaseline = "top";

    let y = this.settings.marginTop;
    allLinesToRender.forEach(line => {
      if (y > totalH) return;

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
  }

  async getPage(pageNum) {
    return {
      num: pageNum,
      getViewport: () => ({ width: this.canvas.width, height: this.canvas.height }),
      render: () => this.render(),
      getTextContent: async () => ({ items: [] })
    };
  }

  fitToContainer() { this.render(); }
  get numPages() { return 1; }
}