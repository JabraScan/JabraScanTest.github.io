import { parseDateDMY, parseChapterNumber } from './utils.js';
import { incrementarVisita, leerVisitas } from './contadoresGoogle.js';
import { mostrarurl } from './general.js';
import { setItem, getItem, removeItem } from "./storage.js";
import { TxtReaderEngine } from './lectortxtmod.js?v1.12';

// Variables globales para el lector PDF
let pdfDoc = null;
let pageNum = 1;
let canvas, ctx, pageInfo, body;
let lastContainerWidth = 0;

/**
 * Inicializa el lector PDF al cargar la página.
 * Configura el entorno visual, botones, enlaces y carga la última lectura.
 */
export function initLectorPDF() {
  canvas = document.getElementById("pdfCanvas");
  ctx = canvas.getContext("2d");
  pageInfo = document.querySelector(".pageInfo");
  body = document.body;
  //console.log('initLectorPDF ejecutado');

  configurarModoOscuro();
  configurarMenuHamburguesa();
  configurarBotonesLectura();
  configurarEnlacesPDF();
  cargarUltimaLectura();

  // Re-render responsivo en resize con debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    const container = document.getElementById('pdfContainer') || canvas?.parentElement;
    const cw = Math.max(0, (container?.clientWidth || 0) - 24);
    if (cw === lastContainerWidth) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (pdfDoc && canvas) {
        renderPage(pageNum);
      }
    }, 150);
  });
}

/**
 * Renderiza una página específica del documento PDF.
 * @param {number} num - Número de página a renderizar.
 */
export function renderPage(num) {
  const container = document.getElementById('pdfContainer') || canvas?.parentElement;
  const containerWidth = Math.max(0, (container?.clientWidth || 0) - 24); // margen interno
  pdfDoc.getPage(num).then(page => {
    // Escala base para viewport de pdf.js
    const baseViewport = page.getViewport({ scale: 1.0 });
    let scale = 1.0;
    if (containerWidth > 0) {
      scale = containerWidth / baseViewport.width;
      // límites de escala razonables
      scale = Math.max(0.5, Math.min(scale, 3));
    } else {
      scale = 1.5; // fallback
    }

    const viewport = page.getViewport({ scale });

    // Soporte HiDPI para nitidez
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    // Reset transform y aplicar escala para HiDPI
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    page.render({ canvasContext: ctx, viewport });

    // Actualiza todos los indicadores de página (arriba y abajo)
    document.querySelectorAll('.pageInfo').forEach(el => {
      el.textContent = `Página ${num} de ${pdfDoc.numPages}`;
    });
    speechSynthesis.cancel();
    setItem("ultimaPagina", num);

    // Guarda el ancho para evitar re-render innecesario
    lastContainerWidth = containerWidth;
  });
}

/**
 * Carga un capítulo específico de una obra.
 * @param {string} clave - Identificador de la obra.
 * @param {string} capitulo - Número del capítulo a cargar.
 * @param {number} paginaInicial - Página inicial del capítulo.
 */
