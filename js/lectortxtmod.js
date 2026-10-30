/**
 * TxtReaderEngine.js - VERSION FINAL ROBUSTA
 * Diseñado para procesar el formato repr() de Python sin usar eval/JSON.parse.
 */
export class TxtReaderEngine {
  constructor(options) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.container = options.container || this.canvas.parentElement;
    this.dpi = 96;
    this.FONT_FAMILY = "Arial";
    this.allLines = [];
    this.pages = [];
    this.isInfiniteScroll = options.isInfiniteScroll || false;
  }

  ptToPx(pt) { return (pt * this.dpi) / 72; }

  async load(txtContent, configUrl) {
    this.lastTextContent = txtContent;
    this._processText(txtContent);
    this.render();
  }

  _parsePythonArray(text) {
    try {
      const fragments = [];
      // Buscamos cada diccionario { ... }
      const regex = /\{(.*?)\}/g;
      let match;

      while ((match = regex.exec(text)) !== null) {
        const content = match[1];
        const frag = {};
        
        // Dividimos por comas que no estén dentro de comillas
        const pairs = content.split(/, (?=[^']*'|[^"]*")/);
        
        pairs.forEach(pair => {
          const splitIdx = pair.indexOf(':');
          if (splitIdx === -1) return;

          const key = pair.substring(0, splitIdx).trim().replace(/['"]/g, '');
          let val = pair.substring(splitIdx + 1).trim();

          // Limpiamos comillas del valor
          if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.substring(1, val.length - 1);
          }

          // Conversión manual de tipos de Python
          if (val === 'True') val = true;
          else if (val === 'False') val = false;
          else if (!isNaN(val) && val !== '') val = parseFloat(val);

          frag[key] = val;
        });
        fragments.push(frag);
      }
      return fragments;
    } catch (e) {
      console.error("Error en parseo manual:", e);
      return null;
    }
  }

  _processText(text) {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const maxContentWidth = availableWidth - 60;

    const data = this._parsePythonArray(text);
    if (!data || !Array.isArray(data)) {
      this.allLines = [];
      return;
    }

    const lines = [];
    let currentLineFragments = [];
    let currentX = 0;
    let currentLineH = 0;

    for (const frag of data) {
      const sizePx = this.ptToPx(frag.tamano || 12);
      const lineHeightPx = sizePx * this.LINE_HEIGHT_RATIO;
      
      this.ctx.font = `${sizePx}px ${this.FONT_FAMILY}`;
      
      const text = frag.texto || "";
      // Importante: El texto puede venir con \n reales o representados como string
      const parts = text.split(/\\n/);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        // Si el fragmento es vacío pero hay un salto de línea, creamos espacio
        if (part === '' && i > 0) {
          if (currentLineFragments.length > 0) {
            lines.push({ fragments: currentLineFragments, height: currentLineH });
            currentLineFragments = [];
            currentX = 0;
            currentLineH = 0;
          }
          lines.push({ fragments: [], height: lineHeightPx * 1.5, isSpacer: true });
          continue;
        }

        const words = part.split(' ');
        for (let w = 0; w < words.length; w++) {
          const word = words[w] + (w < words.length - 1 ? ' ' : '');
          const wordWidth = this.ctx.measureText(word).width;

          if (currentX + wordWidth > maxContentWidth && currentLineFragments.length > 0) {
            lines.push({ fragments: currentLineFragments, height: currentLineH });
            currentLineFragments = [];
            currentX = 0;
            currentLineH = 0;
          }

          currentLineFragments.push({ ...frag, texto: word });
          currentX += wordWidth;
          currentLineH = Math.max(currentLineH, lineHeightPx);
        }
      }
    }

    if (currentLineFragments.length > 0) {
      lines.push({ fragments: currentLineFragments, height: currentLineH });
    }

    this.allLines = lines;
    this.pages = [lines]; 
  }

  render() {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    let totalH = 40;
    this.allLines.forEach(l => totalH += l.height || 20);
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
    this.allLines.forEach(line => {
      if (line.isSpacer) {
        y += line.height;
        return;
      }
      let x = 20;
      if (line.fragments) {
        line.fragments.forEach(frag => {
          const size = this.ptToPx(frag.tamano || 12);
          ctx.font = `${frag.cursiva ? 'italic' : ''} ${frag.negrita ? 'bold' : ''} ${size}px ${this.FONT_FAMILY}`;
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
      getViewport: () => ({ width: this.canvas.width, height: this.canvas.height }),
      render: () => this.render(),
      getTextContent: async () => ({ items: [] })
    };
  }

  fitToContainer() { this.render(); }
  get numPages() { return this.pages.length; }
}