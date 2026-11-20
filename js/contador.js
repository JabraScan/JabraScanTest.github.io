import { obtenerResumenObras } from './contadoresGoogle.js';
import { truncarTexto } from './utils.js';

const TOP_DAY_URL = 'https://jabrascan.net/topday';
const TOP_MONTH_URL = 'https://jabrascan.net/topmonth';

export async function renderResumenObras() {

    const podio = document.getElementById("podio");
    const ranking = document.getElementById("ranking");
    const errorBox = document.getElementById("error");
    const loader = document.getElementById("loader");

    if (loader) loader.style.display = "block";

    try {

        let [resumen, iconosRes, xmlText] = await Promise.all([
            obtenerResumenObras(),
            fetch('/iconos.json').then(res => res.json()),
            fetch('/obras.xml').then(res => res.text())
        ]);

        if (!Array.isArray(resumen) || resumen.length === 0) {
            throw new Error("No se encontraron datos.");
        }

        const obrasOrdenadas = obtenerObrasOrdenadas(resumen);

        const obrasConTotales = obrasOrdenadas
            .map(item => ({
                ...item,
                total: (item.visitas || 0) + (item.visitasCapitulos || 0)
            }))
            .sort((a, b) => b.total - a.total);

        const obrasFinales = enriquecerObras(obrasConTotales, xmlText);

        renderPodio(
            podio,
            obrasFinales.slice(0, 3),
            iconosRes
        );

        renderRanking(
            ranking,
            obrasFinales.slice(3),
            iconosRes
        );

        cargarTopsPeriodos(xmlText, iconosRes);

    } catch (error) {

        console.error(error);

        if (errorBox) {
            errorBox.textContent =
                "❌ Error al cargar datos: " + error.message;

            errorBox.classList.remove("hidden");
        }

    } finally {

        if (loader) {
            loader.style.display = "none";
        }

    }

}

async function obtenerTopPeriodo(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Error ${res.status} al consultar ${url}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
        obra: item.obra ?? item.id ?? "",
        total: Number(item.total ?? item.lecturas_total ?? 0)
    }));
}

function renderTopPeriodo(elementId, items, iconosRes) {
    const target = document.getElementById(elementId);
    if (!target) return;

    if (!Array.isArray(items) || items.length === 0) {
        target.innerHTML = `<p class="text-muted mb-0">Sin lecturas registradas.</p>`;
        return;
    }

    target.innerHTML = `
        <div class="top-periodo-grid">
            ${items.map((item) => {
                const info = iconosRes[item.obra] || iconosRes["Default"] || {};
                const titulo = item.nombreObra || info.descripcion || item.obra || "";
                const urlObra = item.urlObra || "#";

                const cover = item.imagenUrl
                    ? `<img src="${escapeHtml(item.imagenUrl)}" alt="${escapeHtml(titulo)}" class="top-periodo-cover">`
                    : `<div class="top-periodo-fallback">${info.icono || "📚"}</div>`;

                return `
                    <a href="${escapeHtml(urlObra)}" class="top-periodo-item" title="${escapeHtml(titulo)}">
                        <div class="top-periodo-img-wrapper">
                            ${cover}
                        </div>
                        <div class="top-periodo-title">${escapeHtml(titulo)}</div>
                    </a>
                `;
            }).join("")}
        </div>
    `;
}

async function cargarTopsPeriodos(xmlText, iconosRes) {
    const [topDayRaw, topMonthRaw] = await Promise.all([
        obtenerTopPeriodo(TOP_DAY_URL).catch(() => []),
        obtenerTopPeriodo(TOP_MONTH_URL).catch(() => [])
    ]);

    const topDay = enriquecerObras(topDayRaw, xmlText);
    const topMonth = enriquecerObras(topMonthRaw, xmlText);

    // Móvil
    renderTopPeriodo("lista-diario-mobile", topDay, iconosRes);
    renderTopPeriodo("lista-mensual-mobile", topMonth, iconosRes);

    // PC
    renderTopPeriodo("lista-diario-pc", topDay, iconosRes);
    renderTopPeriodo("lista-mensual-pc", topMonth, iconosRes);
}

/**
 * 📦 Recorre el XML una sola vez para extraer imágenes, claves y nombres de obra, y enriquece las obras.
 */
