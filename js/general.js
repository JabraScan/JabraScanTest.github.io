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

  // 🧭 Extrae la ruta limpia desde pathname
  const repoName = window.location.pathname.split('/')[1];
  const fullPath = window.location.pathname.replace(/^\/+/, "");
  const ruta = fullPath.startsWith(repoName + "/")
    ? fullPath.slice(repoName.length + 1)
    : fullPath;

  // 🚫 Ignora rutas vacías o que contienen "index.html"
  if (ruta && !ruta.includes("index.html")) {
    manejarRuta(ruta);
  }

// 🔗 Enlaces internos con atributo personalizado [data-target]
// Este bloque gestiona la navegación dentro de la SPA sin recargar la página.
// Se distingue entre rutas que terminan en ".html" (vistas directas) y rutas dinámicas (obras/capítulos).
    document.querySelectorAll("[data-target]").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault(); // 🚫 Evita que el navegador siga el enlace de forma tradicional
    
        const url = link.getAttribute("data-target"); // 🧭 Obtiene la ruta destino desde el atributo personalizado
        const repoName = window.location.pathname.split('/')[1]; // 📦 Extrae el nombre del repositorio (útil en GitHub Pages)
        const nuevaURL = `/${repoName}/${url}`; // 🛠 Construye la nueva URL interna
    
        // 🧭 Actualiza la URL en el navegador sin recargar la página
        history.pushState({}, "", nuevaURL);
    
        // 📥 Si la ruta termina en ".html", se trata como una vista directa
        // Se carga directamente sin pasar por manejarRuta(), evitando interpretación como obra/capítulo
        if (url.endsWith(".html")) {
          console.log(`Cargando vista directa: ${url}`);
          cargarVista(url); // 👈 Carga el contenido HTML directamente en <main>
        } else {
          // 📚 Si no termina en ".html", se interpreta como obra/capítulo
          // Se delega a manejarRuta() para que decida cómo cargarlo
          console.log(`Navegación interna con ruta: ${url}`);
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
  const repoName = window.location.pathname.split('/')[1];
  const fullPath = window.location.pathname.replace(/^\/+/, "");
  const ruta = fullPath.startsWith(repoName + "/")
    ? fullPath.slice(repoName.length + 1)
    : fullPath;

  manejarRuta(ruta || "");
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
  const repoName = window.location.pathname.split('/')[1];
  const ruta = `${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`;
  history.pushState({}, "", `/${repoName}/${ruta}`);
  manejarRuta(ruta);
}

// 🧭 Interpreta ruta limpia y carga la vista correspondiente
function manejarRuta(ruta) {
  const rutaActual = window.location.pathname.replace(/^\/+/, "").split('/').slice(1).join('/');
  if (ruta === rutaActual) {
    console.log("Ruta ya activa, no se procesa nuevamente.");
    return;
  }

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



