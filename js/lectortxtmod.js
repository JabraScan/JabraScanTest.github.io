// lectortxtmod.js
const TAMANO_BASE         = 11;
const INTERLINEADO_EXTRA  = 9;
const FACTOR_INTERLINEADO = 1.3;
const MARGEN_CM           = 3.0;
const MARGEN_CM_MOBILE    = 1.2;
const ALTO_MAX_CANVAS     = 1500; // Límite seguro aproximado para trocear los canvas

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
 * Motor para leer y renderizar texto mediante scroll infinito con múltiples canvas dinámicos.
 */
export function TxtReaderEngine(options) {
  const {
    container, // Contenedor HTML donde se inyectarán los canvas de forma dinámica
    clave = "",
    configuracion = {},
    capitulo = 0
  } = options;

  const targetContainer = container || (options.canvas ? options.canvas.parentElement : null);

  if (!targetContainer) {
    throw new Error('Se requiere un contenedor HTML válido para inyectar los canvas.');
  }

  // Ocultar controles de PDF al inicializar
  const controlesPdf = document.querySelector('.pdf-controls');
  if (controlesPdf) {
    controlesPdf.style.setProperty('display', 'none', 'important');
  }

  let cachedBloques = [];
  let config = {};

  return {
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

      await ActionRender();
    }
  };

  async function ActionRender() {
    targetContainer.innerHTML = ''; // Limpieza previa del contenedor

    const width = targetContainer.clientWidth || 800;
    const esMovil = esPantallaPequena();
    const margenPx = cmAPx(esMovil ? MARGEN_CM_MOBILE : MARGEN_CM);
    const anchoMaximo = width - (margenPx * 2);

    const urlHeader = obtenerUrlBanner(config.headerbaseUrl, config.headerBannerUrl, config.headerChapters, config.headerBannerUrlFallback, capitulo);
    const urlFooter = obtenerUrlBanner(config.footerbaseUrl, config.footerBannerUrl, config.footerChapters, config.footerBannerUrlFallback, capitulo);

    const [imgHeader, imgFooter] = await Promise.all([
      cargarImagen(urlHeader),
      cargarImagen(urlFooter)
    ]);

    let altoHeader = 0;
    if (imgHeader) {
      const proporcion = width / imgHeader.width;
      altoHeader = imgHeader.height * proporcion;
    }

    // Dividir los bloques en fragmentos (chunks) lógicos para respetar el límite seguro por canvas
    const fragmentos = [];
    let bloquesActuales = [];
    let alturaEstimada = altoHeader + margenPx;

    cachedBloques.forEach(bloque => {
      let tamanoBase = bloque.tamano || TAMANO_BASE;
      const lineas = bloque.texto.split('\n');
      let altoBloqueEstimado = lineas.length * ((tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA);

      if (alturaEstimada + altoBloqueEstimado > ALTO_MAX_CANVAS && bloquesActuales.length > 0) {
        fragmentos.push(bloquesActuales);
        bloquesActuales = [];
        alturaEstimada = margenPx;
      }

      bloquesActuales.push(bloque);
      alturaEstimada += altoBloqueEstimado;
    });

    if (bloquesActuales.length > 0) {
      fragmentos.push(bloquesActuales);
    }

    // Renderizar cada fragmento en un elemento <canvas> independiente e inyectarlo en orden
    for (let index = 0; index < fragmentos.length; index++) {
      const bloquesFragmento = fragmentos[index];
      const esPrimera = (index === 0);
      const esUltima = (index === fragmentos.length - 1);

      // Creamos un canvas temporal con un alto generoso holgado para pintar y calcular la posición real final de posY
      const cvs = document.createElement('canvas');
      cvs.width = width;
      cvs.height = ALTO_MAX_CANVAS * 2; 
      cvs.style.display = 'block';
      targetContainer.appendChild(cvs);

      const ctx = cvs.getContext('2d');
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      let posY = margenPx;

      // Dibujar Header si es la primera página del capítulo
      if (esPrimera && imgHeader) {
        ctx.drawImage(imgHeader, 0, 0, width, altoHeader);
        posY = altoHeader + margenPx + (FACTOR_INTERLINEADO * 2);
      }

      let fuenteBase = 'Arial';
      let tamanoBase = TAMANO_BASE;

      // Renderizado del contenido bloque a bloque con cálculo de posición en tiempo real
      bloquesFragmento.forEach(bloque => {
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

        ctx.font = `${estiloStr}${tamanoRender}pt ${fuenteBase}`;

        if (bloque.color && bloque.color !== "000000" && bloque.color !== "#000000") {
          ctx.fillStyle = bloque.color.startsWith('#') ? bloque.color : `#${bloque.color}`;
        } else {
          ctx.fillStyle = '#000000';
        }

        let posX = margenPx;
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
            const anchoTexto = ctx.measureText(textoAEscribir).width;

            if (posX + anchoTexto > margenPx + anchoMaximo && posX > margenPx) {
              posY += (tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA;
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

        posY += (tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA;
        posX = margenPx;
      });

      // Renderizado del Footer si es el último lienzo del capítulo
      if (esUltima) {
        const separacionFooter = INTERLINEADO_EXTRA * 2;
        let posYActual = posY + separacionFooter;

        if (imgFooter) {
          let anchoFooter, altoFooterCalculado, xPos;
          if ((imgFooter.width / imgFooter.height) <= 0.40) {
            let proporcion = margenPx / imgFooter.height;
            anchoFooter = imgFooter.width * proporcion;
            altoFooterCalculado = margenPx;
            xPos = (width - anchoFooter) / 2;
          } else {
            let proporcion = width / imgFooter.width;
            anchoFooter = width;
            altoFooterCalculado = imgFooter.height * proporcion;
            xPos = 0;
          }
          ctx.drawImage(imgFooter, xPos, posYActual, anchoFooter, altoFooterCalculado);
          posY = posYActual + altoFooterCalculado;
        } else if (config.footerLinkText) {
          ctx.font = (TAMANO_BASE - 2) + 'pt Arial';
          ctx.fillStyle = config.footerLinkUrl ? '#0000FF' : '#555555';
          ctx.textAlign = 'center';
          ctx.fillText(config.footerLinkText, width / 2, posYActual);
          ctx.textAlign = 'left';
          posY = posYActual + 20;
        }
      }

      // REDIMENSIÓN EXACTA: El alto real final del canvas viene dictado por la última posY trazada
      const altoCanvasReal = Math.ceil(posY + margenPx);
      
      // Capturamos la imagen actual del canvas provisional
      const imgDataTemp = ctx.getImageData(0, 0, width, altoCanvasReal);
      
      // Ajustamos el alto real del canvas (esto limpia el contenido pero redimensiona la matriz)
      cvs.height = altoCanvasReal;
      
      // Devolvemos los píxeles renderizados a su sitio exacto con la nueva altura ajustada
      ctx.putImageData(imgDataTemp, 0, 0);
    }
  }
}