//import { initLectorPDF } from './lectorpdfmod.js';
export function abrirLectorPDF() {
  fetch('lectorpdf.html')
    .then(r => r.text())
    .then(html => {
      document.querySelector('main').innerHTML = html;

      //if (typeof initlectorpdf === "function") {
        initlectorpdf();
      /*} else {
        const script = document.createElement('script');
        script.src = 'js/lectorpdfmod.js';
        script.onload = () => initlectorpdf();
        document.body.appendChild(script);
      }*/
    })
    .catch(err => console.error('Error cargando lectorpdf.html:', err));
}

import { parseDateDMY, parseChapterNumber } from './utils.js';

let pdfDoc = null;
let pageNum = 1;
let canvas, ctx, pageInfo, body;

export function initLectorPDF() {
  canvas = document.getElementById("pdfCanvas");
  ctx = canvas.getContext("2d");
  pageInfo = document.getElementById("pageInfo");
  body = document.body;

  configurarModoOscuro();
  configurarMenuHamburguesa();
  configurarBotonesLectura();
  configurarEnlacesPDF();
  cargarUltimaLectura();
}

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

        const cap = capitulosObra[idx];
        actualizarTituloObra(cap.tituloObra, clave);
        cargarPDF(clave, cap.NombreArchivo, paginaInicial, idx, capitulosObra);
        configurarSelectorCapitulos(capitulo, capitulosObra, clave);
      })
    )
    .catch(err => console.error("Error al cargar el capítulo:", err));
}

function cargarPDF(clave, nombreArchivo, paginaInicial, idx, capitulosObra) {
  const pdfPath = `books/${clave}/${encodeURIComponent(nombreArchivo)}`;
  pdfjsLib.getDocument(pdfPath).promise.then(doc => {
    pdfDoc = doc;
    pageNum = paginaInicial;
    renderPage(pageNum);
    actualizarBotonesNav(idx, capitulosObra, clave);
  });
}

function actualizarTituloObra(titulo, clave) {
  const h1 = document.getElementById("tituloObraPdf");
  h1.textContent = titulo;
  h1.onclick = () => onLibroClick(clave);

  if (clave === "CallateDragonaMalvadaNoQuieroTenerMasHijosContigo") {
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

function cargarUltimaLectura() {
  const ultimaObra = localStorage.getItem("ultimaObra");
  const ultimoCapitulo = localStorage.getItem("ultimoCapitulo");
  const ultimaPagina = parseInt(localStorage.getItem("ultimaPagina"), 10);
  if (ultimaObra && ultimoCapitulo) {
    cargarCapitulo(ultimaObra, ultimoCapitulo, !isNaN(ultimaPagina) ? ultimaPagina : 1);
  }
}

// Función auxiliar para redirigir a la ficha del libro
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




