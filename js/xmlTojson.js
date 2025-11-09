/**
 * 📂 Archivo: /js/xmlTojson.js
 * 📝 Convierte obras.xml en JSON-LD según Schema.org
 * 🚀 El resultado se muestra en el <pre id="output"> de obras.html
 */

async function xmlToJsonLd() {
  // 📥 1. Cargar el archivo XML
  const response = await fetch("obras.xml");
  const text = await response.text();

  // 🔎 2. Parsear XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "application/xml");

  // 📚 3. Recorrer todas las <obra>
  const obras = Array.from(xmlDoc.querySelectorAll("obra")).map(obra => {
    const nombres = Array.from(obra.querySelectorAll("nombreobra")).map(n => n.textContent.trim());
    const imagenes = Array.from(obra.querySelectorAll("imagen")).map(img => img.textContent.trim());
    const categorias = (obra.querySelector("categoria")?.textContent || "")
      .split(",").map(c => c.trim()).filter(Boolean);

    return {
      "@type": "Book",
      // --- Campos estándar ---
      "identifier": obra.querySelector("clave")?.textContent.trim() || "",
      "name": nombres,
      "author": { "@type": "Person", "name": obra.querySelector("autor")?.textContent.trim() || "" },
      "description": obra.querySelector("sinopsis")?.textContent.trim() || "",
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": obra.querySelector("valoracion")?.textContent.trim() || "" },
      "bookFormat": obra.querySelector("tipoobra")?.textContent.trim() || "",
      "genre": categorias,
      "image": imagenes,
      "dateCreated": normalizarFecha(obra.querySelector("fechaCreacion")?.textContent.trim() || ""),
      "locationCreated": obra.querySelector("ubicacion")?.textContent.trim() || "",
      "creativeWorkStatus": obra.querySelector("estado")?.textContent.trim() || "",
      "translator": obra.querySelector("traductor")?.textContent.trim() || "",
      "audience": {
        "@type": "PeopleAudience",
        "suggestedMinAge": obra.querySelector("adulto")?.textContent.includes("adulto") ? 18 : undefined
      },
      "mainEntityOfPage": obra.querySelector("wiki")?.textContent.trim() || "",
      // --- Campos personalizados ---
      "visible": obra.querySelector("visible")?.textContent.trim() || "",
      "aprobadaAutor": obra.querySelector("aprobadaAutor")?.textContent.trim() || "",
      "observaciones": obra.querySelector("observaciones")?.textContent.trim() || "",
      "discussionUrl": obra.querySelector("discord")?.textContent.trim() || "",
      "bannerOpcional": obra.querySelector("bannerOpcional")?.textContent.trim() || ""
    };
  });

  // 🧩 4. Construir JSON-LD completo
  const jsonLd = { "@context": "https://schema.org", "@graph": obras };

  // 🖨️ 5. Mostrar en la página
  document.getElementById("output").textContent = JSON.stringify(jsonLd, null, 2);
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

// ▶️ Ejecutar conversión al cargar la página
xmlToJsonLd();
