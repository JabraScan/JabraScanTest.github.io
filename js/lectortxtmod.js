// canvas-reader.js
TAMANO_BASE       = 11;
INTERLINEADO_EXTRA= 6;

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

/**
 * Motor para leer y renderizar texto optimizado en canvas con interfaz compatible con PDF.js.
 */
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

  let cachedBloques = [];
  let config = {};

  return {
    // Definimos una única página continua para que la SPA maneje los capítulos
    numPages: 1,

    async load(txtContent, configPath = "") {
      try {
        cachedBloques = typeof txtContent === 'string' ? eval(txtContent) : txtContent;
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
        footerBannerUrlFallback: `https://img.jabrascan.net/main/JabraRexScan02-150w.webp`,
        
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
          
          const esMovil = esPantallaPequena();
          const margenPx = cmAPx(esMovil ? 1.2 : 3.0);
          const anchoMaximo = width - (margenPx * 2);
          
          let tamanoBase = TAMANO_BASE;
          const interlineadoExtra = INTERLINEADO_EXTRA;
          let alturaEstimadaTexto = 0;

          cachedBloques.forEach(bloque => {
            if (bloque.tamano) tamanoBase = bloque.tamano;
            const lineas = bloque.texto.split('\n');
            lineas.forEach(() => {
              alturaEstimadaTexto += (tamanoBase * 1.3) + interlineadoExtra;
            });
          });

          const alturaTotal = 250 + alturaEstimadaTexto + 200;

          return {
            width: width,
            height: Math.max(800, alturaTotal),
            scale: scale
          };
        },

        async render(params) {
          const { canvasContext: ctx, viewport } = params;
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

          let fuenteBase = 'Arial';
          let tamanoBase = TAMANO_BASE;
          const interlineadoExtra = INTERLINEADO_EXTRA;

          const esMovil = esPantallaPequena();
          const margenPx = cmAPx(esMovil ? 1.2 : 3.0);
          
          // ANCHO MÁXIMO REAL: Ancho total menos margen izquierdo Y margen derecho
          const anchoMaximo = canvas.width - (margenPx * 2);

          let posX = margenPx;
          let posY = altoHeader + (tamanoBase * 1.3 * 2); 

          // Renderizado del texto respetando estrictamente ambos márgenes
          cachedBloques.forEach(bloque => {
            if (bloque.fuente) fuenteBase = bloque.fuente;
            if (bloque.tamano) tamanoBase = bloque.tamano;

            let estiloStr = '';
            if (bloque.negrita) estiloStr += 'bold ';
            if (bloque.cursiva) estiloStr += 'italic ';

            ctx.font = `${estiloStr}${tamanoBase}pt ${fuenteBase}`;
            ctx.fillStyle = '#000000';

            const lineas = bloque.texto.split('\n');
            lineas.forEach((linea) => {
              posY += (tamanoBase * 1.3) + interlineadoExtra;
              posX = margenPx;

              if (linea.length === 0) return;

              // Algoritmo de ajuste de línea (Word Wrap) limitado por anchoMaximo
              const palabras = linea.split(' ');
              let lineaActual = '';

              palabras.forEach((palabra, index) => {
                const prueba = lineaActual + (index === 0 ? '' : ' ') + palabra;
                const anchoPrueba = ctx.measureText(prueba).width;

                if (anchoPrueba > anchoMaximo && lineaActual.length > 0) {
                  ctx.fillText(lineaActual, posX, posY);
                  lineaActual = palabra;
                  posY += (tamanoBase * 1.3) + interlineadoExtra;
                } else {
                  lineaActual = prueba;
                }
              });

              if (lineaActual.length > 0) {
                ctx.fillText(lineaActual, posX, posY);
              }
            });
          });

          // Renderizado del footer
          if (imgFooter) {
            const proporcion = canvas.width / imgFooter.width;
            const altoFooter = imgFooter.height * proporcion;
            const yFooter = Math.max(posY + margenPx, canvas.height - altoFooter);
            ctx.drawImage(imgFooter, 0, yFooter, canvas.width, altoFooter);
          } else if (config.footerLinkText) {
            ctx.font = '10pt Arial';
            ctx.fillStyle = config.footerLinkUrl ? '#0000FF' : '#555555';
            ctx.textAlign = 'center';
            const yTextoFooter = Math.max(posY + margenPx, canvas.height - 20);
            ctx.fillText(config.footerLinkText, canvas.width / 2, yTextoFooter);
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