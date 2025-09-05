// 📦 Importación de módulos
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';
import { cargarlibro } from './libroficha.js';

// 🚀 Evento principal: cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  // 🧩 Estilo específico para dispositivos Apple
  if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream) {
    document.body.classList.add('ios');
  }

  // 📅 Inserta el año actual en el footer
  const footElement = document.getElementById('copyjabra');
  if (footElement) {
    footElement.innerHTML = `<p>&copy; ${new Date().getFullYear()} JabraScan. No oficial, sin fines de lucro.</p>`;
  }

  // 🔍 Detección automática de ruta SPA
  let ruta = null;
  const params = new URLSearchParams(location.search);

  if (params.has("redirect")) {
    // Si viene desde 404.html con redirección
    ruta = params.get("redirect").replace(/^\/+/, "");

    // ❌ No usamos history.replaceState para evitar romper rutas relativas
    // ✅ Mantener index.html?redirect=... para que fetch('books/...') funcione correctamente
  } else {
    // Elimina la parte inicial del pathname que corresponde al proyecto
    const path = location.pathname.replace(/\/index\.html$/, "").replace(/^\/+/, "");
    const pathParts = path.split('/');
    ruta = pathParts.length > 1 ? pathParts.slice(1).join('/') : pathParts[0];
  }

  // Carga la vista correspondiente si hay ruta válida
  if (ruta) manejarRuta(ruta);

  // 🔗 Enlaces internos con atributo personalizado [data-target]
  document.querySelectorAll("[data-target]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const url = link.getAttribute("data-target");

      if (url === "index.html") {
        // Redirige a la raíz del proyecto sin recargar
        const base = window.location.origin + window.location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
        window.location.href = base;
      } else {
        // ✅ Carga la vista sin modificar la URL visible
        manejarRuta(url);
      }
    });
  });

  // 📚 Botón "Seguir leyendo" si hay progreso guardado
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

      // Inicializa lógica específica si es la vista de últimos capítulos
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
    // Carga ficha de la obra
    fetch('books/libro-ficha.html')
      .then(res => res.text())
      .then(html => {
        mainElement.innerHTML = html;
        cargarlibro(obra); // carga datos específicos de la obra
      })
      .catch(err => console.error('Error:', err));
  } else {
    // Carga lector PDF con capítulo
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
  if (!ruta || ruta === "index.html") return;

  if (ruta.endsWith(".html")) {
    cargarVista(ruta);
    return;
  }

  const partes = ruta.split('/');
  const obra = partes[0];
  const capitulo = partes[1]?.startsWith("Chapter") ? parseInt(partes[1].replace("Chapter", "")) : null;

  if (obra) {
    abrirObraCapitulo(obra, capitulo);
  } else {
    console.warn("Ruta no válida:", ruta);
  }
}
