function cargarlibro(libroId) { 
        if (!libroId) {
            // Manejar error
            document.body.innerHTML = '<p>No se encontró el libro seleccionado.</p>';
            return;
        }
    
        // Cargar el XML y buscar el libro por ID
        fetch('../obras.xml')
            .then(response => response.text())
            .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
            .then(data => {
                // Ajusta el selector al formato de tu XML
                const obra = Array.from(data.getElementsByTagName('obra'))
                    .find(obra => obra.querySelector('clave').textContent.trim() === libroId);
                if (!obra) {
                    document.body.innerHTML = '<p>Obra no encontrada.</p>';
                    return;
                }
		      const clave = obra.querySelector("clave").textContent.trim();
		      const nombreobra = obra.querySelector("nombreobra").textContent.trim();
		      const nombreobra2 = obra.querySelector("nombreobra2").textContent.trim();
		      const autor = obra.querySelector("autor").textContent.trim();
		      const sinopsis = obra.querySelector("sinopsis").textContent.trim();
		      const imagen = obra.querySelector("imagen").textContent.trim();
		      const valoracion = obra.querySelector("valoracion").textContent.trim();
		      const tipoobra = obra.querySelector("tipoobra").textContent.trim();
			  const Categoria = obra.querySelector("categoria").textContent.trim();
			  const estado = obra.querySelector("estado").textContent.trim();
			  const ubicacion = obra.querySelector("ubicacion").textContent.trim();
			  const traduccion = obra.querySelector("traductor").textContent.trim();
			  const contenido18 = obra.querySelector("adulto").textContent.trim();
			  const bannerOpcional = obra.querySelector("bannerOpcional").textContent.trim();
			  const observaciones = obra.querySelector("observaciones").textContent.trim();
			  const discord = obra.querySelector("discord").textContent.trim();
			  const aprobadaAutor = obra.querySelector("aprobadaAutor").textContent.trim();
			  const wiki = obra.querySelector("wiki").textContent.trim();
				  //Aprobado por el autor
				  let OKAutor = '';
				  if (aprobadaAutor === 'si') {
				  	OKAutor =  `
			 				<span class="carousel-info-label">Traducción aprobada por el autor</span>
			 				</br>
			  				<span>Discord Oficial : <a href="${discord}" target="_blank">${discord}</a></span>
			 				`;
				  }
		
				  const categoriaIndiv = Categoria.split(",").map(item => item.trim());
					let categoriaObj = '';
					categoriaIndiv.forEach(item => {
					  categoriaObj += '<span class="etiqueta">' + item + '</span>'; // Imprime cada item en la consola
					  // Puedes hacer lo que necesites con cada 'item' aquí
					});
					//indicador +18
				    const imagenContenedor = document.createElement("div");
						  imagenContenedor.classList.add("imagen-contenedor");
						
						  const img = document.createElement("img");
						  img.src = "../img/" + imagen;
						  img.alt = nombreobra;
						  imagenContenedor.appendChild(img);
						
						  if (contenido18 === "adulto") {
						    imagenContenedor.classList.add("adulto");
						    const indicador = document.createElement("div");
						    indicador.classList.add("indicador-adulto");
						    indicador.textContent = "+18";
						    imagenContenedor.appendChild(indicador);
						  }
					//banner opcional
					/*if (bannerOpcional !== "") {
						const divBanner = document.createElement("div");
							divBanner.classList.add("lupa");
							const imgBanner = document.createElement("img");
								imgBanner.src = "../img/" + bannerOpcional;
								imgBanner.alt = "Traducción aprobada";
						divBanner.appendChild(imgBanner);
						imagenContenedor.appendChild(divBanner);
					}*/
				//fin banner opcional
					const imgContenedorHhtml = imagenContenedor.innerHTML;
					//Listado Capitulos
						obtenerCapitulos(clave).then(listacapitulos => {
						// Aquí generamos las dos secciones
						  const ultimosCapitulos = listacapitulos
							  .map(c => ({
								    ...c,
								    fechaObj: parseDateDMY(c.Fecha),
								    capNum: parseChapterNumber(c.numCapitulo)
							  }))
							  .filter(c => c.fechaObj)
							  .sort((a, b) => {
								    // 1) Fecha descendente
								    const diffFecha = b.fechaObj - a.fechaObj;
								    if (diffFecha !== 0) return diffFecha;
								
								    // 2) capNum descendente (natural: "2" < "10", "E2" < "E10")
								    const diffCap = compareCapNumDesc(a, b);
								    if (diffCap !== 0) return diffCap;
								
								    // 3) Título descendente (ignorando mayúsculas/minúsculas)
								    //return String(b.Titulo || "").localeCompare(String(a.Titulo || ""), undefined, {
								    //  sensitivity: "base"
								    //});
							  })
							  .slice(0, 6);
							//fin actualizacion 28082025 1319
							//console.log(ultimosCapitulos);
						  const totalCapitulos = listacapitulos.length;
						
						  // Sección: Últimos capítulos
						  const ultimosHTML = ultimosCapitulos.map(cap => `
						    <li>
		  						<a href="#" data-pdf-obra="${clave}" data-pdf-capitulo="${cap.numCapitulo}" class="pdf-link">
								  <span>${cap.numCapitulo}: ${cap.nombreCapitulo}</span>
								  <span>(${cap.Fecha})</span>
								</a>
						    </li>
						  `).join('');
						
						  const seccionUltimos = `
						    <div class="book-section book-latest-chapters">
						      <h3><i class="fa-solid fa-clock-rotate-left"></i> Últimos capítulos</h3>
						      <ul class="chapter-list">
						        ${ultimosHTML}
						      </ul>
						    </div>
						  `;
						
						  // Sección: Capítulos paginados
						  const capitulosPorPagina = 10;
						  const paginas = Math.ceil(totalCapitulos / capitulosPorPagina);
						  let paginacionHTML = '';
						
						  for (let i = 0; i < paginas; i++) {
						    const inicio = i * capitulosPorPagina;
						    const fin = inicio + capitulosPorPagina;
						    const pagina = listacapitulos.slice(inicio, fin);
						
						    const capitulosHTML = pagina.map(cap => `
						      <li>
		  						<a href="#" data-pdf-obra="${clave}" data-pdf-capitulo="${cap.numCapitulo}" class="pdf-link">
								  <span>${cap.numCapitulo} · ${cap.nombreCapitulo}</span>
								  <span>(${cap.Fecha})</span>
								</a>
						      </li>
						    `).join('');
						
						    paginacionHTML += `
						      <div class="chapter-page" data-pagina="${i + 1}" style="display: ${i === 0 ? 'block' : 'none'};">
						        <!--<h4>Página ${i + 1}</h4>-->
						        <ul>${capitulosHTML}</ul>
						      </div>
						    `;
						  }
						
						  const seccionPaginada = `
						    <div class="book-section book-chapters-list">
						      <h3><i class="fa-solid fa-list-ol"></i> Todos los capítulos</h3>
								<div class="chapter-pagination chapter-columns">
									${paginacionHTML}
								</div>
								<div class="pagination-controls pagination">
									${Array.from({ length: paginas }, (_, i) => `
		  								<button class="pagina-btn" data-pagina="${i + 1}">${i + 1}</button>
									`).join('')}
								</div>
						    </div>
						  `;
						
						  // Añadir ambas secciones al final de la ficha
						  const DataBook = document.querySelector('.book-card-caps');
						  const seccionesHTML = document.createElement("div");
						  seccionesHTML.className = "book-extra-sections";
						  seccionesHTML.innerHTML = seccionUltimos + seccionPaginada;
						  DataBook.appendChild(seccionesHTML);
							// Después de insertar los capítulos en el DOM
								document.querySelectorAll('.pdf-link').forEach(link => {
								  link.addEventListener('click', function (e) {
								    e.preventDefault();
								    const clave = e.currentTarget.getAttribute("data-pdf-obra");
								    const capitulo = e.currentTarget.getAttribute("data-pdf-capitulo");
								
								    localStorage.setItem('ultimaObra', clave);
								    localStorage.setItem('ultimoCapitulo', capitulo);
								    localStorage.setItem("ultimaPagina", 1);
								
								    //console.log("Click detectado:", clave, capitulo);
								
								    //window.location.href = 'lectorpdf.html';
									  abrirLectorPDF();
								  });
								});

						
						  // Activar paginación
						  const botones = document.querySelectorAll('.pagina-btn');
						  botones.forEach(btn => {
						    btn.addEventListener('click', () => {
						      const pagina = btn.getAttribute('data-pagina');
						      document.querySelectorAll('.chapter-page').forEach(div => {
						        div.style.display = div.getAttribute('data-pagina') === pagina ? 'block' : 'none';
						      });
						    });
						  });
						});
				//Generar la ficha del libro
				const DataBook = document.querySelector('.book-card-caps');
					const headerDataBook = document.createElement("div");
						headerDataBook.className = "book-header";
						headerDataBook.innerHTML = `
							<i class="fa-solid fa-book"></i> ${nombreobra.toUpperCase()}
						`;

					const mainDataBook = document.createElement("div");
						mainDataBook.className = "book-main";
						mainDataBook.innerHTML = `
							<div class="book-image">
								<div class="book-genres">
									<span><i class="fa-solid fa-tags"></i>${Categoria}</span>                
								</div>
								<div class="book-links">
									<a href="#"><i class="fa-solid fa-book"></i> ${tipoobra}</a>
									<a href="#"><i class="fa-solid fa-globe"></i> ${ubicacion}</a>
									<a href="#"><i class="fa-solid fa-clock"></i> ${estado}</a>
								</div>
							</div>
							<div class="book-info-container">
									<div class="book-info">
										<h2 id="nombre-obra">${nombreobra}</h2>
										<div><b>Autor: </b> ${autor}</div>
		  								<div><b>Traducción: </b>${traduccion}</div>
  								 		${OKAutor}
									</div>
									<div class="book-synopsis">
										<b><i class="fa-solid fa-info-circle"></i> Sinopsis:</b>
										<p id="sinopsis-obra">${sinopsis}</p>
									</div>
		 							<div class="book_extras">
		  								<a class="book-wiki" href="${wiki}" target="_blank">Fans Wiki</a>
		  							</div>
									<!--
		 							<div class="book-buttons">
										<button class="chapter-list"><i class="fa-solid fa-list"></i> Lista de capítulos</button>
										<button class="read-first"><i class="fa-solid fa-play"></i> Empezar a leer</button>
									</div>
		 							-->
							</div>
						`;
					DataBook.prepend(mainDataBook);
					DataBook.prepend(headerDataBook);
					  const bookImageContainer = mainDataBook.querySelector(".book-image");
					  bookImageContainer.insertBefore(imagenContenedor, bookImageContainer.firstChild);

					//actualizado 27082025 1945 - activamos disqus 
						mostrarDisqus(clave, clave);
				});
}
function obtenerCapitulos(clave) {
  /*return fetch('books.json')
    .then(response => response.json())
    .then(dataCapitulos => {
      if (!dataCapitulos[clave]) {
        console.error("Clave no encontrada.");
        return [];
      }

      //const resultado = dataCapitulos[clave].map(item => {

		
		//
        const partes = item.NombreArchivo.split(' - ');
        return {
          NombreArchivo: item.NombreArchivo,
          Fecha: item.Fecha,
          numCapitulo: item.numCapitulo,
          nombreCapitulo: item.nombreCapitulo
        };
      });
      resultado.sort((a, b) => {
        // Convertir la fecha de dd-mm-aaaa a un objeto Date
        const [diaA, mesA, anioA] = a.Fecha.split('-');
        const [diaB, mesB, anioB] = b.Fecha.split('-');
        
        const fechaA = new Date(`${anioA}-${mesA}-${diaA}`);
        const fechaB = new Date(`${anioB}-${mesB}-${diaB}`);
        
        // Ordenar por fecha y luego por número de capítulo
        return fechaA - fechaB || a.numCapitulo - b.numCapitulo;
      });
      return resultado;
    })
    .catch(error => {
      console.error("Error al cargar el archivo JSON:", error);
      return [];
    });*/
	return fetch('capitulos.json')
	  .then(response => response.json())
	  .then(index => {
	    const ruta = index[clave];
	    if (!ruta) {
	      console.error("Clave no encontrada en el índice.");
	      return [];
	    }
	
	    return fetch(ruta)
	      .then(res => {
	        if (!res.ok) {
	          throw new Error(`❌ No se pudo cargar "${clave}" desde ${ruta}`);
	        }
	        return res.json();
	      })
	      .then(dataObra => {
	        const capitulos = dataObra[clave] || [];
	
	        const resultado = capitulos.map(item => {
	          const partes = item.NombreArchivo.split(' - '); // si lo necesitas
	          return {
	            NombreArchivo: item.NombreArchivo,
	            Fecha: item.Fecha,
	            numCapitulo: item.numCapitulo,
	            nombreCapitulo: item.nombreCapitulo
	          };
	        });
	
	        resultado.sort((a, b) => {
	          const [diaA, mesA, anioA] = a.Fecha.split('-');
	          const [diaB, mesB, anioB] = b.Fecha.split('-');
	
	          const fechaA = new Date(`${anioA}-${mesA}-${diaA}`);
	          const fechaB = new Date(`${anioB}-${mesB}-${diaB}`);
	
	          return fechaA - fechaB || a.numCapitulo - b.numCapitulo;
	        });
	
	        return resultado;
	      });
	  })
	  .catch(error => {
	    console.error("Error al cargar los capítulos:", error);
	    return [];
	  });


}
//document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.pdf-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
  	 	const clave = e.currentTarget.getAttribute("data-pdf-obra");
    	const capitulo = e.currentTarget.getAttribute("data-pdf-capitulo");

      // Guardar en localStorage
      localStorage.setItem('ultimaObra', clave);
      localStorage.setItem('ultimoCapitulo', capitulo);
	  localStorage.setItem("ultimaPagina", 1);
		//console.log(obra);
		//console.log(capitulo);
      // Redirigir a lectorpdf.html
      window.location.href = 'lectorpdf.html';
    });
  });
