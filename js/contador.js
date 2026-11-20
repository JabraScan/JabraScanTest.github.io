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

//function renderTopPeriodo(elementId, items, iconosRes) {
//    const box = document.getElementById(elementId);
//    if (!box) return;
//
//    const target = box.querySelector('[data-role="lista"]') || box;
//
//    if (!Array.isArray(items) || items.length === 0) {
//        target.innerHTML = `<p style="margin:0;opacity:0.7;">Sin lecturas registradas.</p>`;
//        return;
//    }
//
//    target.innerHTML = items.map((item, index) => {
//        const info = iconosRes[item.obra] || iconosRes["Default"] || {};
//        const titulo = item.nombreObra || info.descripcion || item.obra || "";
//        const urlObra = item.urlObra || "#";
//
//        const visual = item.imagenUrl
//            ? `<img src="${escapeHtml(item.imagenUrl)}" alt="${escapeHtml(titulo)}" style="width:36px!important;height:48px!important;max-width:36px!important;max-height:48px!important;object-fit:cover;border-radius:4px;flex-shrink:0;">`
//            : `<span style="font-size:1.2rem;flex-shrink:0;">${info.icono || "📚"}</span>`;
//            
//        return `
//            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.2);">
//                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
//                    <a href="${escapeHtml(urlObra)}" title="${escapeHtml(titulo)}" style="display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;flex:1;min-width:0;">
//                        ${visual}
//                        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;">${escapeHtml(titulo)}</span>
//                    </a>
//                </div>
//            </div>
//        `;
//    }).join("");
//}
function renderTopPeriodo(elementId, items, iconosRes) {
    const box = document.getElementById(elementId);
    if (!box) return;

    const target = box.querySelector('[data-role="lista"]') || box;

    if (!Array.isArray(items) || items.length === 0) {
        target.innerHTML = `<p style="margin:0;opacity:0.7;">Sin lecturas registradas.</p>`;
        return;
    }

    target.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start;">
            ${items.map((item) => {
                const info = iconosRes[item.obra] || iconosRes["Default"] || {};
                const titulo = item.nombreObra || info.descripcion || item.obra || "";
                const urlObra = item.urlObra || "#";

                const visual = item.imagenUrl
                    ? `<img src="${escapeHtml(item.imagenUrl)}" alt="${escapeHtml(titulo)}" 
                        style="width:44px!important;height:44px!important;max-width:44px!important;max-height:44px!important;object-fit:cover;border-radius:50px;margin:0 auto 6px;display:block;"
                        width="44px" height="44px"
                        >`
                    : `<span style="font-size:1.3rem;display:block;margin-bottom:6px;">${info.icono || "📚"}</span>`;

                return `
                    <a href="${escapeHtml(urlObra)}" title="${escapeHtml(titulo)}" style="display:flex;flex-direction:column;align-items:center;text-align:center;color:inherit;text-decoration:none;min-width:0;">
                        ${visual}
                        <span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:0.8rem;line-height:1.2;">${escapeHtml(titulo)}</span>
                    </a>
                `;
            }).join("")}
        </div>
    `;
}

async function cargarTopsPeriodos(xmlText, iconosRes) {
    if (!document.getElementById("top-diario") && !document.getElementById("top-mensual")) return;

    const [topDayRaw, topMonthRaw] = await Promise.all([
        obtenerTopPeriodo(TOP_DAY_URL).catch(() => []),
        obtenerTopPeriodo(TOP_MONTH_URL).catch(() => [])
    ]);

    renderTopPeriodo("top-diario", enriquecerObras(topDayRaw, xmlText), iconosRes);
    renderTopPeriodo("top-mensual", enriquecerObras(topMonthRaw, xmlText), iconosRes);
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

    const orden = [1, 0, 2];
    const clases = ["second", "first", "third"];

    container.innerHTML = `
        <div class="podium">
            ${orden.map((idx, posVisual) => {

                const obra = top3[idx];

                if (!obra) return '';

                const info =
                    iconosRes[obra.obra] ||
                    iconosRes["Default"] ||
                    {};

                const titulo =
                    info.descripcion ||
                    obra.obra ||
                    obra.id;

                const urlObra = obra.urlObra || "#";

                const contenidoCover = obra.imagenUrl
                    ? `<a href="${escapeHtml(urlObra)}"><img src="${escapeHtml(obra.imagenUrl)}" alt="${escapeHtml(titulo)}" class="podium-img"></a>`
                    : `<a href="${escapeHtml(urlObra)}">${info.icono || "📚"}</a>`;

                return `
                    <div class="podium-item ${clases[posVisual]}">

                        <div class="podium-cover">
                            ${contenidoCover}
                        </div>

                        <div class="podium-block">

                            <div
                                class="podium-title"
                                title="${escapeHtml(titulo)}">

                                <a href="${escapeHtml(urlObra)}" style="color: inherit; text-decoration: none;">
                                    ${escapeHtml(titulo)}
                                </a>

                            </div>

                            <div class="lecturas">
                                ${formatLecturas(obra.total)}
                            </div>

                        </div>

                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderRanking(container, obras, iconosRes) {

    if (!container) return;

    container.innerHTML = `
        <table class="table">

            <thead>
                <tr>
                    <th width="80">POS</th>
                    <th>OBRA</th>
                    <th class="text-end">LECT</th>
                </tr>
            </thead>

            <tbody>

                ${obras.map((obra, index) => {

                    const info =
                        iconosRes[obra.obra] ||
                        iconosRes["Default"] ||
                        {};

                    const titulo =
                        info.descripcion ||
                        obra.obra ||
                        obra.id;

                    const urlObra = obra.urlObra || "#";

                    return `
                        <tr>

                            <td>
                                #${index + 4}
                            </td>

                            <td>

                                <div class="obra-row">

                                    <span class="obra-icono">
                                        ${info.icono || "📚"}
                                    </span>

                                    <a href="${escapeHtml(urlObra)}" title="${escapeHtml(titulo)}" style="color: inherit; text-decoration: none;">
                                        <span>
                                            ${escapeHtml(titulo)}
                                        </span>
                                    </a>

                                </div>

                            </td>

                            <td class="text-end">

                                ${formatLecturas(obra.total)}

                            </td>

                        </tr>
                    `;

                }).join("")}

            </tbody>

        </table>
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