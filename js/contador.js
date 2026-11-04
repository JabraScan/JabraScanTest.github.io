import { obtenerResumenObras } from './contadoresGoogle.js';
import { truncarTexto } from './utils.js';

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

        // 1. Obtenemos las obras ordenadas y filtradas con tu función
        const obrasOrdenadas = obtenerObrasOrdenadas(resumen);

        // 2. Procesamos y calculamos el total de lecturas
        const obrasConTotales = obrasOrdenadas
            .map(item => ({
                ...item,
                total: (item.visitas || 0) + (item.visitasCapitulos || 0)
            }))
            .sort((a, b) => b.total - a.total);

        // 3. Enriquecemos todas las obras con la imagen del XML y su enlace directo
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

/**
 * 📦 Recibe un array de obras y les añade la URL de la primera imagen y el enlace directo desde el XML.
 */
/**
 * 📦 Recorre el XML una sola vez para extraer imágenes y claves, y enriquece las obras.
 */
function enriquecerObras(obras, xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const obraNodes = xmlDoc.getElementsByTagName("obra");
    
    const imagenesMap = {};
    const claveMap = {};

    // ⚡ Una única pasada por los nodos del XML
    for (let i = 0; i < obraNodes.length; i++) {
        const obraNode = obraNodes[i];
        const claveNode = obraNode.getElementsByTagName("clave")[0];
        
        if (claveNode) {
            const clave = claveNode.textContent.trim();
            const imagenNodes = obraNode.getElementsByTagName("imagen");
            const primeraImagen = imagenNodes.length > 0 ? imagenNodes[0].textContent.trim() : "";
            const imageUrl = primeraImagen ? `https://img.jabrascan.net/${primeraImagen}` : "";

            imagenesMap[clave] = imageUrl;
            claveMap[clave] = clave;

            const nombreObraNodes = obraNode.getElementsByTagName("nombreobra");
            for (let j = 0; j < nombreObraNodes.length; j++) {
                const nombre = nombreObraNodes[j].textContent.trim();
                if (nombre) {
                    claveMap[nombre] = clave;
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
        return {
            ...item,
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

                // Envolvemos tanto la imagen como el título en enlaces directos
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

// 📦 Obtener obras ordenadas por visitas, dejando obra_Inicio primero
function obtenerObrasOrdenadas(resumen) {
  const obras = [...resumen]; // 🧠 Evitar mutar el original

  // 🚫 Añade aquí las claves de las obras que quieras descartar del listado
  const obrasExcluidas = ['obra_JabraRexScan', 'obra_pwa', 'obra_Test', 'obra_Inicio'];
  const filtradas = obras.filter(item =>
      !obrasExcluidas.includes(item.obra) && !obrasExcluidas.includes(item.id)
  );

  // 🔍 Separar obra_Inicio si existe
  const inicio = filtradas.find(item => item.id === "obra_Inicio");
  const resto = filtradas.filter(item => item.id !== "obra_Inicio");

  // 🔢 Ordenar el resto por visitas totales descendente
  resto.sort((a, b) => {
    const visitasA = (a.visitas || 0) + (a.visitasCapitulos || 0);
    const visitasB = (b.visitas || 0) + (b.visitasCapitulos || 0);
    return visitasB - visitasA;
  });

  // 📎 Combinar obra_Inicio al principio si existe
  return inicio ? [inicio, ...resto] : resto;
}