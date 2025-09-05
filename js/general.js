// general.js
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';
import { cargarlibro } from './libroficha.js';

document.addEventListener("DOMContentLoaded", () => {
  // Estilo iOS
  if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream) {
    document.body.classList.add('ios');
  }

  // Año en el footer
  const footElement = document.getElementById('copyjabra');
  if (footElement) {
    footElement.innerHTML = `<p>&copy; ${new Date().getFullYear()} JabraScan. No oficial, sin fines de lucro.</p>`;
  }
  const ruta = obtenerRutaSPA();
  if (ruta) {
    manejarRuta(ruta);
  }
  // Enlaces internos
  document.querySelectorAll("[data-target]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const url = link.getAttribute("data-target");
      if (url === "index.html") {
        window.location.href = window.location.origin + window.location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
      } else {
        mostrarurlDesdeHash(url);
      }
    });
  });

  // Botón "Seguir leyendo"
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

  // Redirección desde 404.html
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  if (redirect) {
    const ruta = redirect.replace(/^\/+/, "");
    manejarRuta(ruta);
    return;
  }

  // Rutas limpias
  const rutaLimpia = location.pathname.replace(/\/index\.html$/, "").replace(/^\/+/, "");
  if (rutaLimpia && rutaLimpia !== "") {
    manejarRuta(rutaLimpia);
    return;
  }

  // Compatibilidad con hash
  if (location.hash) {
    manejarRuta(location.hash.replace(/^#/, ""));
  }
});

// Botón "Atrás"
window.addEventListener("popstate", () => {
  const ruta = location.pathname.replace(/\/index\.html$/, "").replace(/^\/+/, "");
  manejarRuta(ruta || location.hash.replace(/^#/, ""));
});

// Carga vistas genéricas
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

// Carga obra o capítulo
function abrirObraCapitulo(obra, capitulo = null) {
  const mainElement = document.querySelector('main');
  localStorage.setItem('libroSeleccionado', obra);

  if (capitulo === null) {
    fetch('books/libro-ficha.html')
      .then(res => res.text())
      .then(html => {
        mainElement.innerHTML = html;
        cargarlibro(obra);
      })
      .catch(err => console.error('Error:', err));
  } else {
    localStorage.setItem('ultimaObra', obra);
    localStorage.setItem('ultimoCapitulo', capitulo);
    localStorage.setItem("ultimaPagina", 1);
    fetch('lectorpdf.html')
      .then(res => res.text())
      .then(html => {
        mainElement.innerHTML = html;
        import('./lector.js')
          .then(mod => mod.abrirLectorPDF())
          .catch(err => console.error('Error al cargar lector.js:', err));
      });
  }
}

// Actualiza URL limpia
export function mostrarurl(obra, capitulo = null) {
  const base = window.location.origin + window.location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");
  const nuevaRuta = `${base}/${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`;
  window.history.pushState(null, "", nuevaRuta);
  manejarRuta(`${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`);
}

// Compatibilidad con hash
function mostrarurlDesdeHash(hash) {
  const base = window.location.origin + window.location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");
  const nuevaRuta = `${base}/${hash}`;
  window.history.pushState(null, "", nuevaRuta);
  manejarRuta(hash);
}

// Interpreta ruta limpia o hash
function manejarRuta(ruta) {
  if (!ruta) return;

  if (ruta.endsWith(".html")) {
    cargarVista(ruta);
    return;
  }

  const [obra, cap] = ruta.split('/');
  const capitulo = cap?.startsWith("Chapter") ? parseInt(cap.replace("Chapter", "")) : null;

  if (obra) abrirObraCapitulo(obra, capitulo);
}
// Detecta ruta relativa desde el punto de entrada
function obtenerRutaSPA() {
  const basePath = window.location.pathname.replace(/\/index\.html$/, "");
  const rutaRelativa = basePath.replace(/^\/+/, "").split('/');
  const rutaSPA = rutaRelativa.slice(1).join('/'); // Ignora la carpeta base del proyecto
  return rutaSPA || location.hash.replace(/^#/, "");
}
