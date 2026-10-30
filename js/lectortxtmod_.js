// lectortxtmod.js
const TAMANO_BASE         = 11;
const INTERLINEADO_EXTRA  = 9;
const FACTOR_INTERLINEADO = 1.3;
const MARGEN_CM           = 3.0;
const MARGEN_CM_MOBILE    = 1.2;

function esPantallaPequena() {
  return window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

function cmAPx(cm) {
  return cm * 37.7952755906; // 1 cm ≈ 37.8 px
}

function cargarImagen(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function obtenerUrlBanner(baseUrl, bannerArray, chaptersArray, fallbackUrl, capituloActual) {
  const index = chaptersArray.indexOf(capituloActual);
  if (index !== -1 && bannerArray[index]) {
    return `${baseUrl}${bannerArray[index]}`;
  }
  return fallbackUrl || null;
}

export function TxtReaderEngine(options) {
  const {
    canvas,
    clave = "",
    configuracion = {},
    capitulo = 0
  } = options;

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Se requiere un elemento HTMLCanvasElement válido.');
  }

  const controlesPdf = document.querySelector('.pdf-controls');
  if (controlesPdf) {
    controlesPdf.style.setProperty('display', 'none', 'important');
  }

  let cachedBloques = [];
  let config = {};
  
  // Guardará la maquetación calculada (líneas formateadas y posiciones Y)
  let lineasProcesadas = [];
  let altoContenidoCalculado = 0;

  /**
   * PROCESADO / MAQUETACIÓN EN UNA SOLA PASADA
   * Procesa el texto crudo, divide líneas/palabras y guarda coordenadas de dibujado.
   */
  function maquetarTexto(anchoCanvas) {
    lineasProcesadas = [];
    
    let fuenteBase = 'Arial';
    let tamanoBase = TAMANO_BASE;

    const esMovil = esPantallaPequena();
    const margenPx = cmAPx(esMovil ? MARGEN_CM_MOBILE : MARGEN_CM);
    const anchoMaximo = anchoCanvas - (margenPx * 2);

    const canvasTemp = document.createElement('canvas');
    const ctxTemp = canvasTemp.getContext('2d');

    let posX = margenPx;
    let posY = margenPx + (tamanoBase * FACTOR_INTERLINEADO);

    cachedBloques.forEach(bloque => {
      if (bloque.fuente) fuenteBase = bloque.fuente;
      if (bloque.tamano) tamanoBase = bloque.tamano;

      let tamanoRender = tamanoBase;
      let desfasadorY = 0;

      if (bloque.superindice) {
        tamanoRender = tamanoBase * 0.7;
        desfasadorY = -(tamanoBase * 0.35);
      } else if (bloque.subindice) {
        tamanoRender = tamanoBase * 0.7;
        desfasadorY = tamanoBase * 0.2;
      }

      let estiloStr = '';
      if (bloque.negrita) estiloStr += 'bold ';
      if (bloque.cursiva) estiloStr += 'italic ';

      ctxTemp.font = `${estiloStr}${tamanoRender}pt ${fuenteBase}`;

      let colorHex = '#000000';
      if (bloque.color && bloque.color !== "000000" && bloque.color !== "#000000") {
        colorHex = bloque.color.startsWith('#') ? bloque.color : `#${bloque.color}`;
      }

      const lineas = bloque.texto.split('\n');

      lineas.forEach((linea, indexLinea) => {
        if (indexLinea > 0) {
          posY += (tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA;
          posX = margenPx;
        }

        if (linea.length === 0) return;

        const palabras = linea.split(' ');

        palabras.forEach((palabra, indexPalabra) => {
          const textoAEscribir = (indexPalabra === 0 && posX === margenPx) ? palabra : ' ' + palabra;
          const anchoTexto = ctxTemp.measureText(textoAEscribir).width;

          if (posX + anchoTexto > margenPx + anchoMaximo && posX > margenPx) {
            posY += (tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA;
            posX = margenPx;
            const nuevoAncho = ctxTemp.measureText(palabra).width;

            lineasProcesadas.push({
              texto: palabra,
              x: posX,
              y: posY + desfasadorY,
              font: `${estiloStr}${tamanoRender}pt ${fuenteBase}`,
              color: colorHex,
              subrayado: !!bloque.subrayado,
              ancho: nuevoAncho,
              grosorSubrayado: Math.max(1, tamanoRender / 12)
            });

            posX += nuevoAncho;
          } else {
            lineasProcesadas.push({
              texto: textoAEscribir,
              x: posX,
              y: posY + desfasadorY,
              font: `${estiloStr}${tamanoRender}pt ${fuenteBase}`,
              color: colorHex,
              subrayado: !!bloque.subrayado,
              ancho: anchoTexto,
              grosorSubrayado: Math.max(1, tamanoRender / 12)
            });

            posX += anchoTexto;
          }
        });
      });

      posY += (tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA;
      posX = margenPx;
    });

    altoContenidoCalculado = posY;
  }

  return {
    numPages: 1,

    async load(txtContent, configPath = "") {
      try {
        let contenidoLimpio = txtContent;
        if (typeof txtContent === 'string') {
          contenidoLimpio = txtContent.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
          cachedBloques = eval(contenidoLimpio);
        } else {
          cachedBloques = txtContent;
        }
      } catch (e) {
        console.error("Error al parsear el contenido del capítulo:", e);
        cachedBloques = [];
      }

      config = {
        headerbaseUrl: `https://img.jabrascan.net/${clave}/`,
        headerBannerUrl: [`header.webp`],
        headerChapters: [0],
        headerBannerUrlFallback: null,

        footerbaseUrl: `https://img.jabrascan.net/${clave}/`,
        footerBannerUrl: [`footer.webp`],
        footerChapters: [0],
        footerBannerUrlFallback: `https://img.jabrascan.net/main/JabraRexScan02-3w.webp`,
        
        footerLinkUrl: "", 
        footerLinkText: "https://jabrascan.net",
        ...configuracion
      };
    },

    async getPage(num) {
      return {
        numPages: 1,

        getViewport({ scale = 1.0 } = {}) {
          const container = canvas.parentElement;
          const width = container ? container.clientWidth || 800 : 800;

          // 1. Procesa y calcula las coordenadas una sola vez según el ancho actual
          maquetarTexto(width);

          // 2. Calcula la altura real sumando márgenes/banners
          const altoTotalReal = Math.ceil(300 + altoContenidoCalculado + 200);

          return {
            width: width,
            height: Math.max(800, altoTotalReal),
            scale: scale
          };
        },

        async render(params) {
          const { canvasContext: ctx, viewport } = params;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const urlHeader = obtenerUrlBanner(config.headerbaseUrl, config.headerBannerUrl, config.headerChapters, config.headerBannerUrlFallback, capitulo);
          const urlFooter = obtenerUrlBanner(config.footerbaseUrl, config.footerBannerUrl, config.footerChapters, config.footerBannerUrlFallback, capitulo);

          const [imgHeader, imgFooter] = await Promise.all([
            cargarImagen(urlHeader),
            cargarImagen(urlFooter)
          ]);

          let altoHeader = 0;
          if (imgHeader) {
            const proporcion = canvas.width / imgHeader.width;
            altoHeader = imgHeader.height * proporcion;
            ctx.drawImage(imgHeader, 0, 0, canvas.width, altoHeader);
          }

          const desfasajeHeader = altoHeader > 0 ? altoHeader : 0;

          // DIBUJADO DIRECTO: Solo recorre los elementos procesados en la fase de maquetación
          lineasProcesadas.forEach(elem => {
            const yFinal = elem.y + desfasajeHeader;

            ctx.font = elem.font;
            ctx.fillStyle = elem.color;
            ctx.fillText(elem.texto, elem.x, yFinal);

            if (elem.subrayado) {
              ctx.fillRect(elem.x, yFinal + 2, elem.ancho, elem.grosorSubrayado);
            }
          });

          // Render del footer en el punto Y final del contenido medido
          const posYFooter = altoContenidoCalculado + desfasajeHeader + (INTERLINEADO_EXTRA * 2);

          if (imgFooter) {
            let anchoFooter, altoFooter, xPos;
            const esMovil = esPantallaPequena();
            const margenPx = cmAPx(esMovil ? MARGEN_CM_MOBILE : MARGEN_CM);

            if ((imgFooter.width / imgFooter.height) <= 0.40) {
              let proporcion = margenPx / imgFooter.height;
              anchoFooter = imgFooter.width * proporcion;
              altoFooter = margenPx;
              xPos = (canvas.width - anchoFooter) / 2;
            } else {
              let proporcion = canvas.width / imgFooter.width;
              anchoFooter = canvas.width;
              altoFooter = imgFooter.height * proporcion;
              xPos = 0;
            }

            ctx.drawImage(imgFooter, xPos, posYFooter, anchoFooter, altoFooter);
          } else if (config.footerLinkText) {
            ctx.font = (TAMANO_BASE - 2) + 'pt Arial';
            ctx.fillStyle = config.footerLinkUrl ? '#0000FF' : '#555555';
            ctx.textAlign = 'center';
            ctx.fillText(config.footerLinkText, canvas.width / 2, posYFooter);
            ctx.textAlign = 'left';
          }
        },

        async getTextContent() {
          const items = cachedBloques.map(bloque => ({ str: bloque.texto }));
          return { items };
        }
      };
    }
  };
}