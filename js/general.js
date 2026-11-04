// general.js
import { initUltimosCapitulos } from './ultimoscapitulos.js';
import { abrirLectorPDF } from './lector.js';
import { cargarlibro } from './libroficha.js';
import { renderResumenObras } from './contador.js';
import { syncLocalStorageToCookies, setItem, getItem, removeItem } from "./storage.js";
import { initPWA } from './pwa.js'; // 📱 Importamos la lógica de la PWA

// Helper: carga un script externo sólo una vez y devuelve una Promise
function loadScript(src, globalName) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // Si se pasa un nombre global a comprobar, validamos que la librería ya esté lista
      if (globalName) {
        if (window[globalName]) return resolve();
        // Si existe la etiqueta pero la librería global no está definida (scripts inyectados vía innerHTML no se ejecutan), forzamos la carga
        const s2 = document.createElement('script');
        s2.src = src;
        s2.async = false;
        s2.onload = () => resolve();
        s2.onerror = () => reject(new Error('No se pudo cargar ' + src));
        document.head.appendChild(s2);
        return;
      }
      // Si no necesitamos comprobar global, consideramos que ya está disponible
      return resolve();
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = false; // respetar orden si se añaden múltiples
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // 📱 Detección de iOS y Android para aplicar estilos específicos (mismo diseño para ambos)
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod|Macintosh/.test(userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(userAgent);
  
  if (isIOS) {
    document.body.classList.add('ios');
  }
  
  if (isAndroid) {
    document.body.classList.add('android');
  }

  // 📅 Inserta el año actual en el pie de página
  const footElement = document.getElementById('copyjabra');
  const now = new Date();
  footElement.innerHTML = `<p>&copy; ${now.getFullYear()} JabraScan. No oficial, sin fines de lucro.</p>`;

  // Efecto sticky header con sombra al hacer scroll
  const header = document.querySelector('header');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  });

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
  const ultimaObra = getItem("ultimaObra");
  const ultimoCapitulo = getItem("ultimoCapitulo");
  const btnSeguir = document.getElementById("btnSeguir");

  const tieneLecturaValida = (
    ultimaObra && ultimoCapitulo &&
    ultimaObra !== "null" && ultimoCapitulo !== "null"
  );

  if (btnSeguir) {
    if (tieneLecturaValida) {
      btnSeguir.classList.remove("inactive");
      btnSeguir.classList.add("active");
      btnSeguir.style.display = "";
      btnSeguir.onclick = () => {
        mostrarurl(ultimaObra, parseInt(ultimoCapitulo, 10));
        abrirLectorPDF();
      };
    } else {
      // No hay datos: mantener inactivo y ocultar
      btnSeguir.classList.add("inactive");
      btnSeguir.classList.remove("active");
      btnSeguir.style.display = "none";
      btnSeguir.onclick = null;
    }
  }
  syncLocalStorageToCookies();
  
  // 🤖 REGISTRA EL SERVICE WORKER (PWA)
  // 📱 INICIALIZAR LÓGICA DEL BOTÓN PWA
  initPWA();

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
      // Al salir del lector, aseguramos que el header global esté visible y quitamos clase de lector
      const globalHeader = document.querySelector('header');
      if (globalHeader) globalHeader.style.display = '';
      document.body.classList.remove('reader-page');

      // 🛠️ Inicialización específica por vista
      if (url === "ultimosCapitulos.html") {
        window.ocultarDisqus?.();
        initUltimosCapitulos();
      } else if (url === "counts.html") {
        // Cargar Chart.js y plugin antes de renderizar para evitar carga global innecesaria
          window.ocultarDisqus?.();
        //const chartUrl = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        //const datalabelsUrl = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0';
        const chartUrl = './js/chart.umd.min.js';
        const datalabelsUrl = './js/chartjs-plugin-datalabels@2.2.0';
        loadScript(chartUrl, 'Chart')
          .then(() => loadScript(datalabelsUrl, 'ChartDataLabels'))
          .then(() => renderResumenObras())
          .catch(err => {
            console.error('Error cargando librerías de gráficos:', err);
            renderResumenObras(); // intentar renderizar de todos modos (mostrará error internamente si falta Chart)
          });
      } else if (url === "login.html") {
          // Al entrar en login, aseguramos que los datos críticos estén también en cookie
          syncLocalStorageToCookies();
          //
          const attachLoginListeners = () => {
              [
                { sel: "#btnGoogle", fn: loginGoogle },
                { sel: "#btnMeta", fn: loginMeta },
                { sel: "#btnTwitter", fn: loginTwitter }
              ].forEach(({ sel, fn }) => {
                const el = document.querySelector(sel);
                el?.removeEventListener("click", fn);
                el?.addEventListener("click", fn);
              });
            };        
          const existing = document.querySelector('script[src="js/login.js"]');
          if (!existing) {
            const script = document.createElement("script");
            script.src = "js/login.js";
            script.onload = attachLoginListeners; // listeners tras cargar
            document.body.appendChild(script);
          } else {
            attachLoginListeners(); // listeners aunque ya esté cargado
          }
      /*} else if (url === "usuario.html") {
        window.ocultarDisqus?.();
        const existing = document.querySelector('script[src="/js/usuario.js"]');
        if (!existing) {
          const script = document.createElement("script");
          script.src = "js/usuario.js";
          script.onload = () => {
            if (window.initUsuario) window.initUsuario();
          };
          script.onerror = () => console.error("Error cargando js/usuario.js");
          document.body.appendChild(script);
        } else {
          // si el script ya estaba en la página, asumimos que ya se ejecutó y la función está disponible
          if (window.initUsuario) window.initUsuario();
        }
      }*/
      } else if (url === "usuario.html") {
        window.ocultarDisqus?.();
      
          // Evita cargar dos veces: comprobamos un flag en window
          if (!window.__usuario_loaded__) {
            import("/js/usuario.js")
              .then(module => {
                if (typeof module.initUsuario === "function") {
                  // Llamamos al init del módulo una vez que el HTML ya fue insertado
                  module.initUsuario();
                } else {
                  console.error("initUsuario no exportado desde /js/usuario.js");
                }
                window.__usuario_loaded__ = true;
              })
              .catch(err => console.error("Error importando /js/usuario.js", err));
          } else {
            // Ya cargado: intentamos reutilizar la API expuesta en window.usuarioAPI
            if (window.usuarioAPI && typeof window.usuarioAPI.initUsuario === "function") {
              window.usuarioAPI.initUsuario();
            } else if (typeof window.initUsuario === "function") {
              // fallback por compatibilidad si expones initUsuario globalmente
              window.initUsuario();
            } else {
              console.log("usuario ya cargado (no hay initUsuario expuesto)");
            }
          }
      }


      // Puedes añadir más inicializaciones aquí si lo necesitas
    })
    .catch(err => console.error("Error:", err));
}


