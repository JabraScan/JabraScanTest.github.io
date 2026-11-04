import { obtenerResumenObras } from './contadoresGoogle.js';
import { truncarTexto } from './utils.js';

export async function renderResumenObras() {

    const podio = document.getElementById("podio");
    const ranking = document.getElementById("ranking");
    const errorBox = document.getElementById("error");
    const loader = document.getElementById("loader");

    if (loader) loader.style.display = "block";

    try {

        let [resumen, iconosRes] = await Promise.all([
            obtenerResumenObras(),
            fetch('/iconos.json').then(res => res.json()),
            fetch('/obras.xml').then(res => res.json())
        ]);

        if (!Array.isArray(resumen) || resumen.length === 0) {
            throw new Error("No se encontraron datos.");
        }
        //Procesamos y ordenamos todas las obras
        const obras = resumen
            .map(item => ({
                ...item,
                total: (item.visitas || 0) + (item.visitasCapitulos || 0)
            }))
            .sort((a, b) => b.total - a.total);
        //Extraemos los 3 primeros aplicando el mapeo de imágenes del XML
        const top3Obras = obtenerImagenes(obras.slice(0, 3), xmlText);

        renderPodio(
            podio,
            top3Obras,
            iconosRes
        );

        renderRanking(
            ranking,
            obras.slice(3),
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
 * 📦 Recibe un array con los 1os elementos ya ordenados y les añade la URL de la primera imagen desde el XML.
 */
function obtenerTop3ConImagenes(top3, xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const obraNodes = xmlDoc.getElementsByTagName("obra");
    const imagenesMap = {};

    for (let obraNode of obraNodes) {
        const claveNode = obraNode.getElementsByTagName("clave")[0];
        const imagenNodes = obraNode.getElementsByTagName("imagen");
        if (claveNode) {
            const clave = claveNode.textContent.trim();
            if (imagenNodes.length > 0) {
                imagenesMap[clave] = imagenNodes[0].textContent.trim();
            }
        }
    }

    return top3.map(item => ({
        ...item,
        imagenUrl: imagenesMap[item.obra] || imagenesMap[item.id] || ""
    }));
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

                return `
                    <div class="podium-item ${clases[posVisual]}">

                        <div class="podium-cover">
                            ${info.icono || "📚"}
                        </div>

                        <div class="podium-block">

                            <div
                                class="podium-title"
                                title="${escapeHtml(titulo)}">

                                ${escapeHtml(titulo)}

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

                                    <span
                                        title="${escapeHtml(titulo)}">

                                        ${escapeHtml(titulo)}

                                    </span>

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
  const copia = [...resumen]; // 🧠 Evitar mutar el original

  // 🔍 Separar obra_Inicio si existe
  const inicio = copia.find(item => item.id === "obra_Inicio");
  const resto = copia.filter(item => item.id !== "obra_Inicio");

  // 🔢 Ordenar el resto por visitas totales descendente
  resto.sort((a, b) => {
    const visitasA = (a.visitas || 0) + (a.visitasCapitulos || 0);
    const visitasB = (b.visitas || 0) + (b.visitasCapitulos || 0);
    return visitasB - visitasA;
  });

  // 📎 Combinar obra_Inicio al principio si existe
  return inicio ? [inicio, ...resto] : resto;
}