export function cargarCapitulo(clave, capitulo, paginaInicial = 1) {
  fetch("capitulos.json")
    .then(res => res.json())
    .then(index => fetch(index[clave])
      .then(res => res.json())
      .then(data => {
        const capitulos = data[clave] || [];
        // 📅 Fecha actual sin horas
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        // 🔎 Mapear y filtrar capítulos publicados
        const capitulosObra = capitulos.map(cap => ({
          ...cap,
          _clave: clave,
          _fecha: parseDateDMY(cap.Fecha),
          _num: parseChapterNumber(cap.numCapitulo),
          _server: "io-pdfs"
        }))
        .filter(cap => cap._fecha <= hoy); // ✅ solo capítulos con fecha <= hoy
        const idx = capitulosObra.findIndex(c => c.numCapitulo === capitulo);
        if (idx === -1) return;
        //console.log(cap);        
        mostrarurl(clave, capitulo); //actualizar barra de direcciones
        const cap = capitulosObra[idx];
        actualizarTituloObra(cap.tituloObra, clave);
        cargarDocumento(clave, cap.NombreArchivo, paginaInicial, idx, capitulosObra);
        configurarSelectorCapitulos(capitulo, capitulosObra, clave);
        configurarBotonesCapitulo(idx, capitulosObra, clave); // ← Botones de navegación
      })
    )
    .catch(err => console.error("Error al cargar el capítulo:", err));
}
function cargarDocumento(clave, nombreArchivo, paginaInicial, idx, capitulosObra) {
  const esTxt = nombreArchivo.toLowerCase().endsWith('.txt');

  const numCapitulo = capitulosObra[idx].numCapitulo;
  // Lógica de rutas
  const extra = numCapitulo > 999 ? String(numCapitulo).slice(0, -3) : "";
  const claveFinal = String(clave) + extra;
  // Construimos la ruta final del PDF, codificando el nombre del archivo para URLs válidas.
    // rutas repos
    // server = "local"   → usar pdfLocal
    const pdfLocal = `/books/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;
    // server = "io-pdfs" → usar pdfBackup
    //const pdfBackup = `https://pdfs.jabrascan.net/books/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;
    const pdfBackup = `https://raw.githubusercontent.com/JabraScan/JabraScan.github.io-pdfs/main/books/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;
    // server - "r2-books"→ usar r2books en cloudflare
    const bookR2 = `https://books.jabrascan.net/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;

    const bookPath = bookR2;
    const idincremento = `${clave}_${capitulosObra[idx].numCapitulo}`;

  const parametros = [
    clave,
    bookPath,
    paginaInicial,
    idx,
    capitulosObra,
    idincremento
  ];

  if (esTxt) {
    cargarTXT(parametros);
  } else {
    cargarPDF(parametros);
  }
}

function cargarPDF(parametros) {

      let [claveP, bookPath, paginaInicial, idx, capitulosObra, idincremento] = parametros;

      pdfjsLib.getDocument(bookPath).promise.then(doc => {
        pdfDoc = doc;
        pageNum = paginaInicial;
        renderPage(pageNum);
        actualizarBotonesNav(idx, capitulosObra, claveP);
        incrementarVisita(idincremento);
      });  
}

function cargarTXT(parametros) {
  let [claveT, bookPath, paginaInicial, idx, capitulosObra, idincremento] = parametros;

  const capituloactual = capitulosObra[idx].numCapitulo;
  //// Sacamos el config.json de la misma carpeta de donde viene el pdfPath
  const configPath = bookPath.substring(0, bookPath.lastIndexOf('/')) + '/config.json';
   //  {
   //    headerbaseUrl: `https://img.jabrascan.net/${this.clave}/`,
   //    headerBannerUrl: [`header.webp`],
   //    headerChapters: [0],
   //    headerBannerUrlFallback: null,
   //
   //    footerbaseUrl: `https://img.jabrascan.net/${this.clave}/`,
   //    footerBannerUrl: [`footer.webp`],
   //    footerChapters: [0],
   //    footerBannerUrlFallback: `https://img.jabrascan.net/main/JabraRexScan02-150w.webp`,
   //    
   //    footerLinkUrl: "", // Si está en blanco (""), es SOLO TEXTO NO UN LINK
   //    footerLinkText: "https://jabrascan.net"
   //  };
   //
   //@param {Object} options
   //@param {HTMLCanvasElement} options.canvas - Elemento canvas donde se renderiza
   //@param {HTMLElement} options.container - Contenedor padre del canvas (para capa de enlaces HTML)
   //@param {number} [options.dpi=96] - Resolución para la conversión cm -> px (por defecto 96 DPI)
   //@param {string} options.clave - Clave única de la obra para las URLs
   //@param {integer} options.capitulo
   //
  fetch(bookPath)
    .then(res => res.text())
    .then(async txtContent => {
      // Instanciamos el motor de texto pasándole el contenedor del canvas
      const txtEngine = new TxtReaderEngine({ 
        canvas: canvas,
        container: canvas.parentElement,
        clave : claveT,
        capitulo: capituloactual
      });
      
      // Cargamos el contenido (pasamos {} ya que no hay config.json por ahora)
      await txtEngine.load(txtContent, configPath);
      
      // Asignamos el motor a pdfDoc para que sea transparente para la SPA
      pdfDoc = txtEngine;
      pageNum = paginaInicial;
      renderPage(pageNum); // Usará el renderPage global de lectorpdfmod.js si este llama a pdfDoc.getPage(), o el propio del engine.
      actualizarBotonesNav(idx, capitulosObra, claveT);
      incrementarVisita(idincremento);
    })
    .catch(err => console.error("Error al cargar el capítulo:", err));
}
/**
 * Carga el archivo PDF y renderiza la página inicial.
 */