//});
//controles de fecha y numero para la ordenacion
function parseDateDMY(str) {
  if (typeof str !== "string") return null;
  const partes = str.split("-");
  if (partes.length !== 3) return null;

  const [d, m, y] = partes.map(Number);
  const fecha = new Date(y, m - 1, d);

  // Comprobar que el objeto Date coincide con los valores originales
  if (
    fecha.getFullYear() === y &&
    fecha.getMonth() === m - 1 &&
    fecha.getDate() === d
  ) {
    return fecha;
  }
  return null; // formato inválido
}

function parseChapterNumber(v) {
  const num = parseFloat(v);
  return Number.isFinite(num) ? num : -Infinity; // -Infinity si no es válido
}
//fin controles de fecha y numero para la ordenacion
//Abrir pdf
	// Función para abrir el lector PDF dentro del main
	function abrirLectorPDF() {
	  fetch('lectorpdf.html')
	    .then(r => r.text())
	    .then(html => {
	      document.querySelector('main').innerHTML = html;
	
	      // Si ya tienes cargado lectorpdf.js, basta llamar init
	      if (typeof initlectorpdf === "function") {
			  //console.log("initlectorpdf");
	        initlectorpdf();
	      } else {
			  //console.log("initlectorpdf no cargado");
	        // Si no está cargado aún, lo añadimos dinámicamente
	        const script = document.createElement('script');
	        script.src = 'js/lectorpdf.js';
	        script.onload = () => initlectorpdf();
	        document.body.appendChild(script);
	      }
	    })
	    .catch(err => console.error('Error cargando lectorpdf.html:', err));
	}
