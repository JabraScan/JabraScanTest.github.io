function initUltimosCapitulos() {
	const parseDateDMY = (s) => {
	  const [dd, mm, yyyy] = String(s).split("-").map(Number);
	  return new Date(yyyy, mm - 1, dd);
	};
	
	const parseChapterNumber = (n) => {
	  const num = parseFloat(String(n).replace(/[^0-9.]/g, ""));
	  return Number.isNaN(num) ? -Infinity : num;
	};
	
	const formatDateEs = (d) => {
	  const date = typeof d === "string" ? parseDateDMY(d) : d;
	  const dd = String(date.getDate()).padStart(2, "0");
	  const mm = String(date.getMonth() + 1).padStart(2, "0");
	  const yyyy = date.getFullYear();
	  return `${dd}-${mm}-${yyyy}`;
	};
	
	const flatten = (obj) => {
	  const items = [];
	  for (const key of Object.keys(obj)) {
	    for (const it of obj[key]) {
	      items.push({
	        ...it,
	        _fecha: parseDateDMY(it.Fecha),
	        _num: parseChapterNumber(it.numCapitulo),
	        _obra: it.tituloObra || key,
	        _clave: it.clave || key,
	      });
	    }
	  }
	  return items;
	};
	
	const sortDesc = (a, b) => {
	  const t = b._fecha - a._fecha;
	  if (t !== 0) return t;
	  if (b._num !== a._num) return b._num - a._num;
	  return String(b._obra).localeCompare(String(a._obra), "es", {
	    sensitivity: "base",
	  });
	};
	
	const listEl = document.getElementById("book-card-caps");
	const emptyEl = document.getElementById("empty");
	const metaEl = document.getElementById("meta");
	const qEl = document.getElementById("q");
	
	let state = { items: [], filtered: [] };
	
	const render = () => {
	  listEl.innerHTML = "";
	
	  if (!state.filtered.length) {
	    emptyEl.style.display = "block";
	    metaEl.textContent = "0 elementos";
	    return;
	  }
	
	  emptyEl.style.display = "none";
	  //creamos un div
	  const divsection = document.createElement("div");
	    divsection.className = "book-section";
	    divsection.className = "book-latest-chapters";
	    divsection.innerHTML = `<h3><i class="fa-solid fa-clock-rotate-left"></i> Últimos capítulos</h3>`;
	  // Creamos el <ul>
	  const ul = document.createElement("ul");
	    ul.className = "chapter-list";

	    state.filtered.forEach((item) => {
			const li = document.createElement("li");
				li.innerHTML = `
					<a href="#" style="flex-flow"
							data-pdf-obra="${item._clave}"
							data-pdf-capitulo="${item.numCapitulo}"
							class="pdf-link-ucap">
						<span class="fecha">${formatDateEs(item._fecha)}</span> -
						<span class="obra ${item._clave}">${item._obra}</span> -
						<span class="cap">${item.numCapitulo}</span> ·
						<span class="titulo">${item.nombreCapitulo}</span>
					</a>
				`;
			ul.appendChild(li);
	    });
	
	  divsection.appendChild(ul);
	  listEl.appendChild(divsection);
								// Después de insertar los capítulos en el DOM
									document.querySelectorAll('.pdf-link-ucap').forEach(link => {
									  link.addEventListener('click', function (e) {
									    e.preventDefault();
									    const clave = e.currentTarget.getAttribute("data-pdf-obra");
									    const capitulo = e.currentTarget.getAttribute("data-pdf-capitulo");
									
									    localStorage.setItem('ultimaObra', clave);
									    localStorage.setItem('ultimoCapitulo', capitulo);
									    localStorage.setItem("ultimaPagina", 1);
									
									    //console.log("Click detectado:", clave, capitulo);
									    window.location.href = 'lectorpdf.html';
									  });
									});
		
	  metaEl.textContent = `${state.filtered.length} capítulos · ${
	    new Set(state.filtered.map((i) => i._obra)).size
	  } obras`;
	};
	
	const applyFilter = () => {
	  const q = qEl.value.trim().toLowerCase();
	  state.filtered = !q
	    ? [...state.items]
	    : state.items.filter(
	        (it) =>
	          it._obra.toLowerCase().includes(q) ||
	          it.nombreCapitulo.toLowerCase().includes(q) ||
	          String(it.numCapitulo).includes(q)
	      );
	  render();
	};
	/*
	fetch("books.json")
	  .then((res) => res.json())
	  .then((data) => {
		  console.log("old");
			console.log(data);
	    state.items = flatten(data).sort(sortDesc);
	    state.filtered = [...state.items];
	    render();
	  })
	  .catch((err) => {
	    console.error("Error cargando books.json:", err);
	  });
   */
	//optimizacion lectura capitulos 29082025 0031
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
		    const todos = Object.assign({}, ...listasDeObras);
				state.items = flatten(todos).sort(sortDesc);
		    	state.filtered = [...state.items];
		    render();
		  })
		  .catch((err) => {
		    console.error("Error cargando capitulos.json:", err);
		  });
	//fin optimizacion lectura capitulos 29082025 0031
	
	qEl.addEventListener("input", applyFilter);
	
	window.addEventListener("keydown", (e) => {
	  if (e.key === "/" && document.activeElement !== qEl) {
		e.preventDefault();
		qEl.focus();
		qEl.select();
	  }
	});
}
