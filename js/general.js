// general.js
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';

document.addEventListener("DOMContentLoaded", () => {
  // Detección de iOS
  if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream) {
    document.body.classList.add('ios');
  }

  // Cargar el "copyright" con el año en curso
  const footElement = document.getElementById('copyjabra');
  const now = new Date();
  const annCurso = now.getFullYear();
  footElement.innerHTML = `<p>&copy; ${annCurso} JabraScan. No oficial, sin fines de lucro.</p>`;

  // Enlaces con data-target para cargar HTML dinámico
  document.querySelectorAll("[data-target]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const url = link.getAttribute("data-target");

      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`Error al cargar ${url}: ${res.statusText}`);
          return res.text();
        })
        .then(html => {
          document.querySelector("main").innerHTML = html;

          // Inicialización específica por vista
          if (url === "ultimosCapitulos.html") {
            ocultarDisqus?.(); // si existe
            initUltimosCapitulos();
          }

          // Puedes añadir otras vistas aquí si lo necesitas
        })
        .catch(err => console.error("Error:", err));
    });
  });

  // Botón "Seguir leyendo"
  const ultimaObra = localStorage.getItem("ultimaObra");
  const ultimoCapitulo = localStorage.getItem("ultimoCapitulo");
  const ultimaPagina = parseInt(localStorage.getItem("ultimaPagina"), 10);

  if (ultimaObra && ultimoCapitulo) {
    const spanSeguir = document.getElementById("btnSeguir");
    if (spanSeguir) {
      spanSeguir.classList.remove("inactive");
      spanSeguir.classList.add("active");
      spanSeguir.addEventListener("click", () => {
        console.log(`Reanudar: ${ultimaObra} / Cap. ${ultimoCapitulo} / Página ${ultimaPagina}`);
        abrirLectorPDF();
      });
    }
  }
});
// 📌 Función principal para mostrar contenido y actualizar la URL
function mostrarurl(obra, capitulo = null) {
  // Construimos la URL simulada
  let nuevaURL = `/${obra}`;
  if (capitulo !== null) {
    nuevaURL += `/Chapter${capitulo}`;
  }

  // Actualizamos la URL sin recargar la página
  history.pushState({ obra, capitulo }, null, nuevaURL);

  // Generamos el contenido dinámico
  const contenido = generarContenido(obra, capitulo);
  document.getElementById("main").innerHTML = contenido;
}

// 🧠 Función que genera contenido dinámico (puedes personalizarla)
function generarContenido(obra, capitulo) {
  if (!obra) return "<h2>Obra no especificada</h2>";

  let html = `<h2>📖 ${obra}</h2>`;
  if (capitulo !== null) {
    html += `<p>🧩 Capítulo ${capitulo}</p>`;
    html += `<div>Contenido generado dinámicamente para el capítulo ${capitulo} de <strong>${obra}</strong>.</div>`;
  } else {
    html += `<p>Selecciona un capítulo para comenzar a leer.</p>`;
  }

  return html;
}

// 🔙 Manejo del botón "Atrás" del navegador
window.onpopstate = function(event) {
  if (event.state) {
    const { obra, capitulo } = event.state;
    const contenido = generarContenido(obra, capitulo);
    document.getElementById("main").innerHTML = contenido;
  }
};

//mostrar url de donde estamos
    // 📌 Función principal para mostrar contenido y actualizar la URL
    export function mostrarurl(obra, capitulo = null) {
      // Construimos la URL simulada
      let nuevaURL = `/${obra}`;
      if (capitulo !== null) nuevaURL += `/Chapter${capitulo}`;
      // Actualizamos la URL sin recargar la página
      history.pushState({ obra, capitulo }, null, nuevaURL);
    }
    // 🔙 Manejo del botón "Atrás" del navegador
    window.onpopstate = function(event) {
      if (event.state) {
        const { obra, capitulo } = event.state;
        const contenido = generarContenido(obra, capitulo);
        document.getElementById("main").innerHTML = contenido;
      }
    };
    // 🚀 Al cargar la página, analizamos la URL actual
    window.addEventListener("DOMContentLoaded", () => {
      const path = window.location.pathname.split("/").filter(Boolean); // Elimina elementos vacíos
    
      let obra = null;
      let capitulo = null;
    
      if (path.length >= 1) {
        obra = path[0];
      }
      if (path.length >= 2 && path[1].startsWith("Chapter")) {
        capitulo = parseInt(path[1].replace("Chapter", ""));
      }
    
      if (obra) {
        const contenido = generarContenido(obra, capitulo);
        document.getElementById("main").innerHTML = contenido;
      }
    });
//fin mostrar url





