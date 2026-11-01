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
    let currentLineFragments = [];
    let currentLineWidth = 0;

    const getLineHeight = (frags) => {
      let maxPt = this.settings.defaultFontSize;
      for (const f of frags) {
        if (f.tamano && f.tamano > maxPt) maxPt = f.tamano;
      }
      return this.ptToPx(maxPt) * this.LINE_HEIGHT_RATIO;
    };

    const flushLine = (frags, isSpacer = false, customHeight = null) => {
      const height = customHeight !== null ? customHeight : (frags.length > 0 ? getLineHeight(frags) : this.settings.lineHeightDefault);
      allLines.push({ fragments: [...frags], height, isSpacer });
    };

    for (const frag of data) {
      // Normalizamos los \n literales a saltos reales
      let textStr = (frag.texto || "").replace(/\\n/g, '\n');
      
      // Si el texto está vacío pero tiene formato/estilo, lo ignoramos o gestionamos si procede
      if (textStr === '') continue;

      // Partimos por saltos de línea reales para respetar los \n y \n\n
      const parts = textStr.split(/(\r?\n)/);

      for (let p = 0; p < parts.length; p++) {
        const part = parts[p];
        if (part === '') continue;

        if (part === '\n' || part === '\r\n') {
          // Es un salto de línea real
          if (currentLineFragments.length > 0) {
            flushLine(currentLineFragments);
            currentLineFragments = [];
            currentLineWidth = 0;
          }

          // Comprobamos si hay saltos múltiples (párrafo) mirando si el siguiente parte también es salto o si el texto acumulaba \n\n
          const baseSizePx = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
          flushLine([], false, baseSizePx * this.LINE_HEIGHT_RATIO);
          continue;
        }

        // Si hay un salto doble explícito en el texto
        if (part.includes('\n\n')) {
          // Lo manejamos dividiendo por palabras normalmente pero respetando el flujo
        }

        // Dividimos el texto de este fragmento por palabras para el word wrap
        const words = part.split(' ');
        for (let w = 0; w < words.length; w++) {
          const word = words[w] + (w < words.length - 1 ? ' ' : '');
          if (word === '') continue;

          const sizePx = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
          const weight = frag.negrita ? 'bold' : 'normal';
          const style = frag.cursiva ? 'italic' : 'normal';
          
          this.ctx.font = `${style} ${weight} ${sizePx}px ${this.FONT_FAMILY}`;
          const wordWidth = this.ctx.measureText(word).width;

          // Si nos pasamos del ancho máximo, cerramos la línea actual (Word Wrap)
          if (currentLineWidth + wordWidth > maxContentWidth && currentLineFragments.length > 0) {
            flushLine(currentLineFragments);
            currentLineFragments = [];
            currentLineWidth = 0;
          }

          // Agrupamos con el fragmento anterior si comparte exactamente el mismo estilo,
          // de lo contrario creamos un nuevo fragmento dentro de la misma línea visual.
          const lastFrag = currentLineFragments[currentLineFragments.length - 1];
          const isSameStyle = lastFrag &&
            lastFrag.tamano === frag.tamano &&
            lastFrag.negrita === frag.negrita &&
            lastFrag.cursiva === frag.cursiva &&
            lastFrag.subrayado === frag.subrayado &&
            lastFrag.superindice === frag.superindice &&
            lastFrag.subindice === frag.subindice &&
            lastFrag.color === frag.color;

          if (isSameStyle) {
            lastFrag.texto += word;
          } else {
            currentLineFragments.push({ ...frag, texto: word });
          }

          currentLineWidth += wordWidth;
        }
      }
    }

    if (currentLineFragments.length > 0) {
      flushLine(currentLineFragments);
    }

    this.allLines = allLines;
    
    // PAGINACIÓN INTERNA
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