//document.addEventListener("DOMContentLoaded", () => {
  //if (window.location.href.includes("lectorpdf.html")) 
//actualizacion 27082025 1554
			// Variables globales para que todas las funciones las vean
			let pdfDoc = null;
			let pageNum = 1;
			let canvas, ctx, pageInfo, body;
			
			// ========== Renderizar página ==========
			function renderPage(num) {
			  pdfDoc.getPage(num).then(page => {
			    const scale = 1.5;
			    const viewport = page.getViewport({ scale });
			
			    canvas.height = viewport.height;
			    canvas.width = viewport.width;
			
			    const renderContext = {
			      canvasContext: ctx,
			      viewport: viewport
			    };
			
			    page.render(renderContext);
			    pageInfo.textContent = `Página ${num} de ${pdfDoc.numPages}`;
			    speechSynthesis.cancel();
			    localStorage.setItem("ultimaPagina", num);
			  });
			}
			
			// ========== Inicializador lector PDF ==========
			function initlectorpdf() {
			  canvas = document.getElementById("pdfCanvas");
			  ctx = canvas.getContext("2d");
			  pageInfo = document.getElementById("pageInfo");
			  body = document.body;
			
			  const startReadingBtn = document.getElementById("readAloud");
			  const stopReadingBtn = document.getElementById("stopReading");
			  const pauseReadingBtn = document.getElementById("pauseReading");
			  const resumeReadingBtn = document.getElementById("resumeReading");
  			  const toggleMode = document.getElementById("toggleMode");
//FIN actualizacion 27082025 1554
//actualizacion 27082025 1901, añade funcionalidad al boton hamburguesa
			// Botón hamburguesa y comportamiento responsive
			const menuToggle = document.getElementById('menu-toggle');
			const mainHeader = document.getElementById('main-header');
			
			menuToggle.addEventListener('click', () => {
			  mainHeader.classList.toggle('show');
			  document.body.classList.toggle('no-scroll', mainHeader.classList.contains('show'));
			});
			
			// Cierra menú al clicar un enlace
			mainHeader.querySelectorAll('a').forEach(link => {
			  link.addEventListener('click', () => {
			    if (window.innerWidth <= 600) {
			      mainHeader.classList.remove('show');
			      document.body.classList.remove('no-scroll');
			    }
			  });
			});
//FIN actualizacion 27082025 1901
		      // Modo claro/oscuro
		      toggleMode.onclick = () => {
		        body.classList.toggle("dark-mode");
		        body.classList.toggle("light-mode");
		        toggleMode.textContent = body.classList.contains("dark-mode") ? "☀️" : "🌙";
		        localStorage.setItem("modoNocturno", body.classList.contains("dark-mode") ? "true" : "false");
		      };
		    
		      if (localStorage.getItem("modoNocturno") === "true") {
		        body.classList.add("dark-mode");
		        body.classList.remove("light-mode");
		        toggleMode.textContent = "☀️";
		      }
		    
		      // Botones de lectura de Voz
		      function mostrarBotones({ play = false, pause = false, resume = false, stop = false }) {
		        startReadingBtn.style.display = play ? "inline-block" : "none";
		        pauseReadingBtn.style.display = pause ? "inline-block" : "none";
		        resumeReadingBtn.style.display = resume ? "inline-block" : "none";
		        stopReadingBtn.style.display = stop ? "inline-block" : "none";
		      }
				//actualizado 27082025 1913 agregada funcionalidad para continuar leyendo hasta el final de la obra
				startReadingBtn.onclick = () => {
					  pdfDoc.getPage(pageNum).then(page => {
					    page.getTextContent().then(textContent => {
					      const text = textContent.items.map(item => item.str).join(" ");
					      const utterance = new SpeechSynthesisUtterance(text);
					      utterance.lang = "es-ES";
					
					      const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith("es"));
					      if (voices.length > 0) {
					        utterance.voice = voices.find(v => v.name.includes("Google") || v.name.includes("Helena")) || voices[0];
					        utterance.rate = 0.95;
					        utterance.pitch = 1.1;
					        utterance.volume = 1;
					        mostrarBotones({ pause: true, stop: true });
					      }
					
					      // 📌 Aquí encadenamos la lectura continua
					      utterance.onend = () => {
					        const btnNext = document.querySelector('.nextPage');
					
					        if (btnNext && !btnNext.disabled) {
					          btnNext.click(); // pasa a la siguiente página
					          // Espera un poco a que se renderice la nueva página antes de leer
					          setTimeout(() => {
					            startReadingBtn.click();
					          }, 500);
					        } else {
					          // No hay más páginas/capítulos
					          const fin = new SpeechSynthesisUtterance("Ya no hay más contenido para leer");
					          fin.lang = "es-ES";
					          speechSynthesis.speak(fin);
					          mostrarBotones({ play: true });
					        }
					      };
					
					      speechSynthesis.speak(utterance);
					    });
					  });
				};
				
		    //fin startReading
		      pauseReadingBtn.onclick = () => {
		        if (speechSynthesis.speaking && !speechSynthesis.paused) {
		          speechSynthesis.pause();
		          mostrarBotones({ resume: true, stop: true });
		        }
		      };
		    
		      resumeReadingBtn.onclick = () => {
		        if (speechSynthesis.paused) {
		          speechSynthesis.resume();
		          mostrarBotones({ pause: true, stop: true });
		        }
		      };
		    
		      stopReadingBtn.onclick = () => {
		        speechSynthesis.cancel();
		        mostrarBotones({ play: true });
		      };
		    
		      window.addEventListener("resize", () => {
		        if (pdfDoc) renderPage(pageNum);
		      });
		
			  //codigo Optimizado carga libros
				// 🎯 Evento para enlaces de PDF
				document.querySelectorAll(".pdf-link").forEach(link => {
				  link.addEventListener("click", event => {
				    event.preventDefault();
				
				    const clave = event.currentTarget.getAttribute("data-pdf-obra");
				    const capitulo = event.currentTarget.getAttribute("data-pdf-capitulo");
				
				    localStorage.setItem("ultimaObra", clave);
				    localStorage.setItem("ultimoCapitulo", capitulo);
				
				    cargarCapitulo(clave, capitulo, 1);
				  });
				});
				
				// 🔄 Carga automática del último capítulo
				const ultimaObra = localStorage.getItem("ultimaObra");
				const ultimoCapitulo = localStorage.getItem("ultimoCapitulo");
				const ultimaPagina = parseInt(localStorage.getItem("ultimaPagina"), 10);
				
				if (ultimaObra && ultimoCapitulo) {
				  cargarCapitulo(ultimaObra, ultimoCapitulo, !isNaN(ultimaPagina) ? ultimaPagina : 1);
				}
		  }