function cargarPDF_old(clave, nombreArchivo, paginaInicial, idx, capitulosObra) {
  //añadido el 09-09-2025 23:28 para gestionar los capitulos mas alla de 999
      // Extraemos el número de capítulo actual
      const numCapitulo = capitulosObra[idx].numCapitulo;
      // Si el número es mayor a 999, tomamos todos los dígitos excepto los tres últimos.
      // Ejemplo: 1203 → "1", 123653 → "123"
      const extra = numCapitulo > 999 ? String(numCapitulo).slice(0, -3) : "";
      // Concatenamos el fragmento extra a la clave, asegurándonos de que sea texto.
      // Esto evita sumas si 'clave' es numérica.
      const claveFinal = String(clave) + extra;
      // Construimos la ruta final del PDF, codificando el nombre del archivo para URLs válidas.
        // rutas repos
          // server = "local"   → usar pdfLocal
          const pdfLocal = `/books/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;
          // server = "io-pdfs" → usar pdfBackup
          //const pdfBackup = `https://pdfs.jabrascan.net/books/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;
          const pdfBackup = `https://raw.githubusercontent.com/JabraScan/JabraScan.github.io-pdfs/main/books/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;
          // server - "r2-books"→ usar r2books en cloudflare
          const pdfR2 = `https://books.jabrascan.net/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;
          const pdfPath = pdfR2;

      pdfjsLib.getDocument(pdfPath).promise.then(doc => {
        pdfDoc = doc;
        pageNum = paginaInicial;
        renderPage(pageNum);
    //console.log(`Capitulo ${capitulosObra[idx].numCapitulo}`);
        actualizarBotonesNav(idx, capitulosObra, clave);
        incrementarVisita(`${clave}_${capitulosObra[idx].numCapitulo}`);
      });
}
/**
 * Actualiza el título de la obra y muestra banner especial si aplica.
 */
function actualizarTituloObra(titulo, clave) {
  const h1 = document.getElementById("tituloObraPdf");
  h1.textContent = titulo;
  h1.onclick = () => onLibroClick(clave);

  if (clave === "CDMNQTMHC") {
    const datosAdic = document.querySelector(".optionaldata");
    const divBanner = document.createElement("div");
    divBanner.className = "callatedragonmalvado";
    divBanner.innerHTML = `
      <span>Traducción aprobada por el autor</span><br>
      <span><strong>Discord Oficial :</strong> <a href="https://discord.gg/Mk2qb65AxA" target="_blank">https://discord.gg/Mk2qb65AxA</a></span><br>
      <img src="https://img.jabrascan.net/discord_oficial_jabrascan.webp?v=20261018"
          alt="Discord Oficial habla hispana"
          style="max-width:90%"
          decoding="async" fetchpriority="high"
          srcset="https://img.jabrascan.net/discord_oficial_jabrascan-300w.webp?v=20261018 300w,
                  https://img.jabrascan.net/discord_oficial_jabrascan-450w.webp?v=20261018 600w,
                  https://img.jabrascan.net/discord_oficial_jabrascan-600w.webp?v=20261018 600w,
                  https://img.jabrascan.net/discord_oficial_jabrascan-900w.webp?v=20261018 900w"
                  sizes="(max-width: 576px) 70vw, (max-width: 992px) 40vw, 300px">
    `;
    datosAdic.appendChild(divBanner);
  }
  const enlaceObra = document.getElementById("volverAObra");
  enlaceObra.href = `index.html#${clave}`; 
}

/**
 * Configura el selector de capítulos en el menú desplegable.
 */
