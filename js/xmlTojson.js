/**
 * 📂 Archivo: /js/xmlTojson.js
 * 📝 Convierte obras.xml en JSON-LD según Schema.org (versión minimalista SEO)
 * 🚀 Inyecta el resultado en <head> como <script type="application/ld+json">
 */

async function xmlToJsonLd() {
  const response = await fetch("obras.xml");
  const text = await response.text();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "application/xml");

  const obras = Array.from(xmlDoc.querySelectorAll("obra")).map(obra => {
    const jsonObra = { "@type": "Book" };

    // 🏷️ Nombres alternativos de la obra
    const nombres = Array.from(obra.querySelectorAll("nombreobra"))
      .map(n => n.textContent.trim()).filter(Boolean);
    if (nombres.length) jsonObra.name = nombres;

    // Autor
    const autor = obra.querySelector("autor")?.textContent.trim();
    if (autor) jsonObra.author = { "@type": "Person", "name": autor };

    // Descripción / sinopsis
    addIfExists(jsonObra, "description", obra.querySelector("sinopsis"));

    // Identificador único
    addIfExists(jsonObra, "identifier", obra.querySelector("clave"));

    // Fecha de creación
    addIfExists(jsonObra, "dateCreated",
      normalizarFecha(obra.querySelector("fechaCreacion")?.textContent.trim()));

    // Categorías / géneros
    const categorias = (obra.querySelector("categoria")?.textContent || "")
      .split(",").map(c => c.trim()).filter(Boolean);
    if (categorias.length) jsonObra.genre = categorias;

    return jsonObra;
  });

  const jsonLd = { "@context": "https://schema.org", "@graph": obras };

  // 🔑 Inyectar en <head> para que Google lo lea
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.text = JSON.stringify(jsonLd, null, 2);
  document.head.appendChild(script);
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
  const value = typeof nodeOrValue === "string"
    ? nodeOrValue.trim()
    : nodeOrValue?.textContent.trim();
  if (value) obj[propName] = value;
}

// ▶️ Ejecutar conversión al cargar la página
xmlToJsonLd();
