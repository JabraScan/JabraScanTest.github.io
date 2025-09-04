import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';
import { cargarlibro } from './libroficha.js';

document.addEventListener("DOMContentLoaded", () => {
  // 📱 Detección de iOS para aplicar estilos específicos
  if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream) {
    document.body.classList.add('ios');
  }

  // 📅 Inserta el año actual en el pie de página
  const footElement = document.getElementById('copyjabra');
  const now = new Date();
  footElement.innerHTML = `<p>&copy; ${now.getFullYear()} JabraScan. No oficial, sin fines de lucro.</p>`;

  // 🔗 Enlaces con atributo data-target para cargar vistas genéricas
  document.querySelectorAll("[data-target]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const url = link.getAttribute("data-target");
      if (url === "index.html") {
        window.location.href = window.location.origin + window.location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
      } else {
        const nuevaUrl = `${window.location.origin}/${url}`;
        window.history.pushState(null, "", nuevaUrl);
        manejarRuta(); // 🔄 Carga la vista correspondiente
      }
    });
  });

  // 📖 Botón "Seguir leyendo" para reanudar lectura desde localStorage
  const ultimaObra = localStorage.getItem("ultimaObra");
  const ultimoCapitulo = localStorage.getItem("ultimoCapitulo");

  if (ultimaObra && ultimoCapitulo) {
    const btnSeguir = document.getElementById("btnSeguir");
    if (btnSeguir) {
      btnSeguir.classList.remove("inactive");
      btnSeguir.classList.add("active");
      btnSeguir.addEventListener("click", () => {
        mostrarurl(ultimaObra, parseInt(ultimoCapitulo, 10));
        abrirLectorPDF();
      });
    }
  }

  // 🧭 Navegación inicial por ruta limpia
  manejarRuta();
});

// 🔙 Maneja el botón "Atrás" del navegador
window.addEventListener("popstate", () => {
  manejarRuta();
});

// 📦 Función para cargar vistas genéricas como disclaimer.html
function cargarVista(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Error al cargar ${url}: ${res.statusText}`);
      return res.text();
    })
    .then(html => {
      document.querySelector("main").innerHTML = html;
      if (url === "ultimosCapitulos.html") {
        ocultarDisqus?.();
        initUltimosCapitulos();
      }
    })
    .catch(err => console.error("Error:", err));
}

// 📚 Carga una obra o capítulo dinámicamente
function abrirObraCapitulo(obra, capitulo = null) {
  const mainElement = document.querySelector('main');
  localStorage.setItem('libroSeleccionado', obra);

  if (capitulo === null) {
    fetch(`books/${obra}.html`)
      .then(response => {
        if (!response.ok) throw new Error('Error al cargar la ficha: ' + response.statusText);
        return response.text();
      })
      .then(data => {
        mainElement.innerHTML = data;
        cargarlibro(obra);
      })
      .catch(err => console.error('Error:', err));
  } else {
    localStorage.setItem('ultimaObra', obra);
    localStorage.setItem('ultimoCapitulo', capitulo);
    localStorage.setItem("ultimaPagina", 1);
    fetch('lectorpdf.html')
      .then(r => r.text())
      .then(html => {
        mainElement.innerHTML = html;
        import('./lector.js')
          .then(modulo => modulo.abrirLectorPDF())
          .catch(err => console.error('Error al cargar lector.js:', err));
      });
  }
}

// 🔗 Actualiza la URL con ruta limpia (sin hash)
export function mostrarurl(obra, capitulo = null) {
  const baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
  const nuevaRuta = `${baseUrl}/${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`;
  window.history.pushState(null, "", nuevaRuta);
  manejarRuta(); // 🔄 Carga el contenido correspondiente
}

// 🧭 Interpreta la ruta actual y carga la vista correspondiente
function manejarRuta() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const obra = pathParts[1];
  const cap = pathParts[2];
  const capitulo = cap?.startsWith("Chapter") ? parseInt(cap.replace("Chapter", "")) : null;

  if (!obra) return;

  if (cap?.endsWith(".html")) {
    cargarVista(cap);
  } else {
    abrirObraCapitulo(obra, capitulo);
  }
}