function configurarSelectorCapitulos(capituloActual, capitulosObra, clave) {
  const chapterSelect = document.getElementById("chapterSelect");
  chapterSelect.innerHTML = "";
  capitulosObra.forEach(c => {
    const option = document.createElement("option");
    option.value = c.numCapitulo;
    option.textContent = `${c.numCapitulo} · ${c.nombreCapitulo}`;
    if (c.numCapitulo === capituloActual) option.selected = true;
    chapterSelect.appendChild(option);
  });

  chapterSelect.onchange = () => {
    const nuevoCap = chapterSelect.value;
    setItem("ultimaObra", clave);
    setItem("ultimoCapitulo", nuevoCap);
    cargarCapitulo(clave, nuevoCap, 1);
  };
}

/**
 * Configura los botones de navegación entre páginas y capítulos.
 */
function actualizarBotonesNav(idx, capitulos, clave) {
  const prevAction = pageNum > 1
    ? () => { pageNum--; renderPage(pageNum); actualizarBotonesNav(idx, capitulos, clave); }
    : idx > 0
      ? () => cargarCapitulo(clave, capitulos[idx - 1].numCapitulo, 1)
      : null;

  const nextAction = pageNum < pdfDoc.numPages
    ? () => { pageNum++; renderPage(pageNum); actualizarBotonesNav(idx, capitulos, clave); }
    : idx < capitulos.length - 1
      ? () => cargarCapitulo(clave, capitulos[idx + 1].numCapitulo, 1)
      : null;

  document.querySelectorAll(".prevPage").forEach(btn => {
    const label = btn.querySelector('.label');
    if (label) label.textContent = prevAction ? "Página anterior" : "Capítulo anterior";
    btn.disabled = !prevAction;
    btn.onclick = prevAction;
  });

  document.querySelectorAll(".nextPage").forEach(btn => {
    const label = btn.querySelector('.label');
    if (label) label.textContent = nextAction ? "Página siguiente" : "Capítulo siguiente";
    btn.disabled = !nextAction;
    btn.onclick = nextAction;
  });
}

/**
 * Configura el modo oscuro/claro del lector.
 */
function configurarModoOscuro() {
  const toggleMode = document.getElementById("toggleMode");
  toggleMode.onclick = () => {
    body.classList.toggle("dark-mode");
    body.classList.toggle("light-mode");
    const icon = toggleMode.querySelector('.theme-icon');
    if (icon) {
      if (body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon','fa-regular');
        icon.classList.add('fa-sun','fa-solid');
      } else {
        icon.classList.remove('fa-sun','fa-solid');
        icon.classList.add('fa-moon','fa-regular');
      }
    }
    setItem("modoNocturno", body.classList.contains("dark-mode") ? "true" : "false");
  };

  if (getItem("modoNocturno") === "true") {
    body.classList.add("dark-mode");
    body.classList.remove("light-mode");
    const icon = toggleMode.querySelector('.theme-icon');
    if (icon) {
      icon.classList.remove('fa-moon','fa-regular');
      icon.classList.add('fa-sun','fa-solid');
    }
  }
}

/**
 * Configura el menú hamburguesa para dispositivos móviles.
 */
function configurarMenuHamburguesa() {
  // Ya no usamos el menú hamburguesa custom; la navbar usa offcanvas de Bootstrap.
  // Mantener compatibilidad si se abre este archivo en modo no-SPA o plantillas antiguas.
  const mainHeader = document.getElementById('main-header');
  if (!mainHeader) {
    return; // No hay header legacy; nada que configurar.
  }
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      mainHeader.classList.toggle('show');
      document.body.classList.toggle('no-scroll', mainHeader.classList.contains('show'));
    });
  }
  mainHeader.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 600) {
        mainHeader.classList.remove('show');
        document.body.classList.remove('no-scroll');
      }
    });
  });
}

/**
 * Configura los botones para lectura en voz alta.
 */