function enriquecerObras(obras, xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const obraNodes = xmlDoc.getElementsByTagName("obra");

    const imagenesMap = {};
    const claveMap = {};
    const nombreObraMap = {};

    for (let i = 0; i < obraNodes.length; i++) {
        const obraNode = obraNodes[i];
        const claveNode = obraNode.getElementsByTagName("clave")[0];

        if (claveNode) {
            const clave = claveNode.textContent.trim();
            const imagenNodes = obraNode.getElementsByTagName("imagen");
            const imageUrl = imagenNodes.length > 0 ? obtenerUrlImagen150w(imagenNodes[0].textContent) : "";

            imagenesMap[clave] = imageUrl;
            claveMap[clave] = clave;

            const nombreObraNodes = obraNode.getElementsByTagName("nombreobra");
            const primerNombre = nombreObraNodes.length > 0 ? nombreObraNodes[0].textContent.trim() : "";

            if (primerNombre && !nombreObraMap[clave]) {
                nombreObraMap[clave] = primerNombre;
            }

            for (let j = 0; j < nombreObraNodes.length; j++) {
                const nombre = nombreObraNodes[j].textContent.trim();
                if (nombre) {
                    claveMap[nombre] = clave;
                    nombreObraMap[nombre] = primerNombre || nombre;
                    if (imageUrl && !imagenesMap[nombre]) {
                        imagenesMap[nombre] = imageUrl;
                    }
                }
            }
        }
    }

    return obras.map(item => {
        const clave = claveMap[item.obra] || claveMap[item.id] || item.obra || "";
        const imagenUrl = imagenesMap[item.obra] || imagenesMap[item.id] || imagenesMap[clave] || "";
        const nombreObra = nombreObraMap[item.obra] || nombreObraMap[item.id] || nombreObraMap[clave] || "";
        return {
            ...item,
            nombreObra,
            imagenUrl,
            urlObra: clave ? `https://jabrascan.net/#${clave}` : "#"
        };
    });
}

function renderPodio(container, top3, iconosRes) {
    if (!container) return;

    const orden = [1, 0, 2]; // 2º, 1º, 3º
    const clases = ["second", "first", "third"];
    const posiciones = ["2", "1", "3"];

    container.innerHTML = `
        <div class="podium">
            ${orden.map((idx, posVisual) => {
                const obra = top3[idx];
                if (!obra) return '';

                const info = iconosRes[obra.obra] || iconosRes["Default"] || {};
                const titulo = obra.nombreObra || info.descripcion || obra.obra || obra.id || "";
                const urlObra = obra.urlObra || "#";

                const cover = obra.imagenUrl
                    ? `<img src="${escapeHtml(obra.imagenUrl)}" alt="${escapeHtml(titulo)}" class="podium-img">`
                    : `<div class="podium-fallback">${info.icono || "📚"}</div>`;

                return `
                    <div class="podium-item ${clases[posVisual]}">
                        <div class="podium-rank">${posiciones[posVisual]}</div>
                        <a href="${escapeHtml(urlObra)}" class="podium-card" title="${escapeHtml(titulo)}">
                            <div class="podium-cover">
                                ${cover}
                            </div>
                            <div class="podium-info">
                                <div class="podium-title">${escapeHtml(titulo)}</div>
                                <div class="podium-lecturas">${formatLecturas(obra.total)}</div>
                            </div>
                        </a>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderRanking(container, obras, iconosRes) {
    if (!container) return;

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead>
                    <tr>
                        <th style="width: 70px">POS</th>
                        <th>OBRA</th>
                        <th class="text-end">LECT</th>
                    </tr>
                </thead>
                <tbody>
                    ${obras.map((obra, index) => {
                        const info = iconosRes[obra.obra] || iconosRes["Default"] || {};
                        const titulo = obra.nombreObra || info.descripcion || obra.obra || obra.id || "";
                        const urlObra = obra.urlObra || "#";

                        const cover = obra.imagenUrl
                            ? `<img src="${escapeHtml(obra.imagenUrl)}" alt="${escapeHtml(titulo)}" class="ranking-cover">`
                            : `<span class="ranking-icon">${info.icono || "📚"}</span>`;

                        return `
                            <tr>
                                <td class="fw-semibold">#${index + 4}</td>
                                <td>
                                    <a href="${escapeHtml(urlObra)}" class="obra-link" title="${escapeHtml(titulo)}">
                                        ${cover}
                                        <span class="obra-titulo">${escapeHtml(titulo)}</span>
                                    </a>
                                </td>
                                <td class="text-end fw-bold">${formatLecturas(obra.total)}</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function formatLecturas(valor) {

    if (valor < 1000) {
        return String(valor);
    }

    return (valor / 1000)
        .toFixed(1)
        .replace(/\.0$/, '') + 'k';
}

function escapeHtml(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function obtenerObrasOrdenadas(resumen) {
  const obras = [...resumen];

  const obrasExcluidas = ['obra_JabraRexScan', 'obra_pwa', 'obra_Test', 'obra_Inicio'];
  const filtradas = obras.filter(item =>
      !obrasExcluidas.includes(item.obra) && !obrasExcluidas.includes(item.id)
  );

  const inicio = filtradas.find(item => item.id === "obra_Inicio");
  const resto = filtradas.filter(item => item.id !== "obra_Inicio");

  resto.sort((a, b) => {
    const visitasA = (a.visitas || 0) + (a.visitasCapitulos || 0);
    const visitasB = (b.visitas || 0) + (b.visitasCapitulos || 0);
    return visitasB - visitasA;
  });

  return inicio ? [inicio, ...resto] : resto;
}

function obtenerUrlImagen150w(rutaRelativa) {
    if (!rutaRelativa) return "";
    const ruta = rutaRelativa.trim();
    const lastDot = ruta.lastIndexOf('.');
    
    if (lastDot === -1) return `https://img.jabrascan.net/${ruta}-150w`;
    
    const base = ruta.slice(0, lastDot);
    const ext = ruta.slice(lastDot);
    return `https://img.jabrascan.net/${base}-150w${ext}`;
}