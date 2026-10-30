/**
 * TxtReaderEngine.js - VERSION ROBUSTA
 * Prioridad: Renderizado funcional del array de fragmentos.
 */
export class TxtReaderEngine {
  static DEFAULT_TEXT_STYLE = {
    fuente: "Arial",
    tamano: 14,
    color: "000000",
    negrita: false,
    cursiva: false,
    subrayado: false
  };

  constructor(options) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.container = options.container || this.canvas.parentElement;
    this.clave = options.clave || "";
    this.capitulo = options.capitulo || 1;

    this.FONT_FAMILY = "Arial, sans-serif";
    this.LINE_HEIGHT_RATIO = 1.4;
    this.dpi = 96;
    this.scale = 1.0;
    this.allLines = [];
    this.pages = [];
    this.currentPageIndex = 0;
    this.isInfiniteScroll = options.isInfiniteScroll || false;
    this.config = {
      headerbaseUrl: `https://img.jabrascan.net/${this.clave}/`,
      headerBannerUrl: [`header.webp`],
      footerbaseUrl: `https://img.jabrascan.net/${this.clave}/`,
      footerBannerUrl: [`footer.webp`],
    };
  }

  cmToPx(cm) { return (cm * this.dpi) / 2.54; }
  ptToPx(pt) { return (pt * this.dpi) / 72; }

  async load(txtContent, configUrl) {
    this.lastTextContent = txtContent;
    
    // Carga simple de config sin complicaciones
    try {
      if (configUrl) {
        const res = await fetch(configUrl);
        if (res.ok) {
          const data = await res.json();
          this.config = { ...this.config, ...data };
        }
      }
    } catch (e) { console.warn("Config fallback used"); }

    this._processText(txtContent);
    this.fitToContainer();
    this.render();
  }

  _parsePythonArray(text) {
    try {
      const formatted = text.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
      return new Function(`return ${formatted}`)();
    } catch (e) {
      console.error("Error parseando array:", e);
      return null;
    }
  }

  _processText(text) {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const marginX = this.cmToPx(2.0); 
    const maxContentWidth = availableWidth - (marginX * 2);

    const data = this._parsePythonArray(text);
    if (!data || !Array.isArray(data)) {
      console.error("Datos no válidos");
      return;
    }

    const lines = [];
    let currentLineFragments = [];
    let currentX = 0;
    let currentMaxH = 0;

    for (const frag of data) {
      const style = { ...TxtReaderEngine.DEFAULT_TEXT_STYLE, ...frag };
      const sizePx = this.ptToPx(style.tamano);
      this.ctx.font = `${style.cursiva ? 'italic' : ''} ${style.negrita ? 'bold' : ''} ${sizePx}px ${style.fuente}`;
      
      const text = frag.texto || "";
      const parts = text.split('\\n');

      for (let i = 0; i < parts.length; i++) {
        const partText = parts[i];
        if (partText === '' && i > 0) {
          // Salto de línea vacío
          if (currentLineFragments.length > 0) {
            lines.push({ fragments: currentLineFragments, height: currentMaxH });
            currentLineFragments = [];
            currentX = 0;
            currentMaxH = 0;
          }
          lines.push({ fragments: [], height: sizePx * this.LINE_HEIGHT_RATIO, type: 'SPACER' });
          continue;
        }

        const partWidth = this.ctx.measureText(partText).width;

        if (currentX + partWidth > maxContentWidth && currentLineFragments.length > 0) {
          lines.push({ fragments: currentLineFragments, height: currentMaxH });
          currentLineFragments = [];
          currentX = 0;
          currentMaxH = 0;
        }

        currentLineFragments.push({ ...style, texto: partText });
        currentX += partWidth;
        currentMaxH = Math.max(currentMaxH, sizePx * this.LINE_HEIGHT_RATIO);
      }
    }

    if (currentLineFragments.length > 0) {
      lines.push({ fragments: currentLineFragments, height: currentMaxH });
    }

    this.allLines = lines;
    
    // Paginación simple
    const pageHeightPx = this.cmToPx(29.7) - (this.cmToPx(3.0) * 2);
    this.pages = [];
    let currentPage = [];
    let currentH = 0;

    for (const line of lines) {
      if (currentH + line.height > pageHeightPx && currentPage.length > 0) {
        this.pages.push(currentPage);
        currentPage = [];
        currentH = 0;
      }
      currentPage.push(line);
      currentH += line.height;
    }
    if (currentPage.length > 0) this.pages.push(currentPage);
  }

  render(pageNum = 1) {
    if (this.isInfiniteScroll) {
      this.renderInfiniteScroll();
    } else {
      this.renderPage(pageNum);
    }
  }

  renderInfiniteScroll() {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const marginX = this.cmToPx(2.0);
    const marginY = this.cmToPx(2.0);

    let totalH = 0;
    this.allLines.forEach(l => totalH += l.height);

    this.canvas.width = availableWidth;
    this.canvas.height = totalH + (marginY * 2);
    this.canvas.style.width = `${availableWidth}px`;
    this.canvas.style.height = `${totalH + (marginY * 2)}px`;

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, availableWidth, totalH + (marginY * 2));
    ctx.textBaseline = "top";

    let y = marginY;
    this.allLines.forEach(line => {
      if (line.type === 'SPACER') {
        y += line.height;
        return;
      }
      let x = marginX;
      line.fragments.forEach(frag => {
        const sizePx = this.ptToPx(frag.tamano);
        ctx.font = `${frag.cursiva ? 'italic' : ''} ${frag.negrita ? 'bold' : ''} ${sizePx}px ${frag.fuente}`;
        ctx.fillStyle = frag.color ? `#${frag.color}` : "#000000";
        ctx.fillText(frag.texto, x, y);
        if (frag.subrayado) {
          ctx.fillRect(x, y + sizePx + 1, ctx.measureText(frag.texto).width, 1);
        }
        x += ctx.measureText(frag.texto).width;
      });
      y += line.height;
    });
    ctx.restore();
  }

  renderPage(pageNum) {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const pageHeight = this.cmToPx(29.7);
    const marginX = this.cmToPx(2.0);
    const marginY = this.cmToPx(2.0);

    this.canvas.width = availableWidth;
    this.canvas.height = pageHeight;
    this.canvas.style.width = `${availableWidth}px`;
    this.canvas.style.height = `${pageHeight}px`;

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, availableWidth, pageHeight);
    ctx.textBaseline = "top";

    const lines = this.pages[pageNum - 1] || [];
    let y = marginY;

    lines.forEach(line => {
      if (line.type === 'SPACER') {
        y += line.height;
        return;
      }
      let x = marginX;
      line.fragments.forEach(frag => {
        const sizePx = this.ptToPx(frag.tamano);
        ctx.font = `${frag.cursiva ? 'italic' : ''} ${frag.negrita ? 'bold' : ''} ${sizePx}px ${frag.fuente}`;
        ctx.fillStyle = frag.color ? `#${frag.color}` : "#000000";
        ctx.fillText(frag.texto, x, y);
        if (frag.subrayado) {
          ctx.fillRect(x, y + sizePx + 1, ctx.measureText(frag.texto).width, 1);
        }
        x += ctx.measureText(frag.texto).width;
      });
      y += line.height;
    });
    ctx.restore();
  }

  fitToContainer() {
    this.render();
  }

  get numPages() { return this.pages.length; }
  async getPage(pageNum) {
    return {
      num: pageNum,
      getViewport: () => ({ width: this.canvas.width, height: this.canvas.height }),
      render: () => this.render(pageNum),
      getTextContent: async () => ({ items: this.allLines.map(l => ({ str: "..." })) })
    };
  }
}