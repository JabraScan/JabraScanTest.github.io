const WORKER_URL = "https://jabrascan.net";

// --- UI helpers (se esperan elementos en el DOM de login.html) ---
function showLoginButton() {
  const loginWrapper = document.getElementById("login-wrapper");
  const userWrapper = document.getElementById("user-nick-wrapper");
  if (loginWrapper) loginWrapper.classList.remove("d-none");
  if (userWrapper) userWrapper.classList.add("d-none");
}

function showUserNick(nickname, avatar) {
  const loginWrapper = document.getElementById("login-wrapper");
  const userWrapper = document.getElementById("user-nick-wrapper");
  const nick = document.getElementById("user-nick");
  const avatarImg = document.getElementById("user-avatar");

  if (loginWrapper) loginWrapper.classList.add("d-none");
  if (userWrapper && nick) {
    nick.textContent = nickname;
    if (avatarImg) avatarImg.src = avatar;
    userWrapper.classList.remove("d-none");
  }
}

// --- login actions (se mantienen simples: redirigen al Worker) ---
function loginGoogle() {
  window.location.href = `${WORKER_URL}/auth/google`;
}
function loginMeta() {
  window.location.href = `${WORKER_URL}/auth/meta`;
}

// --- captura token de la URL sin recargar y notifica la app ---
function initSessionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get("token");
  if (!tokenFromUrl) return false;

  localStorage.setItem("jwt", tokenFromUrl);
  // limpia la query string sin recargar
  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  // notifica al resto de la SPA que hay token nuevo
  document.dispatchEvent(new CustomEvent("auth:tokenSaved", { detail: { token: tokenFromUrl } }));
  return true;
}

// --- utilidades ---
function normalizeAvatarUrl(avatar) {
  if (!avatar) return "/img/avatar/default.png";
  try {
    return new URL(avatar, window.location.origin).href;
  } catch {
    return avatar;
  }
}

async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// --- comprobar sesión y actualizar UI --- 
async function checkSessionOnLoad() {
  const token = localStorage.getItem("jwt");
  if (!token) {
    showLoginButton();
    // notifica que no hay sesión activa
    document.dispatchEvent(new CustomEvent("auth:unauthenticated"));
    return;
  }

  try {
    const res = await fetchWithTimeout(`${WORKER_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }, 8000);

    if (!res.ok) throw new Error("Token inválido o expirado");
    const data = await res.json();

    const usuario = data && data.usuario ? data.usuario : {};
    const nickname = usuario.nickname || "Usuario";
    const avatar = normalizeAvatarUrl(usuario.avatar || "/img/avatar/default.png");
    const userId = usuario.id || "";

    if (userId) localStorage.setItem("user_id", userId);
    localStorage.setItem("user_nickname", nickname);
    localStorage.setItem("user_avatar", avatar);

    showUserNick(nickname, avatar);
    // notifica que la auth está lista y pasa el usuario
    document.dispatchEvent(new CustomEvent("auth:ready", { detail: { user: usuario } }));
  } catch (e) {
    // sesión inválida: limpiar y notificar
    localStorage.removeItem("jwt");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_nickname");
    localStorage.removeItem("user_avatar");
    showLoginButton();
    document.dispatchEvent(new CustomEvent("auth:unauthenticated", { detail: { reason: e.message || e } }));
  }
}

// --- logout --- 
function logout() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_nickname");
  localStorage.removeItem("user_avatar");

  showLoginButton();
  // notifica a la SPA que el usuario ha cerrado sesión
  document.dispatchEvent(new CustomEvent("auth:loggedOut"));
}

// --- enganchar eventos del DOM y del sistema ---
document.addEventListener("DOMContentLoaded", async () => {
  // botones de login (si existen en login.html)
  const googleBtn = document.getElementById("login-google");
  if (googleBtn) googleBtn.addEventListener("click", (e) => { e.preventDefault(); loginGoogle(); });

  const metaBtn = document.getElementById("login-meta");
  if (metaBtn) metaBtn.addEventListener("click", (e) => { e.preventDefault(); loginMeta(); });

  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => { e.preventDefault(); logout(); });
  }

  // si la URL trae token, guárdalo y notifica
  initSessionFromUrl();

  // validar sesión y pintar UI en base a /me
  await checkSessionOnLoad();
});

// Si otra parte de la app guarda el token en localStorage (ej. otro iframe o flujo), reaccionamos
window.addEventListener("storage", (e) => {
  if (e.key === "jwt") {
    // revalidar y actualizar UI
    checkSessionOnLoad().catch(() => {});
  }
});

// Exponer funciones útiles (opcional)
window.appAuth = {
  initSessionFromUrl,
  checkSessionOnLoad,
  loginGoogle,
  loginMeta,
  logout
};
