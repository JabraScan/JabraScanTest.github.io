// general.js
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';

document.addEventListener("DOMContentLoaded", () => {
  // Detección de iOS
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
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
