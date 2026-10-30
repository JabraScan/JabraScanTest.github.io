// canvas-reader.js[cite: 1]

function esPantallaPequena() {
  return window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

function cmAPx(cm) {
  return cm * 37.7952755906; // 1 cm ≈ 37.8 px[cite: 1]
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
 * Motor para leer y renderizar texto optimizado en canvas.[cite: 1]
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

  return {
    async load(txtContent, configPath = "") {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let datosBloques = [];
      try {
        datosBloques = typeof txtContent === 'string' ? eval(txtContent) : txtContent;
      } catch (e) {
        console.error("Error al parsear el contenido del capítulo:", e);
        datosBloques = [];
      }

      const config = {
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

      // --- VARIABLES DECLARADAS ANTES DE USARSE ---
      let fuenteBase = 'Arial';
      let tamanoBase = 11;
      const interlineadoExtra = 6;

      const esMovil = esPantallaPequena();
      const margenPx = cmAPx(esMovil ? 1.2 : 3.0);

      let posX = margenPx;
      // Ahora tamanoBase ya existe y no dará error de referencia
      let posY = altoHeader + (tamanoBase * 1.3 * 2); 
      // -------------------------------------------

      datosBloques.forEach(bloque => {
        if (bloque.fuente) fuenteBase = bloque.fuente;
        if (bloque.tamano) tamanoBase = bloque.tamano;

        let estiloStr = '';
        if (bloque.negrita) estiloStr += 'bold ';
        if (bloque.cursiva) estiloStr += 'italic ';

        ctx.font = `${estiloStr}${tamanoBase}pt ${fuenteBase}`;
        ctx.fillStyle = '#000000';

        const lineas = bloque.texto.split('\n');
        lineas.forEach(linea => {
          ctx.fillText(linea, posX, posY);
          posY += (tamanoBase * 1.3) + interlineadoExtra;
        });
      });

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
    }
  };
}