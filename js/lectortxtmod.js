// lectortxtmod.js
const TAMANO_BASE       = 11;
const INTERLINEADO_EXTRA= 9;
const FACTOR_INTERLINEADO = 1.3;
const MARGEN_CM         = 3.0;
const MARGEN_CM_MOBILE  = 1.2;

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

  // --- Ocultar controles de PDF al inicializar el motor ---
  const controlesPdf = document.querySelector('.pdf-controls');
  if (controlesPdf) {
    controlesPdf.style.setProperty('display', 'none', 'important');
  }

  let cachedBloques = [];
  let config = {};

  return {
    numPages: 1,

    async load(txtContent, configPath = "") {
      try {
        let contenidoLimpio = txtContent;
        if (typeof txtContent === 'string') {
          // Reemplaza los booleanos de Python por los de JavaScript para que eval() no falle
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
          
          const esMovil = esPantallaPequena();
          const margenPx = cmAPx(esMovil ? MARGEN_CM_MOBILE : MARGEN_CM);
          const anchoMaximo = width - (margenPx * 2);
          
          let tamanoBase = TAMANO_BASE;
          const interlineadoExtra = INTERLINEADO_EXTRA;
          let alturaEstimadaTexto = 0;

          cachedBloques.forEach(bloque => {
            if (bloque.tamano) tamanoBase = bloque.tamano;
            const lineas = bloque.texto.split('\n');
            lineas.forEach(() => {
              alturaEstimadaTexto += (tamanoBase * FACTOR_INTERLINEADO) + interlineadoExtra;
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
          const margenPx = cmAPx(esMovil ? MARGEN_CM_MOBILE : MARGEN_CM);
          
          const anchoMaximo = canvas.width - (margenPx * 2);

          let posX = margenPx;
          let posY = altoHeader + margenPx + (FACTOR_INTERLINEADO * 2); 

          cachedBloques.forEach(bloque => {
            if (bloque.fuente) fuenteBase = bloque.fuente;
            if (bloque.tamano) tamanoBase = bloque.tamano;

            let tamanoRender = tamanoBase;
            let desfasadorY = 0;

            // Ajuste para superíndices y subíndices
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

            ctx.font = `${estiloStr}${tamanoRender}pt ${fuenteBase}`;

            // Control de color: si no se especifica o es 000000, se aplica el negro por defecto
            if (bloque.color && bloque.color !== "000000" && bloque.color !== "#000000") {
              ctx.fillStyle = bloque.color.startsWith('#') ? bloque.color : `#${bloque.color}`;
            } else {
              ctx.fillStyle = '#000000';
            }

            const lineas = bloque.texto.split('\n');

            lineas.forEach((linea, indexLinea) => {
              // Si proviene de un salto de línea explícito ('\n')
              if (indexLinea > 0) {
                posY += (tamanoBase * FACTOR_INTERLINEADO) + interlineadoExtra;
                posX = margenPx;
              }

              if (linea.length === 0) return;

              const palabras = linea.split(' ');

              palabras.forEach((palabra, indexPalabra) => {
                const textoAEscribir = (indexPalabra === 0 && posX === margenPx) ? palabra : ' ' + palabra;
                const anchoTexto = ctx.measureText(textoAEscribir).width;

                // Verificación de ajuste de línea si excede el margen derecho
                if (posX + anchoTexto > margenPx + anchoMaximo && posX > margenPx) {
                  posY += (tamanoBase * FACTOR_INTERLINEADO) + interlineadoExtra;
                  posX = margenPx;
                  const palabraSinEspacio = palabra;
                  const nuevoAncho = ctx.measureText(palabraSinEspacio).width;
                  
                  ctx.fillText(palabraSinEspacio, posX, posY + desfasadorY);

                  if (bloque.subrayado) {
                    const grosor = Math.max(1, tamanoRender / 12);
                    ctx.fillRect(posX, posY + desfasadorY + 2, nuevoAncho, grosor);
                  }

                  posX += nuevoAncho;
                } else {
                  ctx.fillText(textoAEscribir, posX, posY + desfasadorY);

                  if (bloque.subrayado) {
                    const grosor = Math.max(1, tamanoRender / 12);
                    ctx.fillRect(posX, posY + desfasadorY + 2, anchoTexto, grosor);
                  }

                  posX += anchoTexto;
                }
              });
            });

            // Separación entre bloques/párrafos
            posY += (tamanoBase * FACTOR_INTERLINEADO) + interlineadoExtra;
            posX = margenPx;
          });

          // Renderizado del footer
          const separacionFooter = INTERLINEADO_EXTRA * 2;
          let posYActual = posY + separacionFooter;

          if (imgFooter) {
            let anchoFooter, altoFooter, xPos;
            //si la proporcion es 1/4
            if ( (imgFooter.width / imgFooter.height) <= 0.40 ) {
              let proporcion = margenPx / imgFooter.height;
              anchoFooter = imgFooter.width * proporcion
              alfoFooter = margenPx;
              xPos = (canvas.width - anchoFooter) / 2; // Centrado para imágenes estrechas
            } else {
              let proporcion = canvas.width / imgFooter.width;
              anchoFooter = canvas.width
              altoFooter = imgFooter.height * proporcion;
              xPos = 0;
            }

            ctx.drawImage(imgFooter, xPos, posYActual, anchoFooter, altoFooter);
          } else if (config.footerLinkText) {
            ctx.font = (TAMANO_BASE-2) + 'pt Arial';
            ctx.fillStyle = config.footerLinkUrl ? '#0000FF' : '#555555';
            ctx.textAlign = 'center';
            
            ctx.fillText(config.footerLinkText, canvas.width / 2, posYActual);
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