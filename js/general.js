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
      // ✅ Carga obra o capítulo dinámicamente
      function abrirObraCapitulo(obra, capitulo = null) {
        const mainElement = document.querySelector('main');
        localStorage.setItem('libroSeleccionado', obra); // Guarda la obra seleccionada
      
        if (capitulo === null) {
          // 🔍 Carga la ficha de la obra
          fetch('books/libro-ficha.html')
            .then(response => {
              if (!response.ok) {
                throw new Error('Error al cargar el archivo: ' + response.statusText);
              }
              return response.text();
            })
            .then(data => {
              mainElement.innerHTML = data;
              cargarlibro(obra); // Función externa que carga los datos del libro
            })
            .catch(err => console.error('Error:', err));
        } else {
          // 📖 Carga el capítulo específico
          fetch(`books/capitulos/${obra}-capitulo${capitulo}.html`)
            .then(response => {
              if (!response.ok) {
                throw new Error('Error al cargar el capítulo: ' + response.statusText);
              }
              return response.text();
            })
            .then(data => {
              mainElement.innerHTML = data;
              cargarCapitulo(obra, capitulo); // Función externa que carga los datos del capítulo
            })
            .catch(err => console.error('Error:', err));
        }
      }
      
      // 🔗 Actualiza la URL con hash para navegación
      export function mostrarurl(obra, capitulo = null) {
        const nuevaHash = `#${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`;
        location.hash = nuevaHash;
      }
      
      // 🔙 Maneja el botón "Atrás" del navegador
      window.addEventListener("hashchange", () => {
        const path = location.hash.slice(1).split("/");
        const obra = path[0] || null;
        const capitulo = path.length >= 2 && path[1].startsWith("Chapter")
          ? parseInt(path[1].replace("Chapter", ""))
          : null;
      
        if (obra) {
          abrirObraCapitulo(obra, capitulo);
        } else {
          // 🏠 Si no hay hash, vuelve a la página principal
          location.href = 'index.html';
        }
      });
      
      // 🚀 Detecta acceso directo por URL al cargar la página
      document.addEventListener("DOMContentLoaded", () => {
        const hash = window.location.hash.slice(1);
        if (!hash) return;
      
        const path = hash.split('/');
        const obra = path[0] || null;
        const capitulo = path.length >= 2 && path[1].startsWith("Chapter")
          ? parseInt(path[1].replace("Chapter", ""))
          : null;
      
        if (obra) {
          abrirObraCapitulo(obra, capitulo);
        }
      });
