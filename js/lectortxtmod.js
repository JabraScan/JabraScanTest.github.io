/**
 * TxtReaderEngine.js - VERSION EMERGENCIA
 * Objetivo: Solo renderizar el texto correctamente.
 */
export class TxtReaderEngine {
  constructor(options) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.container = options.container || this.canvas.parentElement;
    this.dpi = 96;
    this.FONT_FAMILY = "Arial";
    
    // Valores básicos para evitar crashes
    this.resources = {};
    this.config = {};
    this.allLines = [];
  }

  ptToPx(pt) { return (pt * this.dpi) / 72; }

  async load(txtContent, configUrl) {
    this.lastTextContent = txtContent;
    // Omitimos carga de banners por ahora para asegurar que el texto funcione
    this._processText(txtContent);
    this.render();
  }

  _parsePythonArray(text) {
    try {
      // Convertimos True/False a true/false y evaluamos
      const formatted = text.replace(/\\bTrue\\b/g, 'true').replace(/\\bFalse\\b/g, 'false');
      return new Function(`return ${formatted}`)();
    } catch (e) {
      console.error("ERROR CRÍTICO PARSEANDO ARRAY:", e);
      return null;
    }
  }

  _processText(text) {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const maxContentWidth = availableWidth - 40; // Margen simple de 20px

    const data = this._parsePythonArray(text);
    if (!data || !Array.isArray(data)) {
      console.error("El texto no es un array válido");
      return;
    }

    const lines = [];
    let currentLineFragments = [];
    let currentX = 0;

    for (const frag of data) {
      const text = frag.texto || "";
      const size = this.ptToPx(frag.tamano || 12);
      
      // Dividimos por saltos de línea explícitos
      const parts = text.split('\\n');

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === '' && i > 0) {
          // Salto de línea vacío
          if (currentLineFragments.length > 0) {
            lines.push({ fragments: currentLineFragments, height: size * 1.4 });
            currentLineFragments = [];
            currentX = 0;
          }
          lines.push({ fragments: [], height: size * 1.4, isSpacer: true });
          continue;
        }

        // Dividimos en palabras para el wrapping
        const words = part.split(' ');
        for (let w = 0; w < words.length; w++) {
          const word = words[w] + (w < words.length - 1 ? ' ' : '');
          this.ctx.font = `${size}px ${this.FONT_FAMILY}`;
          const wordWidth = this.ctx.measureText(word).width;

          if (currentX + wordWidth > maxContentWidth && currentLineFragments.length > 0) {
            lines.push({ fragments: currentLineFragments, height: size * 1.4 });
            currentLineFragments = [];
            currentX = 0;
          }

          currentLineFragments.push({ ...frag, texto: word });
          currentX += wordWidth;
        }
      }
    }

    if (currentLineFragments.length > 0) {
      lines.push({ fragments: currentLineFragments, height: 20 });
    }

    this.allLines = lines;
  }

  render() {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const dpr = window.devicePixelRatio || 1;

    // Calculamos altura total
    let totalH = 40; 
    this.allLines.forEach(l => totalH += l.height || 20);
    totalH += 40;

    this.canvas.width = Math.round(availableWidth * dpr);
    this.canvas.height = Math.round(totalH * dpr);
    this.canvas.style.width = `${availableWidth}px`;
    this.canvas.style.height = `${totalH}px`;

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
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
    ctx.restore();
  }

  fitToContainer() { this.render(); }
  get numPages() { return 1; }
  async getPage(pageNum) { return { num: pageNum, render: () => this.render() }; }
}