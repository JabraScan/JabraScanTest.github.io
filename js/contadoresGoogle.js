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

const URL_CLOUDFLARE = "https://jabrascan.net";

const token = getItem("jwt");

export async function incrementarVisitaTurso(obraId) {
  if (!obraId) return "ERROR";

  try {
    const response = await fetch(`${URL_CLOUDFLARE}/visitas/incrementar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id_obra: String(obraId) }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    return "ERROR";
  }
}

export async function incrementarVisita(idvisitado) {
  startUpdateUltimoCapituloIfNeeded(idvisitado);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(incrementarVisitaTurso(idvisitado));
    }, 1500);
  });
}

function startUpdateUltimoCapituloIfNeeded(idvisitado) {
  if (!token) return;
  try {
    if (typeof idvisitado !== "string" || idvisitado.startsWith("obra_")) return;
    const sepIndex = idvisitado.indexOf("_");
    if (sepIndex === -1) return;

    const obraId = idvisitado.slice(0, sepIndex);
    const capitulo = idvisitado.slice(sepIndex + 1);
    if (!obraId || !capitulo) return;

    updateUltimoCapitulo(obraId, capitulo).catch((err) => {
      console.error("updateUltimoCapitulo failed (ignored):", err);
    });
  } catch (e) {
    // Silencioso
  }
}

export async function leerVisitas(idvisitado) {
  const info = await obtenerInfo(idvisitado);
  return Number(info?.visitas) || 0;
}

export function valorarRecurso(idvisitado, valor) {
  const usuarioId = getItem("user_id") || "null";
  const jwt = getItem("jwt") || "null";
  const urlCF = `${URL_CLOUDFLARE}/valoraciones/votar`;

  const cfOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(usuarioId && usuarioId !== "null" ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({
      id_obra: idvisitado,
      valoracion: valor,
    }),
  };

  return fetch(urlCF, cfOptions)
    .then((res) => res.json().catch(() => ({ ok: false, status: res.status })))
    .catch((err) => {
      console.error("Error en POST a Cloudflare:", err);
      return { ok: false, error: String(err) };
    });
}

export async function obtenerInfo(idvisitado) {
  try {
    const params = new URLSearchParams({ obra: String(idvisitado) });
    const res = await fetch(`${URL_CLOUDFLARE}/resumen-obra?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return {
      visitas: data?.visitas ?? 0,
      valoracion: data?.valoracion ?? 5,
      fechaActualizacion: data?.fechaActualizacion ?? null,
      votos: data?.votos ?? 0,
      obra: data?.obra ?? null,
      numVisitasCapitulo: 0 ?? data?.numVisitasCapitulo,
    };
  } catch (err) {
    return {
      visitas: 0,
      valoracion: 5,
      fechaActualizacion: null,
      votos: 0,
      obra: null,
      numVisitasCapitulo: 0,
    };
  }
}

export async function obtenerResumenObras() {
  try {
    const res = await fetch(`${URL_CLOUDFLARE}/resumen-obras`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function consultarVotos(obra) {
  const params = new URLSearchParams({ obra });
  const resp = await fetch(
    `${URL_CLOUDFLARE}/valoraciones/media?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();

  return {
    valoracion: data?.valvotos ?? data?.media ?? null,
    votos: data?.numvotos ?? data?.total ?? data?.totalvotos ?? 0,
  };
}

async function updateUltimoCapitulo(obraId, capitulo) {
  if (!token) return;
  if (obraId == null || obraId === "") return;
  if (capitulo == null || capitulo === "") return;

  const url = `${URL_CLOUDFLARE}/biblioteca/progreso`;
  const payload = {
    obra_id: String(obraId),
    capitulo: String(capitulo),
  };

  try {
    const resp = await authFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await (resp && resp.json ? resp.json().catch(() => null) : null);
    if ((resp && resp.ok) || (data && data.ok)) return true;
    return false;
  } catch (err) {
    return false;
  }
}