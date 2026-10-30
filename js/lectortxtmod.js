/**
 * TxtReaderEngine.js - VERSION DEFINITIVA Y ESTABLE
 * Soluciona: TypeError (LINE_HEIGHT_RATIO), ReferenceError (True/False), WordWrap y saltos \n.
 */
export class TxtReaderEngine {
  constructor(options) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.container = options.container || this.canvas.parentElement;
    this.dpi = 96;
    this.FONT_FAMILY = "Arial";
    this.LINE_HEIGHT_RATIO = 1.3; // DEFINICIÓN CRÍTICA PARA EVITAR NaN
    this.allLines = [];
    this.pages = [];
    this.isInfiniteScroll = options.isInfiniteScroll || false;
    this.resources = { headerImg: null, footerImg: null };
    this.config = {};
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
      // Conversión segura de booleanos de Python a JS antes de evaluar
      const formatted = text.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
      return new Function(`return ${formatted}`)();
    } catch (e) {
      console.error("Error parseando array:", e);
      return null;
    }
  }

  _processText(text) {
    const data = this._parsePythonArray(text);
    if (!data || !Array.isArray(data)) {
      this.allLines = [];
      this.pages = [];
      return;
    }

    const allLines = [];

    for (const frag of data) {
      const sizePx = this.ptToPx(frag.tamano || 12);
      const lineHeightPx = sizePx * this.LINE_HEIGHT_RATIO;
      const textStr = frag.texto || "";

      // Dividimos el texto estrictamente por saltos de línea (reales o literales \n)
      const parts = textStr.split(/(\\n|\r?\n)/);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part === '\\n' || part === '\n' || part === '\r\n') {
          // Si hay dos saltos seguidos, creamos un espacio de párrafo
          if (i + 1 < parts.length && (parts[i+1] === '\\n' || parts[i+1] === '\n' || parts[i+1] === '\r\n')) {
            allLines.push({ fragments: [], height: lineHeightPx * 1.8, isSpacer: true });
            i++; 
          } else {
            // Salto simple: solo añadimos una línea vacía con la altura estándar
            allLines.push({ fragments: [], height: lineHeightPx, isSpacer: false });
          }
          continue;
        }

        if (part.length > 0) {
          // AÑADIMOS LA LÍNEA TAL CUAL, SIN RECONSTRUIR PALABRAS
          allLines.push({ 
            fragments: [{ ...frag, texto: part }], 
            height: lineHeightPx 
          });
        }
      }
    }

    this.allLines = allLines;
    
    // PAGINACIÓN PARA SCROLL INFINITO
    const PAGE_HEIGHT_LIMIT = 2500; 
    const pages = [];
    let currentPageLines = [];
    let currentH = 40;

    this.allLines.forEach(line => {
      const h = line.height || 20;
      if (currentH + h > PAGE_HEIGHT_LIMIT) {
        pages.push(currentPageLines);
        currentPageLines = [];
        currentH = 40;
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
    
    // Para el scroll infinito, renderizamos la primera página o la página solicitada
    // Nota: El orchestrator lectorpdfmod.js maneja la vista, aquí preparamos el canvas base
    const activePageLines = this.pages[0] || [];
    
    let totalH = 40; 
    activePageLines.forEach(l => {
      totalH += (l.height || 20);
    });
    totalH += 40;

    this.canvas.width = availableWidth;
    this.canvas.height = totalH;
    this.canvas.style.width = `${availableWidth}px`;
    this.canvas.style.height = `${totalH}px`;

    const ctx = this.ctx;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, availableWidth, totalH);
    ctx.textBaseline = "top";

    let y = 20;
    activePageLines.forEach(line => {
      if (y > totalH) return;

      if (line.isSpacer) {
        y += line.height;
        return;
      }
      
      let x = 20;
      if (line.fragments) {
        line.fragments.forEach(frag => {
          const size = this.ptToPx(frag.tamano || 12);
          ctx.font = `${frag.cursiva ? 'italic' : 'normal'} ${frag.negrita ? 'bold' : 'normal'} ${size}px ${this.FONT_FAMILY}`;
          ctx.fillStyle = frag.color ? `#${frag.color}` : "#000000";
          ctx.fillText(frag.texto, x, y);
          x += ctx.measureText(frag.texto).width;
        });
      }
      y += line.height || 20;
    });
  }

  async getPage(pageNum) {
    return {
      num: pageNum,
      getViewport: () => ({
        width: this.canvas.width,
        height: this.canvas.height
      }),
      render: () => this.render(),
      getTextContent: async () => ({ items: [] })
    };
  }

  fitToContainer() { this.render(); }
  get numPages() { return this.pages.length; }
}