//fin Abrir pdf
//parse fecha y num cap en formato texto 28082025
	function parseDateDMY(fechaStr) {
	  if (!fechaStr) return null;
	
	  const parts = String(fechaStr).split("-");
	  if (parts.length !== 3) return null;
	
	  let [d, m, y] = parts.map(p => p.trim());
	  d = d.padStart(2, "0");
	  m = m.padStart(2, "0");
	
	  if (!/^\d{2}$/.test(d) || !/^\d{2}$/.test(m) || !/^\d{4}$/.test(y)) return null;
	
	  const date = new Date(Number(y), Number(m) - 1, Number(d));
	  if (
	    date.getFullYear() !== Number(y) ||
	    date.getMonth() !== Number(m) - 1 ||
	    date.getDate() !== Number(d)
	  ) {
	    return null;
	  }
	
	  return date;
	}
	
	function parseChapterNumber(numeroCapitulo) {
	  // Lo dejamos como texto, pero normalizado
	  return numeroCapitulo != null ? String(numeroCapitulo).trim() : "";
	}
	
	// Comparación "natural" descendente para texto con números (p.ej. "2" < "10", "E2" < "E10")
	function compareCapNumDesc(a, b) {
	  const sa = String(a.capNum ?? "").trim();
	  const sb = String(b.capNum ?? "").trim();
	
	  // Vacíos al final en orden descendente
	  if (sa === "" && sb === "") return 0;
	  if (sa === "") return 1;
	  if (sb === "") return -1;
	
	  // Comparación natural con números, descendente (sb vs sa)
	  const r = sb.localeCompare(sa, undefined, { numeric: true, sensitivity: "base" });
	  if (r !== 0) return r;
	
	  // Fallback: si ambos son números puros, compara numéricamente
	  const na = Number(sa);
	  const nb = Number(sb);
	  if (!Number.isNaN(na) && !Number.isNaN(nb) && nb !== na) return nb - na;
	
	  return 0;
	}
//fin parse fecha y num cap
