import { parseDateDMY, parseChapterNumber } from './utils.js';
import { incrementarVisita, leerVisitas } from './contadoresGoogle.js';
import { mostrarurl } from './general.js';

// Variables globales para el lector PDF
let pdfDoc = null;
let pageNum = 1;
let canvas, ctx, pageInfo, body;

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
}

/**
 * Renderiza una página específica del documento PDF.
 * @param {number} num - Número de página a renderizar.
 */
export function renderPage(num) {
  pdfDoc.getPage(num).then(page => {
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    page.render({ canvasContext: ctx, viewport });
    pageInfo.textContent = `Página ${num} de ${pdfDoc.numPages}`;
    speechSynthesis.cancel();
    localStorage.setItem("ultimaPagina", num);
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
        const capitulosObra = capitulos.map(cap => ({
          ...cap,
          _clave: clave,
          _fecha: parseDateDMY(cap.Fecha),
          _num: parseChapterNumber(cap.numCapitulo)
        }));
        const idx = capitulosObra.findIndex(c => c.numCapitulo === capitulo);
        if (idx === -1) return;
        
        mostrarurl(clave, capitulo); //actualizar barra de direcciones
        const cap = capitulosObra[idx];
        actualizarTituloObra(cap.tituloObra, clave);
        cargarPDF(clave, cap.NombreArchivo, paginaInicial, idx, capitulosObra);
        configurarSelectorCapitulos(capitulo, capitulosObra, clave);
        configurarBotonesCapitulo(idx, capitulosObra, clave); // ← Botones de navegación
      })
    )
    .catch(err => console.error("Error al cargar el capítulo:", err));
}

/**
 * Carga el archivo PDF y renderiza la página inicial.
 */
function cargarPDF(clave, nombreArchivo, paginaInicial, idx, capitulosObra) {
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
      const pdfPath = `books/${claveFinal}/${encodeURIComponent(nombreArchivo)}`;
  //const pdfPath = `books/${clave}/${encodeURIComponent(nombreArchivo)}`;
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
      <img src="img/discord_oficial_jabrascan.jpg" alt="Traducción aprobada">
    `;
    datosAdic.appendChild(divBanner);
  }
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
    localStorage.setItem("ultimaObra", clave);
    localStorage.setItem("ultimoCapitulo", nuevoCap);
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
    btn.textContent = prevAction ? "Página anterior" : "Capítulo anterior";
    btn.disabled = !prevAction;
    btn.onclick = prevAction;
  });

  document.querySelectorAll(".nextPage").forEach(btn => {
    btn.textContent = nextAction ? "Página siguiente" : "Capítulo siguiente";
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
    toggleMode.textContent = body.classList.contains("dark-mode") ? "☀️" : "🌙";
    localStorage.setItem("modoNocturno", body.classList.contains("dark-mode") ? "true" : "false");
  };

  if (localStorage.getItem("modoNocturno") === "true") {
    body.classList.add("dark-mode");
    body.classList.remove("light-mode");
    toggleMode.textContent = "☀️";
  }
}

/**
 * Configura el menú hamburguesa para dispositivos móviles.
 */
function configurarMenuHamburguesa() {
  const menuToggle = document.getElementById('menu-toggle');
  const mainHeader = document.getElementById('main-header');

  menuToggle.addEventListener('click', () => {
    mainHeader.classList.toggle('show');
    document.body.classList.toggle('no-scroll', mainHeader.classList.contains('show'));
  });

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
          btnNext.click();
          setTimeout(() => startBtn.click(), 500);
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
      localStorage.setItem("ultimaObra", clave);
      localStorage.setItem("ultimoCapitulo", capitulo);
      cargarCapitulo(clave, capitulo, 1);
    });
  });
}

/**
 * Carga la última lectura guardada en localStorage.
 */
function cargarUltimaLectura() {
  const ultimaObra = localStorage.getItem("ultimaObra");
  const ultimoCapitulo = localStorage.getItem("ultimoCapitulo");
  const ultimaPagina = parseInt(localStorage.getItem("ultimaPagina"), 10);
  if (ultimaObra && ultimoCapitulo) {
    cargarCapitulo(ultimaObra, ultimoCapitulo, !isNaN(ultimaPagina) ? ultimaPagina : 1);
  }
}

/**
 * Redirige a la ficha del libro correspondiente.
 */
function onLibroClick(libroId) {
  localStorage.setItem('libroSeleccionado', libroId);
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
      localStorage.setItem("ultimaPagina", 1);
      localStorage.setItem("ultimaObra", clave);
      localStorage.setItem("ultimoCapitulo", prevCap.numCapitulo);
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
      localStorage.setItem("ultimaPagina", 1);
      localStorage.setItem("ultimaObra", clave);
      localStorage.setItem("ultimoCapitulo", nextCap.numCapitulo);
      cargarCapitulo(clave, nextCap.numCapitulo, 1);
    };
  } else {
    btnNext.disabled = true;
    btnNext.onclick = null;
  }
}
