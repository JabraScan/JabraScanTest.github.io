// storage.js

// 📦 Claves críticas que deben estar tanto en cookie como en localStorage
export const CRITICAL_KEYS = [  "jwt",
                                "libroSeleccionado",
                                "ultimaObra",
                                "ultimaPagina",
                                "ultimoCapitulo",
                                "user_avatar",
                                "user_id",
                                "user_nickname"
                              ];

export function syncLocalStorageToCookies(keys = CRITICAL_KEYS) {
  if (!cookiesEnabled()) return;

  keys.forEach((key) => {
    const cookieVal = getCookie(key);
    const localVal = localStorage.getItem(key);
    // Copiar si la cookie no existe o si el valor es distinto
    if (localVal && cookieVal !== localVal) {
      setCookie(key, localVal);
      //console.log(`StorageAPI.sync: copiado ${key} de localStorage → cookie`);
    }
  });
}

// --- utilidades internas ---
function getAttrs(expires) {
  const isHttps = location.protocol === "https:";
  return [
    `expires=${expires}`,
    "path=/",
    "domain=jabrascan.net",
    "SameSite=Lax",
    isHttps ? "Secure" : null
  ].filter(Boolean).join("; ");
}

function cookiesEnabled() {
  //return false;
  try {
    document.cookie = "testcookie=1; path=/";
    const enabled = document.cookie.indexOf("testcookie=") !== -1;
    // limpiar
    document.cookie = "testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    //console.log('activadas cookies');
    return enabled;
  } catch {
    //console.log('NO cookies');
    return false;
  }
}

/*function setCookie(name, value, days = 360) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}*/
function setCookie(name, value, days = 360) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  const attrs = getAttrs(expires.toUTCString());
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${attrs}`;
}


function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^|;)\\s*" + encodeURIComponent(name) + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

//function deleteCookie(name) {
//  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
//}
function deleteCookie(name) {
  const attrs = getAttrs("Thu, 01 Jan 1970 00:00:00 UTC");
  document.cookie = `${encodeURIComponent(name)}=; ${attrs}`;
}


// --- API transparente ---
const useCookies = cookiesEnabled();

export function setItem(key, value) {
  //console.log("StorageAPI.setItem → guardando en cookie y localStorage", key, value);
  if (cookiesEnabled()) {
    setCookie(key, value);
  }
  localStorage.setItem(key, value);
}

export function getItem(key) {
  if (cookiesEnabled()) {
    const val = getCookie(key);
    if (val) return val;
  }
  return localStorage.getItem(key);
}

export function removeItem(key) {
  // Borra en ambos lados para mantener consistencia
  if (cookiesEnabled()) {
    deleteCookie(key);
  }
  localStorage.removeItem(key);
}

// --- expone como global para scripts clásicos ---
/*if (typeof window !== "undefined") {
  window.StorageAPI = { setItem, getItem, removeItem };
}*/

// --- expone como global para scripts clásicos ---
if (typeof window !== "undefined") {
  window.StorageAPI = { setItem, getItem, removeItem };
  window.dispatchEvent(new Event("storageapi:ready"));
}