//});
		function onLibroClick(libroId) {
		    // Guarda el ID o nombre del libro seleccionado (ajusta según tu XML)
		    localStorage.setItem('libroSeleccionado', libroId);
		    // Redirige a la ficha
		    //window.location.href = 'books/libro-ficha.html';
			// Usar fetch para cargar el contenido de disclaimer.html
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
// 📌 Función para cargar un capítulo
		function cargarCapitulo(clave, capitulo, paginaInicial = 1) {
		  fetch("capitulos.json")
		    .then(res => res.json())
		    .then(index => {
		      const obrasPromises = Object.entries(index).map(([k, ruta]) =>
		        fetch(ruta)
		          .then(res => {
		            if (!res.ok) throw new Error(`❌ No se pudo cargar "${k}" desde ${ruta}`);
		            return res.json();
		          })
		          .then(data => {
		            const capitulos = data[k] || [];
		            const capitulosConObra = capitulos.map(cap => ({
		              ...cap,
		              _clave: k,
		              _obra: cap.tituloObra || k,
		              _fecha: parseDateDMY(cap.Fecha),
		              _num: parseChapterNumber(cap.numCapitulo)
		            }));
		            return capitulosConObra;
		          })
		          .catch(err => {
		            console.warn(err.message);
		            return [];
		          })
		      );
		
		      return Promise.all(obrasPromises);
		    })
		    .then(listas => {
		      const todos = listas.flat(); // array plano de todos los capítulos
		      const capitulosObra = todos.filter(c => c._clave === clave);
		      const idx = capitulosObra.findIndex(c => c.numCapitulo === capitulo);
		      if (idx === -1) return;
		      const cap = capitulosObra[idx];
		
				// ✅ Actualizar título
			      const h1 = document.getElementById("tituloObraPdf");
			      h1.textContent = cap.tituloObra;
			      h1.onclick = () => onLibroClick(clave);
				  //actualizar aprobacion autor "dragona..."
					const datosAdic = document.querySelector(".optionaldata");
						if (clave === "CallateDragonaMalvadaNoQuieroTenerMasHijosContigo") {
							const divBanner = document.createElement("div");
								divBanner.className ="callatedragonmalvado"
								divBanner.innerHTML = `
										<span>Traducción aprobada por el autor</span>
										</br>
										<span><bold>Discord Oficial :</bold> <a href="https://discord.gg/Mk2qb65AxA" target="_blank">https://discord.gg/Mk2qb65AxA</a></span>
										</br>
										<img style="" src = "img/discord_oficial_jabrascan.jpg" alt = "Traducción aprobada">
				  					`;
							datosAdic.appendChild(divBanner);
						}
			
			      // 📄 Cargar PDF
			      const nombreA = encodeURIComponent(cap.NombreArchivo);
			      const pdfPath = `books/${clave}/${nombreA}`;
			      //console.log(`Cargando PDF: ${pdfPath}`);
			      pdfjsLib.getDocument(pdfPath).promise.then(doc => {
			        pdfDoc = doc;
			        pageNum = paginaInicial;
			        renderPage(pageNum);
					  actualizarBotonesNav(idx, capitulosObra, clave);
			      });
			
			// ⬅️ Botón capítulo anterior
			      const btnPrev = document.getElementById("btnPrevCap");
			      if (idx > 0) {
			        const prevCap = capitulosObra[idx - 1];
			        btnPrev.disabled = false;
			        btnPrev.onclick = () => {
			          localStorage.setItem("ultimaPagina", 1);
			          localStorage.setItem("ultimaObra", clave);
			          localStorage.setItem("ultimoCapitulo", prevCap.numCapitulo);
			          cargarCapitulo(clave, prevCap.numCapitulo, 1);
			        };
			      } else {
			        btnPrev.disabled = true;
			        btnPrev.onclick = null;
			      }
			
			      // ➡️ Botón capítulo siguiente
			      const btnNext = document.getElementById("btnNextCap");
			      if (idx < capitulosObra.length - 1) {
			        const nextCap = capitulosObra[idx + 1];
			        btnNext.disabled = false;
			        btnNext.onclick = () => {
			          localStorage.setItem("ultimaPagina", 1);
			          localStorage.setItem("ultimaObra", clave);
			          localStorage.setItem("ultimoCapitulo", nextCap.numCapitulo);
			          cargarCapitulo(clave, nextCap.numCapitulo, 1);
			        };
			      } else {
			        btnNext.disabled = true;
			        btnNext.onclick = null;
			      }
			
			      // 📜 Rellenar selector de capítulos
			      const chapterSelect = document.getElementById("chapterSelect");
			      chapterSelect.innerHTML = ""; // limpiar antes
			      capitulosObra.forEach(c => {
			        const option = document.createElement("option");
			        option.value = c.numCapitulo;
			        option.textContent = `${c.numCapitulo} · ${c.nombreCapitulo}`;
			        if (c.numCapitulo === capitulo) {
			          option.selected = true;
			        }
			        option.id = clave; // según tu requerimiento
			        chapterSelect.appendChild(option);
			      });
			
			      // 📌 Evento cambio selector → cargar nuevo capítulo
			      chapterSelect.onchange = () => {
			        const nuevoCap = chapterSelect.value;
			        localStorage.setItem("ultimaObra", clave);
			        localStorage.setItem("ultimoCapitulo", nuevoCap);
			        cargarCapitulo(clave, nuevoCap, 1);
			      };
		    })
		    .catch(error => console.error("Error al cargar el capítulo:", error));
		}
// 📌Fin Función para cargar un capítulo
	//Actualizacion de botones de navegacion por las paginas del pdf
	function actualizarBotonesNav(idxCapActual, capitulos, clave) {
	  // Configuración de estados que se aplicará a todos los botones según clase
		  let prevTexto, prevDisabled, prevAction;
		  let nextTexto, nextDisabled, nextAction;
		
		  // --- Lógica botón anterior ---
		  if (pageNum > 1) {
		    prevTexto = "Página anterior";
		    prevDisabled = false;
		    prevAction = () => {
		      pageNum--;
		      renderPage(pageNum);
		      actualizarBotonesNav(idxCapActual, capitulos, clave);
		      window.scrollTo({ top: 0, behavior: "smooth" });
		    };
		  } else if (idxCapActual > 0) {
		    prevTexto = "Capítulo anterior";
		    prevDisabled = false;
		    prevAction = () => {
		      const prevCap = capitulos[idxCapActual - 1];
		      localStorage.setItem("ultimaPagina", 1);
		      localStorage.setItem("ultimaObra", clave);
		      localStorage.setItem("ultimoCapitulo", prevCap.numCapitulo);
		      cargarCapitulo(clave, prevCap.numCapitulo, 1);
		      window.scrollTo({ top: 0, behavior: "smooth" });
		    };
		  } else {
		    prevTexto = "Capítulo anterior";
		    prevDisabled = true;
		    prevAction = null;
		  }
		
		  // --- Lógica botón siguiente ---
		  if (pageNum < pdfDoc.numPages) {
		    nextTexto = "Página siguiente";
		    nextDisabled = false;
		    nextAction = () => {
		      pageNum++;
		      renderPage(pageNum);
		      actualizarBotonesNav(idxCapActual, capitulos, clave);
		      window.scrollTo({ top: 0, behavior: "smooth" });
		    };
		  } else if (idxCapActual < capitulos.length - 1) {
		    nextTexto = "Capítulo siguiente";
		    nextDisabled = false;
		    nextAction = () => {
		      const nextCap = capitulos[idxCapActual + 1];
		      localStorage.setItem("ultimaPagina", 1);
		      localStorage.setItem("ultimaObra", clave);
		      localStorage.setItem("ultimoCapitulo", nextCap.numCapitulo);
		      cargarCapitulo(clave, nextCap.numCapitulo, 1);
		      window.scrollTo({ top: 0, behavior: "smooth" });
		    };
		  } else {
		    nextTexto = "Capítulo siguiente";
		    nextDisabled = true;
		    nextAction = null;
		  }
		
		  // --- Aplicar a todos los botones por clase ---
		  document.querySelectorAll(".prevPage").forEach(btn => {
		    btn.textContent = prevTexto;
		    btn.disabled = prevDisabled;
		    btn.onclick = prevAction;
		  });
		
		  document.querySelectorAll(".nextPage").forEach(btn => {
		    btn.textContent = nextTexto;
		    btn.disabled = nextDisabled;
		    btn.onclick = nextAction;
		  });
	}

	//Fin botones de navegacion por pagina