function configurarBotonesLectura() {
  const startBtn = document.getElementById("readAloud");
  const pauseBtn = document.getElementById("pauseReading");
  const resumeBtn = document.getElementById("resumeReading");
  const stopBtn = document.getElementById("stopReading");

  function mostrar({ play = false, pause = false, resume = false, stop = false }) {
    startBtn.style.display = play ? "inline-block" : "none";
    pauseBtn.style.display = pause ? "inline-block" : "none";
    resumeBtn.style.display = resume ? "inline-block" : "none";
    stopBtn.style.display = stop ? "inline-block" : "none";
  }

startBtn.onclick = () => {
  pdfDoc.getPage(pageNum).then(page => {
    page.getTextContent().then(textContent => {
      const text = textContent.items.map(item => item.str).join(" ");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";

      const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith("es"));
      utterance.voice = voices.find(v => v.name.includes("Google") || v.name.includes("Helena")) || voices[0];
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.volume = 1;

      mostrar({ pause: true, stop: true });

      utterance.onend = () => {
        const btnNext = document.querySelector('.nextPage');
        if (btnNext && !btnNext.disabled) {
          stopBtn.click();
          btnNext.click();
          setTimeout(() => startBtn.click(), 1000);
        } else {
          const fin = new SpeechSynthesisUtterance("Ya no hay más contenido para leer");
          fin.lang = "es-ES";
          speechSynthesis.speak(fin);
          mostrar({ play: true });
        }
      };

      speechSynthesis.speak(utterance);
    });
  });
};

pauseBtn.onclick = () => {
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
    mostrar({ resume: true, stop: true });
  }
};

resumeBtn.onclick = () => {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    mostrar({ pause: true, stop: true });
  }
};

stopBtn.onclick = () => {
  speechSynthesis.cancel();
  mostrar({ play: true });
};
}

/**
 * Configura los enlaces que cargan capítulos desde elementos HTML.
 */
function configurarEnlacesPDF() {
  document.querySelectorAll(".pdf-link").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      const clave = event.currentTarget.getAttribute("data-pdf-obra");
      const capitulo = event.currentTarget.getAttribute("data-pdf-capitulo");
      setItem("ultimaObra", clave);
      setItem("ultimoCapitulo", capitulo);
      cargarCapitulo(clave, capitulo, 1);
    });
  });
}

/**
 * Carga la última lectura guardada en localStorage.
 */
function cargarUltimaLectura() {
  const ultimaObra = getItem("ultimaObra");
  const ultimoCapitulo = getItem("ultimoCapitulo");
  const ultimaPagina = parseInt(getItem("ultimaPagina"), 10);
  if (ultimaObra && ultimoCapitulo) {
    cargarCapitulo(ultimaObra, ultimoCapitulo, !isNaN(ultimaPagina) ? ultimaPagina : 1);
  }
}

/**
 * Redirige a la ficha del libro correspondiente.
 */
function onLibroClick(libroId) {
  setItem('libroSeleccionado', libroId);
  fetch('books/libro-ficha.html')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo: ' + response.statusText);
      }
      return response.text();
    })
    .then(data => {
      const mainElement = document.querySelector('main');
      mainElement.innerHTML = data;
      import('./libroficha.js').then(module => {
        module.cargarlibro(libroId);
      });
    })
    .catch(err => console.error('Error:', err));
}

/**
 * Configura los botones de capítulo anterior y siguiente.
 * Se llama desde cargarCapitulo().
 */
function configurarBotonesCapitulo(idx, capitulosObra, clave) {
  // ⬅️ Botón capítulo anterior
  const btnPrev = document.getElementById("btnPrevCap");
  if (idx > 0) {
    const prevCap = capitulosObra[idx - 1];
    btnPrev.disabled = false;
    btnPrev.onclick = () => {
      setItem("ultimaPagina", 1);
      setItem("ultimaObra", clave);
      setItem("ultimoCapitulo", prevCap.numCapitulo);
      cargarCapitulo(clave, prevCap.numCapitulo, 1);
    };
  } else {
    btnPrev.disabled = true;
    btnPrev.onclick = null;
  }

  // ➡️ Botón capítulo siguiente
  const btnNext = document.getElementById("btnNextCap");
  if (idx < capitulosObra.length - 1) {
    const nextCap = capitulosObra[idx + 1];
    btnNext.disabled = false;
    btnNext.onclick = () => {
      setItem("ultimaPagina", 1);
      setItem("ultimaObra", clave);
      setItem("ultimoCapitulo", nextCap.numCapitulo);
      cargarCapitulo(clave, nextCap.numCapitulo, 1);
    };
  } else {
    btnNext.disabled = true;
    btnNext.onclick = null;
  }
}
