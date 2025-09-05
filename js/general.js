// 📦 Importación de módulos necesarios para la SPA
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';
import { cargarlibro } from './libroficha.js';

// 🚀 Evento principal: se ejecuta cuando el DOM está completamente cargado
document.addEventListener("DOMContentLoaded", () => {
  // 🧩 Detecta si el usuario está en un dispositivo Apple y aplica clase CSS
  if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream) {
    document.body.classList.add('ios');
  }

  // 📅 Inserta el año actual en el footer con el ID "copyjabra"
  const footElement = document.getElementById('copyjabra');
  if (footElement) {
    footElement.innerHTML = `<p>&copy; ${new Date().getFullYear()} JabraScan. No oficial, sin fines de lucro.</p>`;
  }

  // 🔍 Detección automática de ruta SPA desde el parámetro "redirect" o desde el pathname
  let ruta = null;
    // 🧭 Extrae la ruta desde pathname, ignorando el nombre del repositorio
    const repoName = window.location.pathname.split('/')[1];
    const fullPath = window.location.pathname.replace(/^\/+/, "");
    ruta = fullPath.startsWith(repoName + "/")
      ? fullPath.slice(repoName.length + 1)
      : fullPath;
  
      // 🚫 Evita interpretar "index.html" como obra si accedes directamente
      if (!ruta || ruta.includes("index.html")) ruta = null;

  // 🚀 Carga la vista correspondiente si hay una ruta válida
  if (ruta) manejarRuta(ruta);

  // 🔗 Enlaces internos con atributo personalizado [data-target]
  document.querySelectorAll("[data-target]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const url = link.getAttribute("data-target");

      if (url === "index.html") {
        // 🏠 Redirige a la raíz del proyecto sin recargar
        const base = window.location.origin + window.location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
        window.location.href = base;
      } else {
        // 🔄 Carga la vista sin modificar la URL visible
        manejarRuta(url);
      }
    });
  });

  // 📚 Botón "Seguir leyendo" si hay progreso guardado en localStorage
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
});

// 🔙 Maneja navegación con el botón "Atrás" del navegador
window.addEventListener("popstate", () => {
  const path = location.pathname.replace(/\/index\.html$/, "").replace(/^\/+/, "");
  const pathParts = path.split('/');
  const ruta = pathParts.length > 1 ? pathParts.slice(1).join('/') : pathParts[0];

  // 🔄 Si no hay ruta, intenta usar el hash como fallback
  manejarRuta(ruta || location.hash.replace(/^#/, ""));
});

// 📥 Carga vistas genéricas como ultimosCapitulos.html
function cargarVista(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Error al cargar ${url}: ${res.statusText}`);
      return res.text();
    })
    .then(html => {
      document.querySelector("main").innerHTML = html;

      // 🧠 Inicializa lógica específica si es la vista de últimos capítulos
      if (url === "ultimosCapitulos.html") {
        ocultarDisqus?.(); // función opcional
        initUltimosCapitulos();
      }
    })
    .catch(err => console.error("Error:", err));
}

// 📖 Carga una obra o capítulo específico
function abrirObraCapitulo(obra, capitulo = null) {
  const mainElement = document.querySelector('main');
  localStorage.setItem('libroSeleccionado', obra);

  if (capitulo === null) {
    // 📘 Carga ficha de la obra
    fetch('books/libro-ficha.html')
      .then(res => res.text())
      .then(html => {
        mainElement.innerHTML = html;
        cargarlibro(obra); // 🧠 Carga datos específicos de la obra
      })
      .catch(err => console.error('Error:', err));
  } else {
    // 📖 Carga lector PDF con capítulo
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

// 🔗 Actualiza la vista internamente sin modificar la URL visible
export function mostrarurl(obra, capitulo = null) {
  manejarRuta(`${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`);
}

// 🔗 Compatibilidad con hash (enlaces internos)
function mostrarurlDesdeHash(hash) {
  manejarRuta(hash);
}

// 🧭 Interpreta ruta limpia o hash y carga la vista correspondiente
function manejarRuta(ruta) {
  // 🚫 Ignora rutas vacías o que apuntan a index.html
  if (!ruta || ruta === "index.html") return;

  // 📄 Si la ruta termina en .html, carga vista genérica
  if (ruta.endsWith(".html")) {
    cargarVista(ruta);
    return;
  }

  // 📚 Interpretar como obra/capítulo
  const partes = ruta.split('/');
  const obra = partes[0];
  const capitulo = partes[1]?.startsWith("Chapter") ? parseInt(partes[1].replace("Chapter", "")) : null;

  if (obra) {
    abrirObraCapitulo(obra, capitulo);
  } else {
    console.warn("Ruta no válida:", ruta);
  }
}

