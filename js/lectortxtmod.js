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
    const availableWidth = this.container ? this.container.clientWidth : window.innerWidth;
    const maxContentWidth = availableWidth - (this.settings.marginLeft * 2);

    const data = this._parsePythonArray(text);
    if (!data || !Array.isArray(data)) {
      this.allLines = [];
      this.pages = [];
      return;
    }

    const allLines = [];

    for (const frag of data) {
      const sizePx = this.ptToPx(frag.tamano || this.settings.defaultFontSize);
      const lineHeightPx = sizePx * this.LINE_HEIGHT_RATIO;
      
      // Normalización de saltos de línea: convertimos literales \n en saltos reales
      let textStr = (frag.texto || "").replace(/\\n/g, '\n');
      const parts = textStr.split(/\r?\n/);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // MANEJO DE SALTOS DE LÍNEA
        if (part === '' && i > 0) {
          // Salto doble = Párrafo (espacio extra)
          if (i + 1 < parts.length && parts[i+1] === '') {
            allLines.push({ fragments: [], height: lineHeightPx * this.settings.paragraphSpacingRatio, isSpacer: true });
            i++; 
          } else {
            // Salto simple = Nueva línea vacía (ocupa altura estándar)
            allLines.push({ fragments: [], height: lineHeightPx, isSpacer: false });
          }
          continue;
        }

        if (part.length > 0) {
          this.ctx.font = `${sizePx}px ${this.FONT_FAMILY}`;
          
          // Word Wrap: Solo si la línea excede el ancho máximo permitido
          if (this.ctx.measureText(part).width > maxContentWidth) {
            const words = part.split(' ');
            let currentLineFragments = [];
            let currentX = 0;

            for (let w = 0; w < words.length; w++) {
              const word = words[w] + (w < words.length - 1 ? ' ' : '');
              const wordWidth = this.ctx.measureText(word).width;

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
            // La línea cabe entera: se añade directamente sin fragmentar palabras
            allLines.push({ 
              fragments: [{ ...frag, texto: part }], 
              height: lineHeightPx 
            });
          }
        }
      }
    }

    this.allLines = allLines;
    
    // PAGINACIÓN INTERNA (Para evitar colapsos de memoria en canvas gigantes)
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
    
    // Para el scroll infinito, dibujamos TODAS las líneas procesadas en un único canvas largo
    const allLinesToRender = this.allLines || [];

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

          // Soporte para Superíndices y Subíndices
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

          // Dibujar texto con desplazamiento vertical si es índice
          ctx.fillText(frag.texto, x, y + offsetY);

          // Soporte para Subrayado
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
      getViewport: () => ({
        width: this.canvas.width,
        height: this.canvas.height
      }),
      render: () => this.render(),
      getTextContent: async () => ({ items: [] })
    };
  }

  fitToContainer() { this.render(); }
  get numPages() { return 1; } // Retorna 1 para mantener la ilusión de scroll infinito
}