// general.js
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';
import { cargarlibro } from './libroficha.js';
import { renderResumenObras } from './contador.js';

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
              // 🧼 Elimina el hash y recarga la página base
              //window.location.href = window.location.origin + window.location.pathname.split('#')[0];
              window.location.href = window.location.origin + window.location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
            } else {
              location.hash = url; // 🧭 Actualiza el hash para que lo maneje hashchange
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
            mostrarurl(ultimaObra, parseInt(ultimoCapitulo, 10)); // ✅ Usa tu función
            abrirLectorPDF();
          });
        }
      }
    
      // 🧭 Navegación inicial por hash al cargar la página
      manejarHash(location.hash);
    });

// 🔙 Maneja el botón "Atrás" del navegador o cambios de hash
    window.addEventListener("hashchange", () => {
      manejarHash(location.hash);
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
    
          // 🛠️ Inicialización específica por vista
          if (url === "ultimosCapitulos.html") {
            ocultarDisqus?.();
            initUltimosCapitulos();
          } else if (url === "counts.html") {
             ocultarDisqus?.();
             renderResumenObras();
         }
    
          // Puedes añadir más inicializaciones aquí si lo necesitas
        })
        .catch(err => console.error("Error:", err));
    }


// 📚 Carga una obra o capítulo dinámicamente
  function abrirObraCapitulo(obra, capitulo = null) {
    const mainElement = document.querySelector('main');
    localStorage.setItem('libroSeleccionado', obra);

    if (capitulo === null) {
      // 🔍 Carga la ficha de la obra
          fetch('books/libro-ficha.html')
            .then(response => {
              if (!response.ok) throw new Error('Error al cargar la ficha: ' + response.statusText);
              return response.text();
            })
            .then(data => {
              mainElement.innerHTML = data;
              cargarlibro(obra); // Función externa que carga los datos del libro
            })
            .catch(err => console.error('Error:', err));
    } else {
      // 📖 Carga el capítulo específico
          localStorage.setItem('ultimaObra', obra);
          localStorage.setItem('ultimoCapitulo', capitulo);
          localStorage.setItem("ultimaPagina", 1);
          // Cargar dinámicamente lectorpdf.html
            fetch('lectorpdf.html')
              .then(r => r.text())
              .then(html => {
                const main = document.querySelector('main');
                main.innerHTML = html;
            
                // Cargar el módulo dinámicamente
                import('./lector.js')
                  .then(modulo => modulo.abrirLectorPDF())
                  .catch(err => console.error('Error al cargar lector.js:', err));
              });
      /*fetch(`books/capitulos/${obra}-capitulo${capitulo}.html`)
        .then(response => {
          if (!response.ok) throw new Error('Error al cargar el capítulo: ' + response.statusText);
          return response.text();
        })
        .then(data => {
          mainElement.innerHTML = data;
          cargarCapitulo(obra, capitulo); // Función externa que carga los datos del capítulo
        })
        .catch(err => console.error('Error:', err));*/
    }
  }


// 🔗 Actualiza la URL con hash para navegación semántica
  /*export function mostrarurl(obra, capitulo = null) {
    const nuevaHash = `#${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`;
    location.hash = nuevaHash;
  }*/
        /**
         * 📍 Actualiza la URL con un nuevo hash basado en la obra y el capítulo.
         * 🧼 Elimina "index.html" de la ruta si está presente.
         * 🕹️ Usa pushState para guardar la navegación en el historial (permite botón "Atrás").
         * 🚫 No recarga la página.
         *
         * @param {string} obra - Nombre de la obra (ej. "Naruto", "Bleach").
         * @param {string|null} capitulo - Número de capítulo (opcional).
         */
        export function mostrarurl(obra, capitulo = null) {
          // 🧩 Construye el nuevo hash dinámico
          const nuevaHash = `#${obra}${capitulo !== null ? `/Chapter${capitulo}` : ""}`;
        
          // 🧼 Elimina "index.html" si está presente en la URL actual
          const baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
        
          // 🧭 Construye la nueva URL completa con el hash
          const nuevaUrl = `${baseUrl}${nuevaHash}`;
        
          // 🕹️ Actualiza la barra de direcciones y guarda en el historial
          window.history.pushState(null, "", nuevaUrl);
        }

// 🧭 Interpreta el hash actual y carga la vista correspondiente
    function manejarHash(hash) {
      const limpio = hash.replace(/^#/, "");
    
      if (!limpio) return;
    
      if (limpio.endsWith(".html")) {
        // 📄 Página genérica como disclaimer.html
        cargarVista(limpio);
        return;
      }
    
      // 📚 Hash representa una obra o capítulo
      const [obra, cap] = limpio.split('/');
      const capitulo = cap?.startsWith("Chapter") ? parseInt(cap.replace("Chapter", "")) : null;
    
      if (obra) abrirObraCapitulo(obra, capitulo);
    }



