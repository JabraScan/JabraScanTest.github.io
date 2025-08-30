export function obtenerCapitulos(clave) {
  return fetch('../capitulos.json')
    .then(response => response.json())
    .then(index => {
      const ruta = index[clave];
      if (!ruta) {
        console.error("Clave no encontrada en el índice.");
        return [];
      }

      return fetch(ruta)
        .then(res => {
          if (!res.ok) throw new Error(`❌ No se pudo cargar "${clave}" desde ${ruta}`);
          return res.json();
        })
        .then(dataObra => {
          const capitulos = dataObra[clave] || [];

          return capitulos.map(item => ({
            NombreArchivo: item.NombreArchivo,
            Fecha: item.Fecha,
            numCapitulo: item.numCapitulo,
            nombreCapitulo: item.nombreCapitulo
          }));
        });
    })
    .catch(error => {
      console.error("Error al cargar los capítulos:", error);
      return [];
    });
}
