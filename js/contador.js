import { obtenerResumenObras } from './contadoresGoogle.js';
import { truncarTexto } from './utils.js';

/**
 * 📊 Renderiza dos gráficos horizontales:
 * - Uno con descripciones de obras
 * - Otro con iconos de obras
 */
export async function renderResumenObras() {
  const canvasDescripcion = document.getElementById("graficaObras");
  const errorBox = document.getElementById("error");
  const loader = document.getElementById("loader");

  if (loader) loader.style.display = "block";

  try {
    let [resumen, iconosRes] = await Promise.all([
      obtenerResumenObras(),
      fetch('./iconos.json').then(res => res.json())
    ]);

    if (!Array.isArray(resumen) || resumen.length === 0) {
      throw new Error("No se encontraron datos.");
    }
    // Reordenar resumen
    resumen = obtenerObrasOrdenadas(resumen);

    // 🔍 Preparar datos
    const visitasTotales = resumen.map(item => (item.visitas || 0) + (item.visitasCapitulos || 0));

    const etiquetasDescripcion = resumen.map(item => {
      const info = iconosRes[item.obra] || iconosRes["Default"];
      return info.descripcion || item.obra || item.id;
    });

    const etiquetasIcono = resumen.map(item => {
      const info = iconosRes[item.obra] || iconosRes["Default"];
      return info.icono || "✨";
    });
    // Crear etiquetas combinadas icono + Obra
    const etiquetasCombinadas = [];   // 🧠 Guardar etiquetas truncadas para el grafico
    const etiquetasCompletas = [];    // 🧠 Guardar etiquetas completas para el tooltip
      resumen.forEach(item => {
        const info = iconosRes[item.obra] || iconosRes["Default"];
        const icono = info.icono || "✨";
        const descripcion = info.descripcion || item.obra || item.id;
        const etiqueta = `${icono} ${truncarTexto(descripcion, 22)}`;
        etiquetasCombinadas.push(etiqueta);
        etiquetasCompletas.push(`${icono} ${descripcion}`);
      });
    // 📈 Gráfico con descripciones
    new Chart(canvasDescripcion, {
      plugins: [ChartDataLabels],
      type: "bar",
      data: {
        labels: etiquetasCombinadas,
        datasets: [{
          label: "Visitas totales",
          data: visitasTotales,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false, // 🔧 Permite que el gráfico se estire verticalmente
        plugins: {
          title: {
            display: true,
            text: "Visitas"
          },
          legend: {
            display: false
          },
          // 🧠 Mostrar tooltip con título completo + visitas
          tooltip: {
            callbacks: {
              label: function(context) {
                const index = context.dataIndex;
                const visitas = context.dataset.data[index];
                return `${etiquetasCompletas[index]}: ${visitas} visitas`;
              }
            }
          },
          datalabels: {
            anchor: 'end',
            align: function(context) {
              const value = context.dataset.data[context.dataIndex];
              const max = Math.max(...context.dataset.data);
              const porcentaje = value / max;
              return porcentaje > 0.9 ? 'start' : 'right';
            },
            formatter: value => value,
            color: function(context) {
              const value = context.dataset.data[context.dataIndex];
              const max = Math.max(...context.dataset.data);
              const porcentaje = value / max;
              return porcentaje > 0.5 ? '#fff' : '#333';
            },
            font: {
              weight: 'bold'
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    });
  } catch (error) {
    console.error("❌ Error al renderizar gráficos:", error);
    if (errorBox) {
      errorBox.textContent = "❌ Error al cargar datos: " + error.message;
      errorBox.classList.remove("hidden");
    }
  } finally {
    if (loader) loader.style.display = "none";
  }
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
