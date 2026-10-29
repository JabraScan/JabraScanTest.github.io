/**
 * TxtReaderEngine.js
 * Motor de lectura de archivos TXT para SPA en Canvas A4
 * Compatible con Modo Paginado y Modo Scroll Infinito
 */
export class TxtReaderEngine {
  static STYLE_CONFIGS = {
    'H1':   { sizePt: 20, bold: true,  align: 'center', spaceBefore: 18, spaceAfter: 4,  color: '#111111' },
    'H2':   { sizePt: 16, bold: true,  align: 'center', spaceBefore: 8,  spaceAfter: 4,  color: '#111111' },
    'H3':   { sizePt: 12, bold: true,  align: 'left',   spaceBefore: 8,  spaceAfter: 4,  color: '#0056b3' },
    'CITA': { sizePt: 11, italic: true, align: 'center', spaceBefore: 18, spaceAfter: 18, color: '#0056b3', indentCm: 1.52 },
    'BODY': { sizePt: 11, bold: false, align: 'left',   spaceBefore: 0,  spaceAfter: 0,  color: '#111111' }
  };

  constructor(options) {
    if (!options.canvas) throw new Error("Se requiere un elemento Canvas.");
   
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.container = options.container || this.canvas.parentElement;
    this.clave = options.clave || "";
    this.capitulo = parseInt(options.capitulo, 10) || 1;

    this.PAGE_WIDTH_CM = 21.0;
    this.PAGE_HEIGHT_CM = 29.7;
    this._updateResponsiveLayoutMetrics();
    this.MARGIN_CM = 3.0;

    this.FONT_FAMILY = "Arial, sans-serif";
    this.LINE_HEIGHT_RATIO = 1.45;

    this.dpi = options.dpi || 96;
    this.scale = 1.0; 
    this.pages = [];  
    this.currentPageIndex = 0;
    
    // Control de Scroll Infinito (por defecto respetando el parámetro del usuario)
    this.isInfiniteScroll = options.isInfiniteScroll !== undefined ? options.isInfiniteScroll : false;

    this.config = null;
    this.resources = {
      headerImg: null,
      footerImg: null
    };

    this.linkOverlay = null;
    this._initLinkOverlay();
    
    // CONTROL RESTAURADO: Solo altera el CSS si el scroll infinito está explícitamente activo
    if (this.container && this.isInfiniteScroll) {
      this.container.style.overflowY = 'auto';
    }
  }

  _updateResponsiveLayoutMetrics() {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const isMobile = availableWidth < 768;
    
    this.MARGIN_X_CM = isMobile ? 1.2 : 3.0;
    this.MARGIN_Y_CM = 3.0; 

    this.CONTENT_WIDTH_CM = this.PAGE_WIDTH_CM - (this.MARGIN_X_CM * 2);
    this.CONTENT_HEIGHT_CM = this.PAGE_HEIGHT_CM - (this.MARGIN_Y_CM * 2);
    
    this.fontScaleFactor = isMobile ? 1.45 : 1.0;
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

  cmToPx(cm) {
    return (cm * this.dpi) / 2.54;
  }

  ptToPx(pt) {
    return (pt * this.dpi) / 72;
  }

  async load(txtContent, configUrl) {
    this.lastTextContent = txtContent;
    let fetchedConfig = {};

    if (configUrl && typeof configUrl === 'string') {
      try {
        const res = await fetch(configUrl);
        const data = await res.json();
        if (data && typeof data === 'object') {
          fetchedConfig = data;
        }
      } catch (e) {}
    }

    const validFetchedConfig = Object.fromEntries(
      Object.entries(fetchedConfig).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );

    this.config = {
      ...this.DEFAULT_CONFIG,
      ...validFetchedConfig
    };

    await this._loadResources();
    this._paginate(txtContent);
    this.currentPageIndex = 0;

    this.fitToContainer();

    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
      const currentWidth = window.innerWidth;
      const isZoomed = window.visualViewport && window.visualViewport.scale !== 1;

      if (currentWidth !== lastWidth && !isZoomed) {
        lastWidth = currentWidth;
        this._updateResponsiveLayoutMetrics();
        this._paginate(txtContent);
        this.fitToContainer();
      }
    });

    this.render();
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

  _parseBlockTag(rawParagraph) {
    const match = rawParagraph.match(/^\[(H1|H2|H3|CITA)\]([\s\S]*?)\[\/\1\]$/);
    if (match) {
      return { type: match[1], text: match[2].trim() };
    }
    return { type: 'BODY', text: rawParagraph.trim() };
  }

