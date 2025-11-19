/**
 * 🧙‍♂️ API Web para gestionar visitas, valoraciones y obtener información
 * sobre obras y capítulos.
 *
 * Esta versión "dual" llama a dos backends en paralelo:
 * - Google Apps Script (tu backend actual sobre Google Sheets)
 * - Cloudflare Worker (nuevo backend con D1)
 *
 * ✔ Mantiene la misma interfaz pública (mismos parámetros y retornos)
 * ✔ No requiere cambiar tu frontend fuera de este módulo
 * ⚠ Eventual consistency: puede haber pequeñas diferencias momentáneas entre ambos
 */

/* ============================
   🔗 URLs de los dos backends
   ============================ */

// URL original de Google Apps Script (tu hoja de cálculo)
//const URL_GOOGLE = "https://script.google.com/macros/s/AKfycbzd0PXifcGV1nG1gNucm_9DB7UI_YLdOS4qEYZm_8CcW-W4jBkh3PNZiQ2qK4tqgok6Bg/exec"; //v19
const URL_GOOGLE = "https://script.google.com/macros/s/AKfycbwQNm88siN8ASQXXbNYe-J7klvE0SGWJrih_Tia9wRyzitWYPelCz6dlrJIhNuYRFXg3Q/exec"; //v24

// URL del Cloudflare Worker que replica el flujo (ajusta al tuyo)
const URL_CLOUDFLARE = "https://jabrascan.net"; // TODO: cambia por tu ruta real

//const API_KEY = "X%B~ZiP?RJA5LUGVAU_9KgDp?7~rUX8KW2D9Q3Fgiyt=1.]Ww#a^FGEMFuM:}#WP4r2L!e9U?fA+qcUjReWV"; // Opcional, si tu backend lo requiere
/*// 🔐 Genera un token temporal codificado en base64
export function generarToken() {
  // 🗝️ Clave privada compartida con el backend para validar el token
    const clavePrivada = API_KEY;
    // ⏱️ Obtiene el timestamp actual en milisegundos
    const timestamp = Date.now();
    // ⏳ Calcula el tiempo de expiración: 10 minutos desde ahora
    const expiracion = timestamp + 10 * 60 * 1000;
    // 🧵 Crea una cadena que une la clave privada y la expiración
    const raw = `${clavePrivada}:${expiracion}`;
    // 📦 Codifica la cadena en base64 para generar el token
    const token = btoa(raw);
    // 🚀 Devuelve el token generado
  return token;
}*/
const API_KEY = "";
//
// Incrementa el contador de visitas para un ID
// @param {string} idvisitado
// @returns {Promise<string>} "OK" si se actualizó correctamente
//
export function incrementarVisita(idvisitado) {
  const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=incrementar`;
  return fetch(url)
    .then(res => res.text())
    .catch(err => {
      console.error("Error incrementando visita:", err);
      return "ERROR";
    });
}

//
//Consulta el número de visitas para un ID
//@param {string} idvisitado
//@returns {Promise<number>} número de visitas
//
export function leerVisitas(idvisitado) {
  const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=leer`;
  return fetch(url)
    .then(res => res.text())
    .then(text => parseInt(text, 10) || 0)
    .catch(err => {
      console.error("Error leyendo visitas:", err);
      return 0;
    });
}

//
//Envía una valoración (de 0 a 5) para un recurso identificado por ID
//@param {string} idvisitado
//@param {number} valor Valor numérico entre 0 y 5
//@returns {Promise<string>} "OK" si se registró correctamente
//
export function valorarRecurso(idvisitado, valor) {
  // Recuperamos el user_id guardado en localStorage (debe contener el token/JWT)
  const usuarioId = localStorage.getItem("user_id") || "null";
  const token = localStorage.getItem("jwt") || "null";
  // URL de Google (igual que antes)
  const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=valorar&valor=${encodeURIComponent(valor)}&usuario_id=${encodeURIComponent(usuarioId)}`;
  // URL y opciones para Cloudflare (POST)
  const urlCF = `${URL_CLOUDFLARE}/valoraciones/votar`;
  const cfOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Enviamos el token en Authorization con esquema Bearer para que ConseguirUsuario lo lea
      ...(usuarioId && usuarioId !== "null" ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      id_obra: idvisitado,
      valoracion: valor
    })
  };
  // Hacemos primero el POST a Cloudflare (no bloqueante respecto a la llamada a Google)
  fetch(urlCF, cfOptions)
    .then(res => res.json().catch(() => ({ ok: false, status: res.status })))
    .catch(err => {
      console.error("Error en POST a Cloudflare:", err);
      return { ok: false, error: String(err) };
    });
  // Llamada a Google (igual que antes) y devolución del texto
  return fetch(url)
    .then(res => res.text())
    .catch(err => {
      console.error("Error valorando recurso:", err);
      return "ERROR";
    });
}

/*export function valorarRecurso(idvisitado, valor) {
  // Recuperamos el user_id guardado en localStorage (si no hay sesión será "null")
  const usuarioId = localStorage.getItem("user_id") || "null";
  const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=valorar&valor=${valor}&usuario_id=${encodeURIComponent(usuarioId)}`;
//console.log(url);   
  return fetch(url)
    .then(res => res.text())
    .catch(err => {
      console.error("Error valorando recurso:", err);
      return "ERROR";
    });
}*/

//
//Obtiene la información completa del recurso: visitas, valoración promedio y fecha de última actualización
//@param {string} idvisitado
//@returns {Promise<Object>} Objeto con propiedades: visitas, valoracion, fechaActualizacion
//
export function obtenerInfo(idvisitado) {
  const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=obtenerInfo`;
  return fetch(url)
    .then(res => res.json())
    .catch(err => {
      console.error("Error obteniendo información:", err);
      return {
        visitas: 1,
        valoracion: 5,
        fechaActualizacion: null,
        votos: 1,
        obra: null,
        numVisitasCapitulo: 0
      };
    });
}

//
//📋 Obtiene el resumen completo de todas las obras
//@returns {Promise<Array>} Array de objetos con datos de cada obra
//
export function obtenerResumenObras() {
  const url = `${URL_GOOGLE}?accion=resumenObras`;
  return fetch(url)
    .then(res => res.json())
    .catch(err => {
      console.error("Error obteniendo resumen de obras:", err);
      return [];
    });
}
