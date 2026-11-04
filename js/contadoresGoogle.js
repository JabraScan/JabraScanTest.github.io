import { authFetch } from'./usuario.js';
import { setItem, getItem, removeItem } from "./storage.js";
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

// Configuración de Supabase para JabraScan
const SUPABASE_URL = "https://gsuhdkeyhjjqscsptrts.supabase.co";
const SUPABASE_KEY = "sb_publishable_So72mI1lMkvTJMABjRB84Q_sMWowNVz"; // 👈 Tu Publishable Key (segura para frontend)

const token = getItem("jwt");
const usuario_id = getItem("user_id");
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
      // ==========================================
      // 📊 GESTIÓN DE VISITAS POR FUENTE
      // ==========================================
      // 1. Funciones individuales para Cloudflare
      function incrementarVisitaCloudflare(idvisitado) {
        const urlCF = `${URL_CLOUDFLARE}/contadores/incrementar`;
        return fetch(urlCF, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_obra: idvisitado })
        })
        .then(res => res.text())
        .catch(err => {
          console.error("Error CF incrementar:", err);
          return "Error";
        });
      }

      function leerVisitasCloudflare(idvisitado) {
        const urlCF = `${URL_CLOUDFLARE}/contadores/leer`;
        return fetch(urlCF, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_obra: idvisitado })
        })
        .then(res => res.text())
        .then(text => Number(text.trim()) || 0)
        .catch(err => {
          console.error("Error CF leer:", err);
          return 0;
        });
      }

      // 2. Funciones individuales para Google Sheets
      function incrementarVisitaGoogle(idvisitado) {
        const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=incrementar`;
        return fetch(url)
          .then(res => res.text())
          .catch(err => {
            console.error("Error Google incrementar visita:", err);
            return "ERROR";
          });
      }

      function leerVisitasGoogle(idvisitado) {
        const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=leer`;
        return fetch(url)
          .then(res => res.text())
          .then(text => parseInt(text, 10) || 0)
          .catch(err => {
            console.error("Error Google leer visitas:", err);
            return 0;
          });
      }
// ==========================================
// 3. Funciones para Supabase (Nativas por fetch)
// ==========================================
async function incrementarVisitaSupabase(idRecurso) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/incrementar_visita`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_id: idRecurso })
    });
  } catch (error) {
    // Silencioso absoluto en producción
  }
}

async function leerVisitasSupabase(idRecurso) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/leer_visitas`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_id: idRecurso }),
      signal: AbortSignal.timeout(3000) // ⏱️ Evita que se quede colgado si Supabase tarda
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null; // Si falla o timeout, devuelve null para tirar del respaldo
  }
}
    // ==========================================
    // Incrementa el contador de visitas para un ID
    // @param {string} idvisitado
    // @returns {Promise<string>} "OK" si se actualizó correctamente
    //
//    export async function incrementarVisita(idvisitado) {
//      // Iniciar la actualización en paralelo (prioridad a la llamada de visitas)
//        startUpdateUltimoCapituloIfNeeded(idvisitado);
//      //Incremento de visitas
//      // Llamada CloudFlare
//      //  incrementarVisitaCloudflare(idvisitado)
//      //  .then(res => console.log("Respuesta CF Incrementar:", res));
//      // 🚀 Lanzamos Supabase en segundo plano sin bloquear la página
//      return incrementarVisitaSupabase(idvisitado)
//          .catch(() => {
//            // 3. Si Supabase falla por red o latencia, capturamos el error de forma silenciosa
//            // y ejecutamos el respaldo de Google, devolviendo su resultado.
//            return incrementarVisitaGoogle(idvisitado);
//          });
//    }
      export async function incrementarVisita(idvisitado) {
        // Iniciar la actualización en paralelo del capítulo (si aplica)
        startUpdateUltimoCapituloIfNeeded(idvisitado);

        // 🚀 Retardamos la llamada a la red para dar margen a que el navegador pinte la web
        return new Promise((resolve) => {
          setTimeout(async () => {
            try {
              // 1. Probamos Supabase pasada la ventana crítica de renderizado
              const resultadoSupabase = await incrementarVisitaSupabase(idvisitado);
              resolve(resultadoSupabase);
            } catch (e) {
              // 2. Si falla, resuelve con el respaldo de Google
              resolve(incrementarVisitaGoogle(idvisitado));
            }
          }, 1500); // 1.5 segundos de margen para que PageSpeed capture los fotogramas iniciales pintados
        });
      }
   /**
    * Actualización del último capítulo leido  para usuarios logueados
    * - idvisitado puede ser "obra_<obraId>" o "<obraId>_<capitulo>"
    * - Si detecta capítulo, lanza updateUltimoCapitulo(obraId, capitulo) en background.
    * - Errores de la llamada se capturan para no afectar al flujo llamador.
    */
   function startUpdateUltimoCapituloIfNeeded(idvisitado) {
      if (!token) return;  
        try {
          // No procesamos los ids con prefijo "obra_"
          if (typeof idvisitado !== 'string' || idvisitado.startsWith('obra_')) return;      
             const sepIndex = idvisitado.indexOf('_');
             if (sepIndex === -1) return;
      
             const obraId = idvisitado.slice(0, sepIndex);
             const capitulo = idvisitado.slice(sepIndex + 1);      
          if (!obraId || !capitulo) return;
          // Fire-and-forget: iniciar en paralelo y silenciar errores
          updateUltimoCapitulo(obraId, capitulo).catch(err => {
            // Logueamos para depuración pero no propagamos el error
            console.error('updateUltimoCapitulo failed (ignored):', err);
          });
        } catch (e) {
          // Cualquier fallo en el parsing no debe romper el flujo principal
          //console.error("Capitulo no incrementado");
        }
   }


    //
    //Consulta el número de visitas para un ID
    //@param {string} idvisitado
    //@returns {Promise<number>} número de visitas
    //
    export async function leerVisitas(idvisitado) {
      // Intentamos leer primero de Cloudflare
      //const visitasCF = await leerVisitasCloudflare(idvisitado);
      //console.log(visitasCF);
      //if (visitasCF !== null) {
      //  return visitasCF;
      //}
      try {
        // Intentamos leer primero de Supabase para probar su funcionamiento
        const visitasSupabase = await leerVisitasSupabase(idvisitado);
        if (visitasSupabase !== undefined && visitasSupabase !== null) {
          //console.log("Leído desde Supabase:", visitasSupabase);
          return visitasSupabase;
        }
      } catch (e) {
        console.error("Fallo leyendo, usando respaldo:", e);
      }
      // Si Cloudflare falla, recurrimos a Google como respaldo
      return leerVisitasGoogle(idvisitado);
    }

