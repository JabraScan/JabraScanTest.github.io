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

const TURSO_URL = "https://dbjabrarex-jabrarexscan.aws-us-east-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTUwMTk2MTksImlkIjoiMDFhMWI3MGQtODIwMS03ZDBjLWE1NTYtOTYwM2VmZjMyZDdlIiwia2lkIjoiZ0FUTU1uenU1S1Y2VEhSaEFnekg5MXFaU05KUkhxV1JoZGlDdlFNQVlJcyIsInJpZCI6ImRmN2JhMjE5LTkzYjMtNGU0My1hMWI1LWE1YjU4YWFkOTQ2MyJ9.H42cNttQl3XDXHPug4HtMIvCSyL4LjLMhArqIjKmIYWi5YCjWm_mXUBAZjQDBfoiKGAGZyO-R4kOL1mTSZZEBw";

const token = getItem("jwt");

export async function incrementarVisitaTurso(obraId) {
  if (!obraId) return "ERROR";

  const payload = {
    requests: [
      {
        type: "execute",
        stmt: {
          sql: "INSERT INTO contador_lecturas (obra_id) VALUES (?)",
          args: [{ type: "text", value: String(obraId) }],
        },
      },
      { type: "close" },
    ],
  };

  try {
    const response = await fetch(TURSO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    return "✅ OK inc";
  } catch (error) {
    return "ERROR";
  }
}

export async function incrementarVisita(idvisitado) {
  startUpdateUltimoCapituloIfNeeded(idvisitado);

  return new Promise((resolve) => {
    setTimeout(async () => {
      const resultado = await incrementarVisitaTurso(idvisitado);
      resolve(resultado);
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
      numVisitasCapitulo: data?.numVisitasCapitulo ?? 0,
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