// 📚 Carga una obra o capítulo dinámicamente
function abrirObraCapitulo(obra, capitulo = null) {
  const mainElement = document.querySelector('main');
  setItem('libroSeleccionado', obra);

  if (capitulo === null) {
    // 🔍 Carga la ficha de la obra
    fetch('books/libro-ficha.html')
      .then(response => {
        if (!response.ok) throw new Error('Error al cargar la ficha: ' + response.statusText);
        return response.text();
      })
      .then(data => {
        mainElement.innerHTML = data;
        // Cargar Disqus dinámicamente sólo cuando se muestra la ficha de la obra
        loadScript('js/disqus.js')
          .catch(err => console.warn('No se pudo cargar disqus.js:', err))
          .finally(() => {
            try {
              cargarlibro(obra); // Función externa que carga los datos del libro
            } catch (e) {
              console.error('Error al ejecutar cargarlibro:', e);
            }
          });

        const globalHeader = document.querySelector('header');
        if (globalHeader) globalHeader.style.display = '';
        document.body.classList.remove('reader-page');
      })
      .catch(err => console.error('Error:', err));
  } else {
    // 📖 Carga el capítulo específico
    setItem('ultimaObra', obra);
    setItem('ultimoCapitulo', capitulo);
    setItem("ultimaPagina", 1);
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
  }
}
// 🔗 Actualiza la URL con hash para navegación semántica

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
  //const baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
  const baseUrl = window.location.origin + window.location.pathname.replace(/(?:index|login|ultimoscapitulos|usuario)\.html$/, '');


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



















