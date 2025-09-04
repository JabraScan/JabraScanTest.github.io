// general.js
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';
import { cargarlibro } from './libroficha.js';

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
    // ✅ Este módulo gestiona la navegación de obras y capítulos
    export function mostrarurl(obra, capitulo = null) {
      // 🧭 Construye la ruta hash
      const nuevaHash = `#${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`;
    
      // 🔄 Actualiza la URL con hash
      location.hash = nuevaHash;
    
      // 🧠 Llama a la función correspondiente
      /*if (capitulo === null) {
        cargarlibro(obra);
      } else {
        cargarcapitulo(obra, capitulo);
      }*/
    }

    // 🔙 Maneja el botón "Atrás" del navegador
      window.addEventListener("hashchange", () => {
        const path = location.hash.slice(1).split("/"); // Elimina el "#"
      
        const obra = path[0] || null;
        const capitulo = path.length >= 2 && path[1].startsWith("Chapter")
          ? parseInt(path[1].replace("Chapter", ""))
          : null;
      
        if (obra) {
          if (capitulo === null) {
            cargarlibro(obra);
          } else {
            cargarcapitulo(obra, capitulo);
          }
        }
      });

    
    // 🚀 Detecta acceso directo por URL al cargar la página
      window.addEventListener("DOMContentLoaded", () => {
        const path = location.hash.slice(1).split("/");
      
        const obra = path[0] || null;
        const capitulo = path.length >= 2 && path[1].startsWith("Chapter")
          ? parseInt(path[1].replace("Chapter", ""))
          : null;
      
        if (obra) {
          if (capitulo === null) {
            cargarlibro(obra);
          } else {
            cargarcapitulo(obra, capitulo);
          }
        }
      });