//
//Envía una valoración (de 0 a 5) para un recurso identificado por ID
//@param {string} idvisitado
//@param {number} valor Valor numérico entre 0 y 5
//@returns {Promise<string>} "OK" si se registró correctamente
//
export function valorarRecurso(idvisitado, valor) {
  // Recuperamos el user_id guardado en localStorage (debe contener el token/JWT)
  const usuarioId = getItem("user_id") || "null";
  const token = getItem("jwt") || "null";
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
   //console.log(urlCF);
   //console.log(cfOptions);
  // Hacemos primero el POST a Cloudflare (no bloqueante respecto a la llamada a Google)
  fetch(urlCF, cfOptions)
    .then(res => res.json().catch(() => ({ ok: false, status: res.status })))
    .catch(err => {
      console.error("Error en POST a Cloudflare:", err);
      return { ok: false, error: String(err) };
    });
  // Llamada a Google (igual que antes) y devolución del texto
  //return fetch(url)
  //  .then(res => res.text())
  //  .catch(err => {
  //    console.error("Error valorando recurso:", err);
  //    return "ERROR";
  //  });
}

// ==========================================
// 📊 OBTENER INFORMACIÓN (Google + Supabase)
// ==========================================

// 1. Función específica para Google Apps Script
function obtenerInfoGoogle(idvisitado) {
  const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=obtenerInfo`;
  return fetch(url)
    .then(res => res.json())
    .catch(err => {
      //console.error("Error obteniendo info de Google:", err);
      return null;
    });
}

// 2. Función específica para Supabase (vía RPC o consulta de tabla)
function obtenerInfoSupabase(idvisitado) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/obtener_info_recurso`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_id: idvisitado })
  })
  .then(res => {
    if (!res.ok) throw new Error("Error en Supabase");
    return res.json();
  });
}

// 0. Función maestra para obtener la información
export function obtenerInfo(idvisitado) {
  return obtenerInfoSupabase(idvisitado)
    .catch(err => {
      console.warn("Supabase falló en obtenerInfo, usando respaldo de Google:", err);
      return obtenerInfoGoogle(idvisitado);
    })
    .then(data => {
      // Si por lo que sea ambos fallan o devuelven vacío, aportamos estructura segura
      return data || {
        visitas: 1,
        valoracion: 5,
        fechaActualizacion: null,
        votos: 1,
        obra: null,
        numVisitasCapitulo: 0
      };
    });
}

// ==========================================
// 📋 RESUMEN DE OBRAS (Google + Supabase)
// ==========================================

// 1. Función específica para Google Apps Script
function obtenerResumenObrasGoogle() {
  const url = `${URL_GOOGLE}?accion=resumenObras`;
  return fetch(url)
    .then(res => res.json())
    .catch(err => {
      //console.error("Error obteniendo resumen de obras:", err);
      return [];
    });
}

