document.addEventListener("DOMContentLoaded", () => {
  // 📱 Detección de iOS para aplicar estilos específicos
  if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && !window.MSStream) {
    document.body.classList.add('ios');
  }

  // 📅 Inserta el año actual en el pie de página
  const footElement = document.getElementById('copyjabra');
  const now = new Date();
  const annCurso = now.getFullYear();
  footElement.innerHTML = `<p>&copy; ${annCurso} JabraScan. No oficial, sin fines de lucro.</p>`;

  // 🔗 Enlaces con atributo data-target para cargar vistas HTML dinámicas
    document.querySelectorAll("[data-target]").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const url = link.getAttribute("data-target");
        cargarVista(url); // ✅ Reutiliza la función
      });
    });
  // 📖 Botón "Seguir leyendo" para reanudar lectura desde localStorage
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

  // 🧭 Navegación por hash al cargar la página
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  // 📄 Si el hash apunta a una página genérica como disclaimer.html
  if (hash.endsWith(".html")) {
    cargarVista(hash);
    return; // ⛔ Evita ejecutar lógica de obra/capítulo
  }

  // 📚 Si el hash representa una obra o capítulo
  const [obra, cap] = hash.split('/');
  const capitulo = cap?.startsWith("Chapter") ? parseInt(cap.replace("Chapter", "")) : null;

  if (obra) abrirObraCapitulo(obra, capitulo);
});

// 🔙 Maneja el botón "Atrás" del navegador
      window.addEventListener("hashchange", () => {
        const hash = location.hash.slice(1);
        if (!hash) return;
      
        // 📄 Si el hash apunta a una página genérica como disclaimer.html
        if (hash.endsWith(".html")) {
          cargarVista(hash);
          return;
        }
      
        // 📚 Si el hash representa una obra o capítulo
        const [obra, cap] = hash.split('/');
        const capitulo = cap?.startsWith("Chapter") ? parseInt(cap.replace("Chapter", "")) : null;
      
        if (obra) abrirObraCapitulo(obra, capitulo);
      });

// 📦 Función para cargar páginas genéricas como disclaimer.html
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
  } /*else {
    // 📖 Carga el capítulo específico
    fetch(`books/capitulos/${obra}-capitulo${capitulo}.html`)
      .then(response => {
        if (!response.ok) throw new Error('Error al cargar el capítulo: ' + response.statusText);
        return response.text();
      })
      .then(data => {
        mainElement.innerHTML = data;
        cargarCapitulo(obra, capitulo); // Función externa que carga los datos del capítulo
      })
      .catch(err => console.error('Error:', err));
  }*/
}
