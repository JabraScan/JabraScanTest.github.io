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

    this.settings = { ...DEFAULT_SETTINGS, ...options.settings };

    this.allLines = [];
    this.pages = [];
    this.isInfiniteScroll = options.isInfiniteScroll || false;
    this.resources = { headerImg: null, footerImg: null };
    this.config = {};

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

    // PASO 1: Segmentación Estricta por saltos de línea
    const rawLines = [];
    for (const frag of data) {
      const sizePx = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
      const lineHeightPx = sizePx * this.LINE_HEIGHT_RATIO;
      let textStr = (frag.texto || "").replace(/\\n/g, '\n');
      
      const parts = textStr.split(/\r?\n/);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === '' && i > 0) {
          // Detectar salto doble para párrafo
          if (i + 1 < parts.length && parts[i+1] === '') {
            rawLines.push({ isSpacer: true, height: lineHeightPx * this.settings.paragraphSpacingRatio });
            i++;
          } else {
            // Salto simple: línea vacía obligatoria
            rawLines.push({ isSpacer: false, height: lineHeightPx, fragments: [] });
          }
        } else {
          rawLines.push({ isSpacer: false, height: lineHeightPx, fragments: [{ ...frag, texto: part }] });
        }
      }
    }

    // PASO 2: Expansión por Word Wrap (Ajuste al ancho)
    const finalLines = [];
    rawLines.forEach(line => {
      if (line.isSpacer) {
        finalLines.push(line);
        return;
      }

      const fragments = line.fragments;
      if (!fragments || fragments.length === 0) {
        finalLines.push(line);
        return;
      }

      // Simulamos la medida del texto completo de la línea
      this.ctx.font = `${this.ptToPx(fragments[0].tamano || this.settings.defaultFontSize)}px ${this.FONT_FAMILY}`;
      let fullText = fragments.map(f => f.texto).join('');
      
      if (this.ctx.measureText(fullText).width > maxContentWidth) {
        // Dividimos en palabras solo si excede el ancho
        let currentLineFragments = [];
        let currentX = 0;
        const sizePx = this.ptToPx(fragments[0].tamano || this.settings.defaultFontSize);

        // Simplificamos: usamos el primer fragmento como base para el wrap de la línea
        const words = fullText.split(' ');
        for (let w = 0; w < words.length; w++) {
          const word = words[w] + (w < words.length - 1 ? ' ' : '');
          const wordWidth = this.ctx.measureText(word).width;

          if (currentX + wordWidth > maxContentWidth && currentLineFragments.length > 0) {
            finalLines.push({ fragments: currentLineFragments, height: sizePx * this.LINE_HEIGHT_RATIO });
            currentLineFragments = [];
            currentX = 0;
          }
          currentLineFragments.push({ ...fragments[0], texto: word });
          currentX += wordWidth;
        }
        if (currentLineFragments.length > 0) {
          finalLines.push({ fragments: currentLineFragments, height: sizePx * this.LINE_HEIGHT_RATIO });
        }
      } else {
        finalLines.push(line);
      }
    });

    this.allLines = finalLines;
    
    // PAGINACIÓN (Interna para memoria)
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
    if (currentPageLines.length > 0) pages.push(currentPageLines);
    this.pages = pages;
  }

  render() {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const allLinesToRender = this.allLines || [];

    // Cálculo de altura exacto basado en la simulación final
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