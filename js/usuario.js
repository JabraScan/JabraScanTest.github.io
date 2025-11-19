// -------------------------
// Config y constantes
// -------------------------
const API_BASE = "https://jabrascan.net";
const usuario_id = localStorage.getItem("user_id");
const nickname = localStorage.getItem("user_nickname");
const avatar = localStorage.getItem("user_avatar");
const token = localStorage.getItem("jwt");

// -------------------------
// Redirección si no hay login (no bloquea el resto del código)
// -------------------------
  function getHashPage() {
    return (location.hash || '').replace(/^#\/?/, '').split(/[?#]/, 1)[0].replace(/\/$/, '');
  }
  const protectedPages = new Set(['usuario', 'usuario.html', 'login', 'login.html']);
  const page = getHashPage();
  if (protectedPages.has(page) && !usuario_id) {
    window.location.replace('/');
  }
// -------------------------
// Helpers
// -------------------------
/**
 * ensureBootstrap()
 * Inserta CSS/JS de Bootstrap solo si no están presentes.
 */
(function ensureBootstrap() {
  const hasBootstrapCSS = Array.from(document.styleSheets)
    .some(s => s.href && s.href.includes("bootstrap"));
  if (!hasBootstrapCSS) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
    document.head.appendChild(link);
  }

  const hasBootstrapJS = Array.from(document.scripts)
    .some(s => s.src && s.src.includes("bootstrap"));
  if (!hasBootstrapJS) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
    document.body.appendChild(script);
  }
})();

/**
 * authFetch(input, init)
 * Wrapper de fetch que añade Authorization Bearer si existe token
 */
function authFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// -------------------------
// API Worker: funciones que consultan el backend
// -------------------------
export async function cargarPerfil() {
  console.log('cargaPerfil');
  if (!usuario_id && !token) return;

  const url = token
    ? `${API_BASE}/usuarios/get`
    : `${API_BASE}/usuarios/get?usuario_id=${encodeURIComponent(usuario_id)}`;
  console.log(`url : ${url} - user ${usuario_id} - token ${token}`);

  const res = await authFetch(url);
  const data = await res.json();

  const idEl = document.getElementById("usuario_id");
  const nickEl = document.getElementById("nick");
  const avatarEl = document.getElementById("avatar");

  if (idEl) idEl.textContent = data.usuario_id || usuario_id;
  if (nickEl) nickEl.textContent = data.nick || "(sin nick)";
  if (avatarEl) avatarEl.src = data.avatar || "/img/avatar/default.webp";
}
/*
export async function cargarBiblioteca() {
  if (!usuario_id && !token) return;

  const url = token
    ? `${API_BASE}/biblioteca/list`
    : `${API_BASE}/biblioteca/list?usuario_id=${encodeURIComponent(usuario_id)}`;

  const res = await authFetch(url);
  const data = await res.json();

  const cont = document.getElementById("bibliotecaResultado");
  if (!cont) return;

  let html = "<ul class='list-group'>";
  (Array.isArray(data) ? data : []).forEach(o => {
    html += `<li class="list-group-item">
      <strong>${o.nombreobra || ''}</strong> (Estado: ${o.estado || '-'})<br>
      Última lectura: ${o.fechaUltimaLectura || "-"}
    </li>`;
  });
  html += "</ul>";
  cont.innerHTML = html;
}*/
export async function cargarBiblioteca() {
  if (!usuario_id && !token) return;

  const url = token
    ? `${API_BASE}/biblioteca/list`
    : `${API_BASE}/biblioteca/list?usuario_id=${encodeURIComponent(usuario_id)}`;

  const res = await authFetch(url);
  const data = await res.json();

  const cont = document.getElementById("bibliotecaResultado");
  if (!cont) return;

  const ul = document.createElement("ul");
  ul.className = "list-group";
    (Array.isArray(data) ? data : []).forEach(item => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex gap-3 align-items-start";
      li.dataset.obraId = item.obra_id ?? "";
  
      // construimos src de imagen sólo si viene o si FALLBACK_IMG está definido
      const srcCandidate = item.imagen || (item.obra_id ? `/books/${item.obra_id}/${item.imagen || ""}` : "");
      const imgSrc = srcCandidate || FALLBACK_IMG || "";
  
      li.innerHTML = `
        <img src="${imgSrc}" ${imgSrc ? `onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"` : ''} 
             alt="${item.nombreobra || 'Portada'}" class="img-thumbnail" style="width:96px;height:128px;object-fit:cover;">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">
            <h5 class="mb-1">${item.nombreobra || ''}</h5>
            <small class="text-muted">${item.estado ? `Estado: ${item.estado}` : ''}</small>
          </div>
          <p class="mb-1">Capítulo ${item.numCapitulo ?? item.ultimoCapituloLeido ?? '-'}: ${item.nombreCapitulo || '-'}</p>
          <small class="text-muted">Última lectura: ${item.fechaUltimaLectura || '-'}</small>
          <input type="hidden" class="obra-id" value="${item.obra_id ?? ''}">
        </div>
      `;
  
      ul.appendChild(li);
    });
  cont.appendChild(ul);
}

export async function cargarObras() {
  if (!usuario_id && !token) return;

  const perfilUrl = token
    ? `${API_BASE}/usuarios/get`
    : `${API_BASE}/usuarios/get?usuario_id=${encodeURIComponent(usuario_id)}`;
  const perfilRes = await authFetch(perfilUrl);
  const perfil = await perfilRes.json();

  const cont = document.getElementById("obrasResultado");
  if (!cont) return;

  if (perfil.rol !== "uploader" && perfil.rol !== "admin") {
    cont.innerHTML = "<div class='alert alert-info'>No eres uploader, no tienes obras propias.</div>";
    return;
  }

  const obrasUrl = `${API_BASE}/obras/search?visible=1&uploader=${encodeURIComponent(usuario_id || "")}`;
  const obrasRes = await authFetch(obrasUrl);
  const obras = await obrasRes.json();

  let html = "<ul class='list-group'>";
  (Array.isArray(obras) ? obras : []).forEach(o => {
    html += `<li class="list-group-item">
      <strong>${o.titulo || o.nombreobra || ''}</strong><br>
      Categoría: ${o.categoria || "-"}
    </li>`;
  });
  html += "</ul>";
  cont.innerHTML = html;
}

// -------------------------
// Avatar loader (lee índice de directorio /img/avatar/)
// - intenta GET /img/avatar/ y parsea el HTML índice si existe
// - si no hay índice, muestra mensaje y no reintenta
// - carga una sola vez al activarse la pestaña
// -------------------------
(function setupAvatarLoader() {
  function init() {
    const avatarTabBtn = document.querySelector('#avatar-tab');
    const avatarResultEl = document.querySelector('#avatarResultado');
    if (!avatarTabBtn || !avatarResultEl) return;

    let avatarsLoaded = false;
    let loadingInProgress = false;

    function renderAvatars(list) {
      const row = document.createElement('div');
      row.className = 'row g-2';
      list.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-6 col-sm-4 col-md-3 col-lg-2';
        const card = document.createElement('div');
        card.className = 'card p-1 text-center';
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.alt || '';
        img.className = 'img-fluid rounded';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          document.querySelectorAll('#avatarResultado img.selected')
            .forEach(i => i.classList.remove('selected','border','border-primary'));
          img.classList.add('selected','border','border-primary');
        });
        const caption = document.createElement('div');
        caption.className = 'small text-truncate mt-1';
        caption.textContent = item.alt || '';
        card.appendChild(img);
        card.appendChild(caption);
        col.appendChild(card);
        row.appendChild(col);
      });
      avatarResultEl.innerHTML = '';
      avatarResultEl.appendChild(row);
    }

    function extractImageNamesFromHtml(htmlText) {
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      const candidates = new Set();
      Array.from(doc.querySelectorAll('a[href]')).forEach(a => {
        const href = a.getAttribute('href');
        if (href) candidates.add(href);
      });
      Array.from(doc.querySelectorAll('img[src]')).forEach(i => {
        const src = i.getAttribute('src');
        if (src) candidates.add(src);
      });
      const imgs = [];
      const IMG_RE = /\.(webp|jpe?g|png)$/i;
      candidates.forEach(p => {
        if (/^https?:\/\//i.test(p)) return;
        const name = p.split('/').filter(Boolean).pop();
        if (name && IMG_RE.test(name)) imgs.push(name);
      });
      return Array.from(new Set(imgs));
    }

    async function loadAvatarsFromDirectoryIndex() {
      if (avatarsLoaded || loadingInProgress) return;
      loadingInProgress = true;
      avatarResultEl.innerHTML = '<div class="text-center py-4">Cargando avatares…</div>';
      try {
        const resp = await fetch('/img/avatar/', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('no directory index');
        const text = await resp.text();
        const names = extractImageNamesFromHtml(text);
        if (!names.length) throw new Error('no images in index');
        const list = names
          .filter(n => /\.(webp|jpe?g|png)$/i.test(n))
          .map(n => ({ src: `img/avatar/${n}`, alt: n.replace(/\.(webp|jpe?g|png)$/i, '') }));
        renderAvatars(list);
        avatarsLoaded = true;
        loadingInProgress = false;
        return;
      } catch (e) {
        avatarResultEl.innerHTML = '<div class="text-center py-4 text-muted">No hay avatares disponibles.</div>';
        avatarsLoaded = true;
        loadingInProgress = false;
        return;
      }
    }

    avatarTabBtn.addEventListener('click', () => loadAvatarsFromDirectoryIndex());
    avatarTabBtn.addEventListener('shown.bs.tab', () => loadAvatarsFromDirectoryIndex());

    const pane = document.querySelector('#avatar');
    if (pane && pane.classList.contains('show') && pane.classList.contains('active')) {
      loadAvatarsFromDirectoryIndex();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

// -------------------------
// Inicialización pública y auto-ejecución segura
// -------------------------
export function initUsuario() {
  function onPageLoaded() {
    cargarPerfil();
    cargarBiblioteca();
    cargarObras();
  }

  if (document.readyState === 'complete') {
    onPageLoaded();
  } else {
    window.addEventListener('load', onPageLoaded, { once: true });
  }
}

// Auto-ejecución si se incluye el script sin llamar desde general.js
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUsuario, { once: true });
} else {
  initUsuario();
}

// Exponer API global
window.usuarioAPI = {
  cargarPerfil,
  cargarBiblioteca,
  cargarObras
};