  /**
   * Paginación A4 original (se usa SIEMPRE para mantener las páginas idénticas en ambos modos)
   */
  _paginate(text) {
    const maxContentWidthPx = this.cmToPx(this.CONTENT_WIDTH_CM);
    const maxContentHeightPx = this.cmToPx(this.CONTENT_HEIGHT_CM);

    const lines = [];
    const rawParagraphs = text.replace(/\r\n/g, '\n').split('\n');

    for (let pIndex = 0; pIndex < rawParagraphs.length; pIndex++) {
      const rawP = rawParagraphs[pIndex];
      
      if (rawP.trim() === '') {
        const bodyCfg = TxtReaderEngine.STYLE_CONFIGS['BODY'];
        const effectiveSizePt = bodyCfg.sizePt * (this.fontScaleFactor || 1.0);
        const hPx = this.ptToPx(effectiveSizePt) * this.LINE_HEIGHT_RATIO;
        lines.push({ text: '', height: hPx, type: 'BODY', spaceBefore: 0, spaceAfter: 0, chapter: this.capitulo });
        continue;
      }

      const { type, text: cleanParagraph } = this._parseBlockTag(rawP);      
      const style = TxtReaderEngine.STYLE_CONFIGS[type] || TxtReaderEngine.STYLE_CONFIGS['BODY'];
      const effectiveSizePt = style.sizePt * (this.fontScaleFactor || 1.0);
      const fontSizePx = this.ptToPx(effectiveSizePt);
      const lineHeightPx = fontSizePx * this.LINE_HEIGHT_RATIO;
      const spaceBeforePx = this.ptToPx(style.spaceBefore || 0);
      const spaceAfterPx = this.ptToPx(style.spaceAfter || 0);
      const indentPx = style.indentCm ? this.cmToPx(style.indentCm) : 0;
      const effectiveWidth = maxContentWidthPx - (indentPx * 2);

      if (spaceBeforePx > 0) {
        lines.push({ text: '', height: spaceBeforePx, type: 'SPACER' });
      }

      const fontStyleStr = `${style.italic ? 'italic' : 'normal'} ${style.bold ? 'bold' : 'normal'} ${fontSizePx}px ${this.FONT_FAMILY}`;
      this.ctx.font = fontStyleStr;

      const words = cleanParagraph.split(' ');
      let currentLineWords = [];

      for (let w = 0; w < words.length; w++) {
        const testWords = [...currentLineWords, words[w]];
        const metrics = this.ctx.measureText(testWords.join(' '));

        if (metrics.width > effectiveWidth && currentLineWords.length > 0) {
          lines.push({ 
            text: currentLineWords.join(' '), 
            height: lineHeightPx, 
            type: type,
            align: style.align,
            indent: indentPx,
            color: style.color,
            chapter: this.capitulo
          });
          currentLineWords = [words[w]];
        } else {
          currentLineWords = testWords;
        }
      }

      if (currentLineWords.length > 0) {
        lines.push({ 
          text: currentLineWords.join(' '), 
          height: lineHeightPx, 
          type: type,
          align: style.align,
          indent: indentPx,
          color: style.color,
          chapter: this.capitulo
        });
      }

      if (spaceAfterPx > 0) {
        lines.push({ text: '', height: spaceAfterPx, type: 'SPACER' });
      }
    }

    this.pages = [];
    let currentLinesPage = [];
    let currentPageHeight = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (currentPageHeight + line.height > maxContentHeightPx && currentLinesPage.length > 0) {
        this.pages.push(currentLinesPage);
        currentLinesPage = [line];
        currentPageHeight = line.height;
      } else {
        currentLinesPage.push(line);
        currentPageHeight += line.height;
      }
    }

    if (currentLinesPage.length > 0) {
      this.pages.push(currentLinesPage);
    }