// 2. Función específica para Supabase
function obtenerResumenObrasSupabase() {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/obtener_resumen_obras`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  })
  .then(res => {
    if (!res.ok) throw new Error("Error en Supabase resumen");
    return res.json();
  });
}

// 0. Función maestra para el resumen de obras
export function obtenerResumenObras() {
  return obtenerResumenObrasSupabase()
    .catch(err => {
      console.warn("Supabase falló en resumenObras, usando respaldo de Google:", err);
      return obtenerResumenObrasGoogle();
    })
    .then(data => {
      return data || [];
    });
}

// //
// //Obtiene la información completa del recurso: visitas, valoración promedio y fecha de última actualización
// //@param {string} idvisitado
// //@returns {Promise<Object>} Objeto con propiedades: visitas, valoracion, fechaActualizacion
// //
// export function obtenerInfo(idvisitado) {
//   const url = `${URL_GOOGLE}?id=${encodeURIComponent(idvisitado)}&accion=obtenerInfo`;
//   return fetch(url)
//     .then(res => res.json())
//     .catch(err => {
//       console.error("Error obteniendo información:", err);
//       return {
//         visitas: 1,
//         valoracion: 5,
//         fechaActualizacion: null,
//         votos: 1,
//         obra: null,
//         numVisitasCapitulo: 0
//       };
//     });
// }
// 
// //
// //📋 Obtiene el resumen completo de todas las obras
// //@returns {Promise<Array>} Array de objetos con datos de cada obra
// //
// export function obtenerResumenObras() {
//   const url = `${URL_GOOGLE}?accion=resumenObras`;
//   return fetch(url)
//     .then(res => res.json())
//     .catch(err => {
//       console.error("Error obteniendo resumen de obras:", err);
//       return [];
//     });
// }
// 
    /**
     * Consulta la media y el número de votos para una obra
     *
     * @param {string} obra - Identificador de la obra a consultar
     * @returns {Promise<{valoracion: number|null, votos: number}>} - Objeto con:
     *    - valoracion: media de las valoraciones (o null si no hay datos).
     *    - votos: número total de votos (0 si no hay datos).
     *
     * Comportamiento:
     *  - Construye los parámetros de consulta con URLSearchParams.
     *  - Realiza una petición GET al endpoint `${URL_CLOUDFLARE}/valoraciones/media`.
     *  - Lanza un Error si la respuesta HTTP no es OK.
     *  - Parsea la respuesta JSON y normaliza nombres de campos para compatibilidad.
     */
    export async function consultarVotos(obra) {
      // Construye la query string
      const params = new URLSearchParams({ obra });
      // Petición GET al endpoint. Se solicita JSON en Accept.
      const resp = await fetch(
        `${URL_CLOUDFLARE}/valoraciones/media?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }
      );
      // Si el servidor responde con un estado distinto de 2xx, lanzamos un error
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      // Parseamos el cuerpo como JSON
      const data = await resp.json();
      // Normalizamos la respuesta para devolver siempre los mismos campos:
      // - valoracion: puede venir como 'valvotos' o 'media' (aquí usamos valvotos si existe)
      // - votos: puede venir como 'numvotos', 'total' o 'totalvotos'
      return {
        valoracion: data?.valvotos ?? data?.media ?? null,
        votos: data?.numvotos ?? data?.total ?? data?.totalvotos ?? 0
      };
    }
   /**
    * updateUltimoCapitulo
    *
    * Actualiza en el servidor el último capítulo leído de una obra.
    * Devuelve `true` si la actualización fue exitosa, `false` en cualquier otro caso.
    *
    * Requisitos previos (comprobados aquí):
    * - Existe `usuario_id` o `token` (si ambos faltan, no se intenta la petición).
    * - `obraId` no es nulo ni cadena vacía.
    * - `capitulo` no es nulo ni cadena vacía (si falta, no tiene sentido actualizar).
    *
    * Nota: la función no lanza excepciones hacia el llamador; en caso de error devuelve `false`.
    */
      async function updateUltimoCapitulo(obraId, capitulo) {
        // Si no hay ni usuario ni token, no intentamos nada (autenticación ausente)
        if (!token) return;
        // Validación de obraId: si falta, no tiene sentido continuar
        if (obraId == null || obraId === '') return;
        // Validación de capítulo: si falta, no hay nada que actualizar
        if (capitulo == null || capitulo === '') return;
        // URL del endpoint que actualiza el progreso
        const url = `${URL_CLOUDFLARE}/biblioteca/progreso`;
        // Payload que se enviará al servidor.
        // Convertimos obra_id a string; capitulo se normaliza a string si no es null.
        const payload = {
          obra_id: String(obraId),
          capitulo: capitulo == null ? null : String(capitulo)
        };

         console.log(token);

        try {
          const resp = await authFetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          // Intentamos parsear JSON del cuerpo; si falla, data será null.
          const data = await (resp && resp.json ? resp.json().catch(() => null) : null);
          // Consideramos éxito si la respuesta HTTP es OK (2xx) o si el body contiene { ok: true }
          if ((resp && resp.ok) || (data && data.ok)) return true;
          // En cualquier otro caso devolvemos false (fallo controlado por servidor)
          return false;
        } catch (err) {
          // Fallo de red u otro error en runtime: devolvemos false para que el llamador
          // reciba un resultado booleano consistente sin excepciones.
          return false;
        }
      }


