/**
 * 📂 Archivo: /js/xmlTojson.js
 * 📝 Convierte obras.xml en JSON-LD según Schema.org
 * 🚀 Muestra el resultado en <pre id="output"> y lo descarga como json-ld.json
 * ✅ Obvia etiquetas vacías o inexistentes
 */

async function xmlToJsonLd() {
  const response = await fetch("obras.xml");
  const text = await response.text();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "application/xml");

  const obras = Array.from(xmlDoc.querySelectorAll("obra")).map(obra => {
    const jsonObra = { "@type": "Book" };

    // 🏷️ Títulos múltiples
    const nombres = Array.from(obra.querySelectorAll("nombreobra")).map(n => n.textContent.trim()).filter(Boolean);
    if (nombres.length) jsonObra.name = nombres;

    // 🖼️ Imágenes múltiples
    const imagenes = Array.from(obra.querySelectorAll("imagen")).map(img => img.textContent.trim()).filter(Boolean);
    if (imagenes.length) jsonObra.image = imagenes;

    // 🏷️ Categorías separadas por coma
    const categorias = (obra.querySelector("categoria")?.textContent || "")
      .split(",").map(c => c.trim()).filter(Boolean);
    if (categorias.length) jsonObra.genre = categorias;

    // --- Campos estándar ---
    addIfExists(jsonObra, "identifier", obra.querySelector("clave"));
    addIfExists(jsonObra, "description", obra.querySelector("sinopsis"));
    addIfExists(jsonObra, "bookFormat", obra.querySelector("tipoobra"));
    addIfExists(jsonObra, "dateCreated", normalizarFecha(obra.querySelector("fechaCreacion")?.textContent.trim()));
    addIfExists(jsonObra, "locationCreated", obra.querySelector("ubicacion"));
    addIfExists(jsonObra, "creativeWorkStatus", obra.querySelector("estado"));
    addIfExists(jsonObra, "translator", obra.querySelector("traductor"));
    addIfExists(jsonObra, "mainEntityOfPage", obra.querySelector("wiki"));

    // Autor
    const autor = obra.querySelector("autor")?.textContent.trim();
    if (autor) jsonObra.author = { "@type": "Person", "name": autor };

    // Valoración
    const valoracion = obra.querySelector("valoracion")?.textContent.trim();
    if (valoracion) jsonObra.aggregateRating = { "@type": "AggregateRating", "ratingValue": valoracion };

    // Audiencia (adulto)
    const adulto = obra.querySelector("adulto")?.textContent.trim();
    if (adulto && adulto.toLowerCase().includes("adulto")) {
      jsonObra.audience = { "@type": "PeopleAudience", "suggestedMinAge": 18 };
    }

    // --- Campos personalizados ---
    addIfExists(jsonObra, "visible", obra.querySelector("visible"));
    addIfExists(jsonObra, "aprobadaAutor", obra.querySelector("aprobadaAutor"));
    addIfExists(jsonObra, "observaciones", obra.querySelector("observaciones"));
    addIfExists(jsonObra, "discussionUrl", obra.querySelector("discord"));
    addIfExists(jsonObra, "bannerOpcional", obra.querySelector("bannerOpcional"));

    return jsonObra;
  });

  const jsonLd = { "@context": "https://schema.org", "@graph": obras };

  // Mostrar en la página
  document.getElementById("output").textContent = JSON.stringify(jsonLd, null, 2);

  // Descargar automáticamente
  //descargarJson(jsonLd);
}

/**
 * 🗓️ Normaliza fechas dd/mm/yyyy → yyyy-mm-dd
 */
function normalizarFecha(fecha) {
  if (!fecha) return "";
  const partes = fecha.split("/");
  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return fecha;
}

/**
 * ➕ Añade propiedad al objeto solo si existe y no está vacía
 */
function addIfExists(obj, propName, nodeOrValue) {
  const value = typeof nodeOrValue === "string" ? nodeOrValue.trim() : nodeOrValue?.textContent.trim();
  if (value) obj[propName] = value;
}

/**
 * 💾 Descarga el JSON-LD como archivo json-ld.json
 */
function descargarJson(jsonLd) {
  const blob = new Blob([JSON.stringify(jsonLd, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "json-ld.json";
  a.click();

  URL.revokeObjectURL(url);
}

// ▶️ Ejecutar conversión al cargar la página
xmlToJsonLd();
