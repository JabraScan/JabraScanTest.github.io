// general.js
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';
import { cargarlibro } from './libroficha.js';

// ─────────────────────────────────────────────────────────────
// 🌐 Detección dinámica del subdirectorio base
// Esto permite que la web funcione en cualquier dominio o carpeta
// Ejemplo: https://dominio.com/proyecto/ → basePath = "/proyecto"
// ─────────────────────────────────────────────────────────────
const basePath = (() => {
  const path = window.location.pathname;
  const parts = path.split('/');
  if (parts.length > 2) {
    // Elimina el último segmento si es archivo (index.html, etc.)
    const last = parts.at(-1);
    const isFile = last.includes('.') || last === '';
    return parts.slice(0, isFile ? -1 : parts.length).join('/');
  }
  return '';
})();

// 🔁 Restaurar ruta original si venimos desde 404.html
if (document.referrer.includes('404.html') && sessionStorage.redirectPath) {
  const redirectPath = sessionStorage.redirectPath;
  sessionStorage.removeItem('redirectPath');

  if (redirectPath.startsWith('/')) {
    history.replaceState(null, '', redirectPath);
  }
}

// 🚀 Inicialización al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  // 📱 Estilo específico para iOS
  if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream) {
    document.body.classList.add('ios');
  }

  // 📅 Año actual en el pie de página
  const footElement = document.getElementById('copyjabra');
  const now = new Date();
  footElement.innerHTML = `<p>&copy; ${now.getFullYear()} JabraScan. No oficial, sin fines de lucro.</p>`;

  // 🔗 Navegación SPA con data-target
  document.querySelectorAll("[data-target]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const url = link.getAttribute("data-target");

      if (url === "index.html") {
        // Redirige a la raíz del proyecto sin recargar
        const nuevaUrl = `${window.location.origin}${basePath}/`;
        window.history.pushState(null, "", nuevaUrl);
        manejarRuta();
      } else if (url.startsWith("#")) {
        // Compatibilidad con hash antiguo
        location.hash = url;
      } else {
        // Navegación limpia
        const limpio = url.replace(/^#/, "");
        const nuevaUrl = `${window.location.origin}${basePath}/${limpio}`;
        window.history.pushState(null, "", nuevaUrl);
        manejarRuta();
      }
    });
  });

  // 📖 Botón "Seguir leyendo" desde localStorage
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

  // 🧭 Navegación inicial: convierte hash si existe, o interpreta ruta limpia
  if (!convertirHashARuta()) {
    manejarRuta();
  }
});

// 🔙 Botón "Atrás" del navegador
window.addEventListener("popstate", () => {
  manejarRuta();
});

// 🔁 Convierte enlaces antiguos con hash (#Obra/ChapterX) en rutas limpias
function convertirHashARuta() {
  const hash = window.location.hash;
  if (!hash) return false;

  const limpio = hash.replace(/^#/, "");
  const nuevaUrl = `${window.location.origin}${basePath}/${limpio}`;
  window.history.replaceState(null, "", nuevaUrl);
  return true;
}

// 📦 Carga vistas genéricas como disclaimer.html
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
    fetch('books/libro-ficha.html')
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

// 🔗 Actualiza la URL con ruta limpia
export function mostrarurl(obra, capitulo = null) {
  const nuevaRuta = `${basePath}/${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`;
  window.history.pushState(null, "", nuevaRuta);
  manejarRuta();
}

// 🧭 Interpreta la ruta actual y carga la vista correspondiente
function manejarRuta() {
  const fullParts = window.location.pathname.split('/').filter(Boolean);

  // Ignorar si estamos en index.html directamente
  const lastSegment = fullParts.at(-1);
  if (lastSegment === 'index.html') return;

  // Detectar posición del basePath
  const baseIndex = fullParts.findIndex(part => part === basePath.replace("/", ""));
  const obra = fullParts[baseIndex + 1];
  const capSegment = fullParts[baseIndex + 2];
  const capitulo = capSegment?.startsWith("Chapter") ? parseInt(capSegment.replace("Chapter", "")) : null;

  if (!obra) return;

  if (capSegment?.endsWith(".html")) {
    cargarVista(capSegment);
  } else {
    abrirObraCapitulo(obra, capitulo);
  }
}
