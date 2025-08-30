document.addEventListener("DOMContentLoaded", function () {
	// Cargar el contenido en <main>
	fetch('obras.xml')
	  .then(response => response.text())
	  .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
	  .then(data => {
	    const obras = data.querySelectorAll("obra");
	    const carouselContainer = document.querySelector(".carousel-track");
	    const booklistContainer = document.querySelector(".book-list");
		const booklistContainernopc = document.querySelector(".lista-libros");
		  
	    obras.forEach(obra => {
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

		  let OKAutor = '';
		  if (aprobadaAutor === 'si') {
		  	OKAutor =  `
	 				<span class="carousel-info-label">'Traducción aprobada por el autor'</span>
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
			//imagen de la ficha
		    const imagenContenedor = document.createElement("div");
				  imagenContenedor.classList.add("imagen-contenedor");
				//indicador +18
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
				//fin indicador +18
			//fin imagen de la ficha
	      const indice = 0;
	
		  const itemCarousel = document.createElement("div");
		      itemCarousel.className = "carousel-item";
		      itemCarousel.innerHTML = `
		        <div class="carousel-info-overlay">
		          <div class="carousel-info-title libro-item">${nombreobra}</div>
				  </br>
		          <div class="carousel-info-row">
		            <span class="carousel-info-label clave">${clave}</span>
		            <!--<span class="carousel-info-label">Valoración:</span> <span>${valoracion}</span>-->
		            <span class="carousel-info-label">Autor:</span> <span>${autor}</span>
		            <span class="carousel-info-label">Traducción:</span> <span>${traduccion}</span>
		          </div>
		          <div class="carousel-info-row">
		            <span class="carousel-info-label">Tipo:</span> <span>${tipoobra}</span>
		            <span class="carousel-info-label">Estado:</span> <span class="${estado}">${estado}</span>
		          </div>
		          <div class="carousel-info-row">
			   		<span class="carousel-info-label">Categoría:</span>
		          </div>
		          <div class="carousel-info-row-tags">
		            ${categoriaObj}
			   	  </div>
		 		  </br>
		          <div class="carousel-info-row">
		            ${OKAutor}
			   	  </div>
		        </div>
		      `;
			  const tituloElemento = itemCarousel.querySelector(".carousel-info-title");
			  tituloElemento.onclick = () => onLibroClick(clave);
		  itemCarousel.prepend(imagenContenedor);
	      carouselContainer.appendChild(itemCarousel);

		  const imgContenedorHhtml = imagenContenedor.innerHTML;
	      const itemBook = document.createElement("article");
		      itemBook.classList.add("book-card-main", "libro-item");
			  itemBook.onclick = () => onLibroClick(clave);
				itemBook.innerHTML = `
						<div class="book-info-main">
							<p class="clave">${clave}</p>
							<h3>${nombreobra}</h3>
							<div class="book-author-name"><bold class="book-author-title">Autor:</bold> ${autor}</div>
							<div class="book-estado ${estado}">${estado}</div>
						</div>
			      `;
			const itemBookNOpc = document.createElement("li");
		      itemBookNOpc.classList.add("item-libro");
			  itemBookNOpc.onclick = () => onLibroClick(clave);
				itemBookNOpc.innerHTML = `
							<div class="info-libro">
	  							<p class="clave">${clave}</p>
								<strong>${nombreobra}</strong><br>
								Autor: <span> ${autor}</span><br>
								Estado: <span class="${estado}">${estado}</span><br>
								<!--
								Último capítulo:
									<span id="cap-libro-1"></span>
									(<span id="fecha-libro-1"></span>)
		 						-->
							</div>
			      `;
	//optimizacion lectura capitulos 29082025 0031 -ultimo capitulo
		//se ha creado un indice json y un json por obra
				fetch("capitulos.json")
				  .then((res) => res.json())
				  .then((index) => {
				    const obrasPromises = Object.entries(index).map(([clave, ruta]) =>
				      fetch(ruta)
				        .then((res) => {
				          if (!res.ok) {
				            throw new Error(`❌ No se pudo cargar "${clave}" desde ${ruta}`);
				          }
				          return res.json();
				        })
				        .then((data) => {
				          const capitulos = data[clave] || [];
				
				          // Añadir la propiedad "obra" a cada capítulo
				          const capitulosConObra = capitulos.map((cap) => ({
				            ...cap,
				            obra: clave
				          }));
				
				          return { [clave]: capitulosConObra };
				        })
				        .catch((err) => {
				          console.warn(err.message);
				          return { [clave]: [] };
				        })
				    );
				
				    return Promise.all(obrasPromises);
				  })
				  .then((listasDeObras) => {
				    const obrasUnificadas = Object.assign({}, ...listasDeObras);
				    // crear y añadir el bloque visual
						const bloque = crearUltimoCapituloDeObra(obrasUnificadas, clave);
						if (bloque) {
							const bloqueB = bloque.cloneNode(true);
							itemBook.querySelector(".book-info-main").appendChild(bloque);
							itemBookNOpc.querySelector(".info-libro").appendChild(bloqueB);
							
							  const hoyTag = itemBook.querySelector('.tag-capitulo.hoy');
							  if (hoyTag) {
							    const bookInfoMain = hoyTag.closest('.book-card-main');
							    if (bookInfoMain) {
							      	bookInfoMain.classList.add('hoy-book');
							    }
							  }
						}
				  })
				  .catch((err) => {
				    console.error("Error cargando capitulos.json:", err);
				  });
	//fin optimizacion lectura capitulos 29082025 0031
	//agregar etiquetas para los nuevos capitulos
	//
			// Clonar imagenContenedor
				const imagenContenedorA = imagenContenedor.cloneNode(true); // Clona el contenedor de imagen
				const imagenContenedorB = imagenContenedor.cloneNode(true); // Clona el contenedor de imagen
				// Prepend el contenedor de imagen al artículo
				itemBook.prepend(imagenContenedorA);
				itemBookNOpc.prepend(imagenContenedorB);
			//
	      	booklistContainer.appendChild(itemBook);
	      	booklistContainernopc.appendChild(itemBookNOpc);
			//
	    });
	  })
	  .catch(err => console.error("Error al cargar el XML:", err));

	ordenarLibrosPorFecha();
});

		function onLibroClick(libroId) {
		    // Guarda el ID o nombre del libro seleccionado (ajusta según tu XML)
		    localStorage.setItem('libroSeleccionado', libroId);
		    // Redirige a la ficha
			fetch('books/libro-ficha.html')
				.then(response => {
				if (!response.ok) {
					throw new Error('Error al cargar el archivo: ' + response.statusText);
				}
				return response.text();
				})
				.then(data => {
						// Cargar el contenido en <main>
						const mainElement = document.querySelector('main');
						mainElement.innerHTML = data;
						cargarlibro(libroId);
				})
				.catch(err => console.error('Error:', err));
		}
//function para etiquetas capitulo nuevo
	function generarEtiquetaNuevo(fechaInput) {
		const hoy = new Date();
		const fecha = new Date(fechaInput);
		
		hoy.setHours(0, 0, 0, 0);
		fecha.setHours(0, 0, 0, 0);
		
		const diferenciaDias = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
		
		if (diferenciaDias === 0) {
			return `<span class="tag-capitulo hoy">hoy</span>`;
		} else if (diferenciaDias > 0 && diferenciaDias <= 7) {
			return `<span class="tag-capitulo nuevo">nuevo</span>`;
		} else {
			return '';
		}
	}

//fin funcion etiquetas
//Buscar ultimo capitulo
		function crearUltimoCapituloDeObra(data, claveObra) {
			  const parseDateDMY = (s) => {
			    const [dd, mm, yyyy] = s.split("-").map(Number);
			    return new Date(yyyy, mm - 1, dd);
			  };
			  const parseChapterNumber = (n) => {
			    const num = parseFloat(String(n).replace(/[^0-9.]/g, ""));
			    return Number.isNaN(num) ? -Infinity : num;
			  };
			  const formatDateEs = (d) => {
			    const dd = String(d.getDate()).padStart(2, "0");
			    const mm = String(d.getMonth() + 1).padStart(2, "0");
			    const yyyy = d.getFullYear();
			    return `${dd}-${mm}-${yyyy}`;
			  };
			
			  const capitulos = data[claveObra];
			  if (!Array.isArray(capitulos) || capitulos.length === 0) {
			    return null; // no hay datos para esa clave
			  }
			
			  // ordenar por fecha ↓ y numCapitulo ↓
			  const ordenados = capitulos.slice().sort((a, b) => {
			    const fechaDiff = parseDateDMY(b.Fecha) - parseDateDMY(a.Fecha);
			    if (fechaDiff !== 0) return fechaDiff;
			    return parseChapterNumber(b.numCapitulo) - parseChapterNumber(a.numCapitulo);
			  });
			
			  const ultimo = ordenados[0];
			  const fechaUltimo = parseDateDMY(ultimo.Fecha);
			
			  // crear el bloque HTML
			  const divsection = document.createElement("div");
			  divsection.className = "book-latest-chapter";
			  divsection.setAttribute('data-fecha', ultimo.Fecha);
			  divsection.innerHTML = `
	 					<span>Último cap.</span>  
				        <span class="cap">${ultimo.numCapitulo}</span>
				        <span class="fecha">( ${formatDateEs(fechaUltimo)} )</span>
						${generarEtiquetaNuevo(fechaUltimo)}
	 				`;
			  return divsection;
		}

//fin funcion carga ultimo cap
//funcion ordenar fichas de libro por fecha descendente
		function ordenarLibrosPorFecha() {
			const section = document.querySelector('section.book-card-main.libro-item');
			if (!section) return;
			
			const articles = Array.from(section.querySelectorAll('article.book-card-main.libro-item'));
console.log(articles);			
			const parseFecha = (fechaStr) => {
				// Validar formato DD-MM-YYYY
				if (!fechaStr || !/^\d{2}-\d{2}-\d{4}$/.test(fechaStr)) return null;
				
				const [dia, mes, año] = fechaStr.split('-').map(Number);
				const fecha = new Date(año, mes - 1, dia);
				// Validar que la fecha sea coherente
					if (
						fecha.getFullYear() !== año ||
						fecha.getMonth() !== mes - 1 ||
						fecha.getDate() !== dia
					) {
						return null;
					}
					return fecha;
				};
		
				articles.sort((a, b) => {
					const fechaA = parseFecha(a.querySelector('.book-latest-chapter')?.getAttribute('data-fecha'));
					const fechaB = parseFecha(b.querySelector('.book-latest-chapter')?.getAttribute('data-fecha'));
				
					if (!fechaA && !fechaB) return 0; // Ambos sin fecha
					if (!fechaA) return 1;            // A sin fecha → va después
					if (!fechaB) return -1;           // B sin fecha → va después
					
					return fechaB - fechaA; // Orden descendente
				});
console.log(articles);				
			// Reorganizar el DOM con los artículos ordenados
			section.innerHTML = '';
			articles.forEach(article => section.appendChild(article));
		}
//fin funcion ordenar fichas de libro