    if (this.pages.length === 0) {
      this.pages.push([]);
    }
  }

  _drawInlineText(ctx, text, startX, y, baseFontSize, baseFontFamily, defaultColor, isItalicBlock = false, isBoldBlock = false) {
    const regex = /(\[B\][\s\S]*?\[\/B\]|\[I\][\s\S]*?\[\/I\]|\[U\][\s\S]*?\[\/U\]|\[SUP\][\s\S]*?\[\/SUP\]|\[EM\][\s\S]*?\[\/EM\])/g;
    const parts = text.split(regex);
    let currentX = startX;

    parts.forEach(part => {
      if (!part) return;

      let style = isItalicBlock ? 'italic' : 'normal';
      let weight = isBoldBlock ? 'bold' : 'normal';
      let color = defaultColor;
      let isUnderline = false;
      let isSup = false;
      let cleanText = part;

      if (part.startsWith('[B]') && part.endsWith('[/B]')) {
        weight = 'bold';
        cleanText = part.slice(3, -4);
      } else if (part.startsWith('[I]') && part.endsWith('[/I]')) {
        style = 'italic';
        cleanText = part.slice(3, -4);
      } else if (part.startsWith('[U]') && part.endsWith('[/U]')) {
        isUnderline = true;
        cleanText = part.slice(3, -4);
      } else if (part.startsWith('[SUP]') && part.endsWith('[/SUP]')) {
        isSup = true;
        cleanText = part.slice(3, -4);
      } else if (part.startsWith('[EM]') && part.endsWith('[/EM]')) {
        style = 'italic';
        color = TxtReaderEngine.STYLE_CONFIGS['H3'].color;
        cleanText = part.slice(4, -5);
      }

      const fontSize = isSup ? baseFontSize * 0.65 : baseFontSize;
      const offsetY = isSup ? fontSize * 0.4 : 0;

      ctx.font = `${style} ${weight} ${fontSize}px ${baseFontFamily}`;
      ctx.fillStyle = color;
      ctx.fillText(cleanText, currentX, y - offsetY);

      if (isUnderline) {
        const metrics = ctx.measureText(cleanText);
        ctx.fillRect(currentX, y + baseFontSize + 2, metrics.width, 1);
      }

      currentX += ctx.measureText(cleanText).width;
    });
  }

  _drawBanner(ctx, img, baseWidthPx, baseHeightPx, marginPx, isHeader) {
    if (!img) return;
    const maxH = marginPx * 0.9; 
    const aspect = img.width / img.height;
    const maxW = baseWidthPx; 
    
    let drawH = maxH;
    let drawW = drawH * aspect;

    if (drawW > maxW) {
      drawW = maxW;
      drawH = drawW / aspect;
    }

    const drawX = Math.round((baseWidthPx - drawW) / 2);
    const drawY = isHeader ? 0 : Math.round(baseHeightPx - drawH);
    
    ctx.drawImage(img, drawX, drawY, Math.round(drawW), Math.round(drawH));
  }

  render(pageNum = this.currentPageIndex + 1, scale = this.scale) {
    if (this.isInfiniteScroll) {
      this.renderInfiniteScroll(scale);
    } else {
      this.renderPage(pageNum, scale);
    }
  }

  /**
   * Renderizado continuo de todas las páginas A4 verticalmente
   */
  renderInfiniteScroll(scale = this.scale) {
    this.scale = scale;

    const baseWidthPx = this.cmToPx(this.PAGE_WIDTH_CM);
    const singlePageHeightPx = this.cmToPx(this.PAGE_HEIGHT_CM);
    const totalPages = this.pages.length;
    const totalHeightPx = singlePageHeightPx * totalPages;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.round(baseWidthPx * this.scale * dpr);
    this.canvas.height = Math.round(totalHeightPx * this.scale * dpr);

    this.canvas.style.width = `${Math.round(baseWidthPx * this.scale)}px`;
    this.canvas.style.height = `${Math.round(totalHeightPx * this.scale)}px`;

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.scale * dpr, this.scale * dpr);

    // Fondo blanco general
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, baseWidthPx, totalHeightPx);

    const marginPx = this.cmToPx(this.MARGIN_CM);
    const textStartX = this.cmToPx(this.MARGIN_X_CM);
    const textStartY = this.cmToPx(this.MARGIN_Y_CM);

    this.pages.forEach((pageLines, pageIndex) => {
      const offsetY = pageIndex * singlePageHeightPx;
      const pageChapter = pageLines.length > 0 && pageLines[0].chapter ? pageLines[0].chapter : this.capitulo;

      ctx.save();
      ctx.translate(0, offsetY);

      // Fondo de la página individual
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, baseWidthPx, singlePageHeightPx);

      // Cabecera por página
      const activeHeaderImg = this._getBannerByChapter(this.config?.headerChapters, this.resources.headerImg, pageChapter);
      this._drawBanner(ctx, activeHeaderImg, baseWidthPx, singlePageHeightPx, marginPx, true);

      ctx.textBaseline = "top";
      let currentY = textStartY;

      pageLines.forEach((line) => {
        if (line.type === 'SPACER') {
          currentY += line.height;
          return;
        }

        const style = TxtReaderEngine.STYLE_CONFIGS[line.type] || TxtReaderEngine.STYLE_CONFIGS['BODY'];
        const effectiveSizePt = style.sizePt * (this.fontScaleFactor || 1.0);
        const fontSizePx = this.ptToPx(effectiveSizePt);

        let drawX = textStartX + (line.indent || 0);
        if (line.align === 'center') {
          const cleanStr = line.text.replace(/\[\/?(B|I|U|SUP|EM)\]/g, '');
          ctx.font = `${style.italic ? 'italic' : 'normal'} ${style.bold ? 'bold' : 'normal'} ${fontSizePx}px ${this.FONT_FAMILY}`;
          const totalW = ctx.measureText(cleanStr).width;
          drawX = textStartX + ((this.cmToPx(this.CONTENT_WIDTH_CM) - totalW) / 2);
        }

        this._drawInlineText(
          ctx, 
          line.text, 
          drawX, 
          currentY, 
          fontSizePx, 
          this.FONT_FAMILY, 
          line.color || style.color, 
          !!style.italic, 
          !!style.bold
        );

        currentY += line.height;
      });

      // Pie por página
      const activeFooterImg = this._getBannerByChapter(this.config?.footerChapters, this.resources.footerImg, pageChapter);
      this._drawBanner(ctx, activeFooterImg, baseWidthPx, singlePageHeightPx, marginPx, false);

      ctx.restore();
    });

    if (this.linkOverlay) {
      this.linkOverlay.innerHTML = '';
    }

    ctx.restore();
  }

  renderPage(pageNum, scale = this.scale) {
    if (this.isInfiniteScroll) {
      return this.renderInfiniteScroll(scale);
    }

    if (pageNum < 1 || pageNum > this.pages.length) return;
    this.currentPageIndex = pageNum - 1;
    this.scale = scale;

    const baseWidthPx = this.cmToPx(this.PAGE_WIDTH_CM);
    const baseHeightPx = this.cmToPx(this.PAGE_HEIGHT_CM);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.round(baseWidthPx * this.scale * dpr);
    this.canvas.height = Math.round(baseHeightPx * this.scale * dpr);

    this.canvas.style.width = `${Math.round(baseWidthPx * this.scale)}px`;
    this.canvas.style.height = `${Math.round(baseHeightPx * this.scale)}px`;

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.scale * dpr, this.scale * dpr);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, baseWidthPx, baseHeightPx);

    const marginPx = this.cmToPx(this.MARGIN_CM);
    const textStartX = this.cmToPx(this.MARGIN_X_CM);
    const textStartY = this.cmToPx(this.MARGIN_Y_CM);

    const pageLines = this.pages[this.currentPageIndex] || [];
    const pageChapter = pageLines.length > 0 && pageLines[0].chapter ? pageLines[0].chapter : this.capitulo;

    const activeHeaderImg = this._getBannerByChapter(this.config?.headerChapters, this.resources.headerImg, pageChapter);
    this._drawBanner(ctx, activeHeaderImg, baseWidthPx, baseHeightPx, marginPx, true);

    ctx.textBaseline = "top";
    let currentY = textStartY;

    pageLines.forEach((line) => {
      if (line.type === 'SPACER') {
        currentY += line.height;
        return;
      }

      const style = TxtReaderEngine.STYLE_CONFIGS[line.type] || TxtReaderEngine.STYLE_CONFIGS['BODY'];
      const effectiveSizePt = style.sizePt * (this.fontScaleFactor || 1.0);
      const fontSizePx = this.ptToPx(effectiveSizePt);

      let drawX = textStartX + (line.indent || 0);
      if (line.align === 'center') {
        const cleanStr = line.text.replace(/\[\/?(B|I|U|SUP|EM)\]/g, '');
        ctx.font = `${style.italic ? 'italic' : 'normal'} ${style.bold ? 'bold' : 'normal'} ${fontSizePx}px ${this.FONT_FAMILY}`;
        const totalW = ctx.measureText(cleanStr).width;
        drawX = textStartX + ((this.cmToPx(this.CONTENT_WIDTH_CM) - totalW) / 2);
      }

      this._drawInlineText(
        ctx, 
        line.text, 
        drawX, 
        currentY, 
        fontSizePx, 
        this.FONT_FAMILY, 
        line.color || style.color, 
        !!style.italic, 
        !!style.bold
      );

      currentY += line.height;
    });

    const footerStartY = baseHeightPx - marginPx;
    const activeFooterImg = this._getBannerByChapter(this.config?.footerChapters, this.resources.footerImg, pageChapter);
    this._drawBanner(ctx, activeFooterImg, baseWidthPx, baseHeightPx, marginPx, false);

    this._updateLinkOverlay(baseWidthPx, baseHeightPx, footerStartY, marginPx);

    ctx.restore();
  }

  _initLinkOverlay() {
    this.linkOverlay = document.createElement('div');
    this.linkOverlay.style.position = 'absolute';
    this.linkOverlay.style.pointerEvents = 'none'; 
    if (this.container.style.position !== 'relative' && this.container.style.position !== 'absolute') {
      this.container.style.position = 'relative';
    }
    this.container.appendChild(this.linkOverlay);
  }

  _updateLinkOverlay(baseWidthPx, baseHeightPx, footerStartY, marginPx) {
    if (this.isInfiniteScroll) return;
    this.linkOverlay.innerHTML = '';
    
    const pageLines = this.pages[this.currentPageIndex] || [];
    const pageChapter = pageLines.length > 0 && pageLines[0].chapter ? pageLines[0].chapter : 1;
    const activeFooterImg = this._getBannerByChapter(this.config?.footerChapters, this.resources.footerImg, pageChapter);

    if (activeFooterImg) return;

    const linkUrl = this.config?.footerLinkUrl;
    const linkText = this.config?.footerLinkText;

    if (!linkText) return;

    this.linkOverlay.style.left = `${this.canvas.offsetLeft}px`;
    this.linkOverlay.style.top = `${this.canvas.offsetTop}px`;
    this.linkOverlay.style.width = `${this.canvas.offsetWidth}px`;
    this.linkOverlay.style.height = `${this.canvas.offsetHeight}px`;

    const isLink = linkUrl && linkUrl.trim() !== "";
    const linkAnchor = document.createElement(isLink ? 'a' : 'span');
    
    if (isLink) {
      linkAnchor.href = linkUrl;
      linkAnchor.target = "_blank";
      linkAnchor.rel = "noopener noreferrer";
      linkAnchor.style.textDecoration = 'underline';
      linkAnchor.style.pointerEvents = 'auto';
      linkAnchor.style.cursor = 'pointer';
    } else {
      linkAnchor.style.pointerEvents = 'none';
    }

    linkAnchor.innerText = linkText;
    linkAnchor.style.position = 'absolute';
    linkAnchor.style.left = '50%';
    linkAnchor.style.transform = 'translateX(-50%)';
    
    const topPercent = ((footerStartY + (marginPx * 0.6)) / baseHeightPx) * 100;
    linkAnchor.style.top = `${topPercent}%`;
    linkAnchor.style.fontFamily = this.FONT_FAMILY;
    linkAnchor.style.fontSize = `${12 * this.scale}px`;
    linkAnchor.style.color = '#0056b3';

    this.linkOverlay.appendChild(linkAnchor);
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

  getTotalPages() {
    return this.pages.length;
  }

  getCurrentPage() {
    return this.currentPageIndex + 1;
  }

  nextPage() {
    if (!this.isInfiniteScroll && this.currentPageIndex < this.pages.length - 1) {
      this.renderPage(this.currentPageIndex + 2);
    }
  }

  previousPage() {
    if (!this.isInfiniteScroll && this.currentPageIndex > 0) {
      this.renderPage(this.currentPageIndex);
    }
  }

  get numPages() {
    return this.pages.length;
  }

  async getPage(pageNum) {
    const pageIndex = pageNum - 1;
    const pageLines = this.pages[pageIndex] || [];
    
    return {
      num: pageNum,
      getViewport: (params) => {
        const baseWidthPx = this.cmToPx(this.PAGE_WIDTH_CM);
        const baseHeightPx = this.cmToPx(this.PAGE_HEIGHT_CM);
        const scale = params.scale || 1.0;
        return {
          width: baseWidthPx * scale,
          height: baseHeightPx * scale
        };
      },
      render: (renderContext) => {
        this.render(pageNum, renderContext.viewport ? (renderContext.viewport.width / this.cmToPx(this.PAGE_WIDTH_CM)) : 1.0);
      },
      getTextContent: async () => {
        return {
          items: pageLines.map(line => ({ str: line.text }))
        };
      }
    };
  }

  fitToContainer() {
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const baseWidthPx = this.cmToPx(this.PAGE_WIDTH_CM);

    if (availableWidth > 0 && availableWidth < baseWidthPx) {
      this.scale = availableWidth / baseWidthPx;
    } else {
      this.scale = 1.0; 
    }

    this.render();
  }

  /**
   * Método público para alternar dinámicamente entre modo paginado y scroll infinito
   */
  setInfiniteScroll(enabled) {
    this.isInfiniteScroll = !!enabled;
    
    if (this.container) {
      if (this.isInfiniteScroll) {
        this.container.style.overflowY = 'auto';
      } else {
        this.container.style.overflowY = 'hidden';
      }
    }

    this.render();
  }
}