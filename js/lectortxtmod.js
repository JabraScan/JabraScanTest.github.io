// lectortxtmod.js
const TAMANO_BASE        = 11;
const INTERLINEADO_EXTRA = 9;
const FACTOR_INTERLINEADO= 1.3;
const MARGEN_CM          = 3.0;
const MARGEN_CM_MOBILE   = 1.2;
const ALTO_MAX_CANVAS    = 1500; // Límite seguro por canvas para evitar reventar el navegador

function esPantallaPequena() {
  return window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

function cmAPx(cm) {
  return cm * 37.7952755906;
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
    container, // Contenedor HTML donde se inyectarán los canvas
    clave = "",
    configuracion = {},
    capitulo = 0
  } = options;

  const targetContainer = container || (options.canvas ? options.canvas.parentElement : null);

  if (!targetContainer) {
    throw new Error('Se requiere un contenedor HTML válido para inyectar los canvas.');
  }

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

    // Canvas auxiliar invisible para medir fuentes con precisión
    const canvasMedicion = document.createElement('canvas');
    const ctxMedicion = canvasMedicion.getContext('2d');
    canvasMedicion.width = width;

    let altoHeader = 0;
    if (imgHeader) {
      const proporcion = width / imgHeader.width;
      altoHeader = imgHeader.height * proporcion;
    }

    // PASO 1: Troceado previo (Procesamiento y fragmentación de bloques)
    const paginasBloques = [];
    let bloquesActuales = [];
    let alturaAcumulada = (paginasBloques.length === 0) ? (altoHeader + margenPx + (FACTOR_INTERLINEADO * 2)) : margenPx;

    let fuenteBase = 'Arial';
    let tamanoBase = TAMANO_BASE;

    cachedBloques.forEach(bloque => {
      if (bloque.fuente) fuenteBase = bloque.fuente;
      if (bloque.tamano) tamanoBase = bloque.tamano;

      let estiloStr = '';
      if (bloque.negrita) estiloStr += 'bold ';
      if (bloque.cursiva) estiloStr += 'italic ';
      ctxMedicion.font = `${estiloStr}${tamanoBase}pt ${fuenteBase}`;

      const lineas = bloque.texto.split('\n');
      let alturaBloque = 0;
      let posX = margenPx;

      lineas.forEach((linea, indexLinea) => {
        if (indexLinea > 0) {
          alturaBloque += (tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA;
          posX = margenPx;
        }

        if (linea.length === 0) return;

        const palabras = linea.split(' ');
        palabras.forEach((palabra, indexPalabra) => {
          const textoAEscribir = (indexPalabra === 0 && posX === margenPx) ? palabra : ' ' + palabra;
          const anchoTexto = ctxMedicion.measureText(textoAEscribir).width;

          if (posX + anchoTexto > margenPx + anchoMaximo && posX > margenPx) {
            alturaBloque += (tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA;
            posX = margenPx + ctxMedicion.measureText(palabra).width;
          } else {
            posX += anchoTexto;
          }
        });
      });

      alturaBloque += (tamanoBase * FACTOR_INTERLINEADO) + INTERLINEADO_EXTRA;

      // Si supera el límite de 1500px, cerramos página y abrimos un nuevo lienzo
      if (alturaAcumulada + alturaBloque > ALTO_MAX_CANVAS && bloquesActuales.length > 0) {
        paginasBloques.push({ bloques: bloquesActuales, altoTotal: alturaAcumulada });
        bloquesActuales = [];
        alturaAcumulada = margenPx;
      }

      bloquesActuales.push(bloque);
      alturaAcumulada += alturaBloque;
    });

    if (bloquesActuales.length > 0) {
      paginasBloques.push({ bloques: bloquesActuales, altoTotal: alturaAcumulada });
    }

    // PASO 2: Generación, re-cálculo de altura exacta y renderizado directo sobre cada Canvas
    paginasBloques.forEach((pagina, index) => {
      const esPrimera = (index === 0);
      const esUltima = (index === paginasBloques.length - 1);

      let altoFooter = 0;
      if (esUltima) {
        altoFooter = INTERLINEADO_EXTRA * 2 + 150; // Margen reservado para banner/link final
      }

      // PASO 2 - RECALCULAR LA ALTURA DEL CANVAS SEGUN LOS AJUSTES DEL CONTENIDO
      const altoCanvasAjustado = Math.ceil(pagina.altoTotal + altoFooter);

      const cvs = document.createElement('canvas');
      cvs.width = width;
      cvs.height = altoCanvasAjustado;
      cvs.style.display = 'block';
      targetContainer.appendChild(cvs);

      const ctx = cvs.getContext('2d');
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      let posY = margenPx;

      // Dibujar Header si es la primera sección
      if (esPrimera) {
        if (imgHeader) {
          ctx.drawImage(imgHeader, 0, 0, width, altoHeader);
        }
        posY = altoHeader + margenPx + (FACTOR_INTERLINEADO * 2);
      }

      // Renderizado del contenido del bloque
      pagina.bloques.forEach(bloque => {
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

      // Renderizado del Footer si es el último lienzo
      if (esUltima) {
        const posYActual = posY + (INTERLINEADO_EXTRA * 2);
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
        } else if (config.footerLinkText) {
          ctx.font = (TAMANO_BASE - 2) + 'pt Arial';
          ctx.fillStyle = config.footerLinkUrl ? '#0000FF' : '#555555';
          ctx.textAlign = 'center';
          ctx.fillText(config.footerLinkText, width / 2, posYActual);
          ctx.textAlign = 'left';
        }
      }
    });
  }
}