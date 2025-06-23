const tabs = document.querySelectorAll(".tab");
let modo = "ideal";

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("activa"));
    tab.classList.add("activa");
    modo = tab.dataset.modo;
    console.log("Modo actual:", modo);
  });
});

const botonModo = document.getElementById("modo-boton");

function aplicarModoOscuro(activar) {
  document.documentElement.classList.toggle("oscuro", activar);
  botonModo.textContent = activar ? "☀️" : "🌙";
  localStorage.setItem("modoOscuro", activar ? "true" : "false");
}

botonModo.addEventListener("click", () => {
  const activado = !document.documentElement.classList.contains("oscuro");
  aplicarModoOscuro(activado);
});

let idiomaActual = localStorage.getItem("idioma") || "es";
const inputGas = document.getElementById("gas");
const lista = document.getElementById("lista-sugerencias");

function normalizar(texto) {
  return texto
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "") 
    .toLowerCase();
}

function registrarAcceso(simbolo) {
  const accesos = JSON.parse(localStorage.getItem("accesos") || "{}");
  accesos[simbolo] = (accesos[simbolo] || 0) + 1;
  localStorage.setItem("accesos", JSON.stringify(accesos));
}

function obtenerMasAccedidas() {
  const accesos = JSON.parse(localStorage.getItem("accesos") || "{}");

  return sustancias
    .map(s => ({
      ...s,
      visitas: accesos[s.simbolo] || 0
    }))
    .sort((a, b) => b.visitas - a.visitas);
}

inputGas.addEventListener("focus", () => {
  if (inputGas.value.trim() !== "") return;

  const top = obtenerMasAccedidas().slice(0, 5);
  lista.innerHTML = "";

  top.forEach(s => {
    const li = document.createElement("li");
    li.textContent = `${s.simbolo} – ${s[idiomaActual]}`;
    li.addEventListener("click", () => {
      inputGas.value = s.simbolo;
      lista.style.display = "none";
      registrarAcceso(s.simbolo);
    });
    lista.appendChild(li);
  });

  lista.style.display = top.length ? "block" : "none";
});

inputGas.addEventListener("input", () => {
  const entrada = normalizar(inputGas.value);
  lista.innerHTML = "";

  if (entrada.length === 0) {
    lista.style.display = "none";
    return;
  }

  const resultados = obtenerMasAccedidas().filter(s =>
    normalizar(s.simbolo).includes(entrada) ||
    normalizar(s[idiomaActual]).includes(entrada)
  );

  if (resultados.length === 0) {
    lista.style.display = "none";
    return;
  }

  resultados.forEach(s => {
    const li = document.createElement("li");
    li.textContent = `${s.simbolo} – ${s[idiomaActual]}`;
    li.addEventListener("click", () => {
      inputGas.value = s.simbolo;
      lista.style.display = "none";
      registrarAcceso(s.simbolo);
    });
    lista.appendChild(li);
  });

  lista.style.display = "block";
});

document.addEventListener("click", (e) => {
  if (!inputGas.contains(e.target) && !lista.contains(e.target)) {
    lista.style.display = "none";
  }
});

const textos = {
  es: {
    sustancia: "Sustancia",
    placeholderGas: "Ej. aire, CO₂...",
    temperatura: "Temperatura",
    calcular: "Calcular",
    titulo: "Calculadora online de coeficiente adiabático",
    unidades: ["K", "°C", "°F"],
    tabs: {
      ideal: "Gas ideal",
      real: "Gas real"
    }
  },
  en: {
    sustancia: "Substance",
    placeholderGas: "e.g. air, CO₂...",
    temperatura: "Temperature",
    calcular: "Calculate",
    titulo: "Online Heat Capacity Ratio Calculator",
    unidades: ["K", "°C", "°F"],
    tabs: {
      ideal: "Ideal gas",
      real: "Real gas"
    }
  }
};

const selectorIdioma = document.getElementById("idioma");

function aplicarIdioma(idioma) {
  const t = textos[idioma];
  idiomaActual = idioma;

  document.querySelector("label[for='gas']").textContent = t.sustancia;
  inputGas.placeholder = t.placeholderGas;
  document.querySelector("label[for='temperatura']").textContent = t.temperatura;
  document.getElementById("calcular").textContent = t.calcular;
  document.querySelector("h1").textContent = t.titulo;

  const unidadSelect = document.getElementById("unidad");
  unidadSelect.innerHTML = t.unidades.map(u => `<option value="${u}">${u}</option>`).join("");

  document.getElementById("pestana-ideal").textContent = t.tabs.ideal;
  document.getElementById("pestana-real").textContent = t.tabs.real;

  localStorage.setItem("idioma", idioma);
}

selectorIdioma.addEventListener("change", () => {
  aplicarIdioma(selectorIdioma.value);
});

let datosCoeficientes = [];

fetch("datos_sustancias.json")
  .then(res => res.json())
  .then(data => {
    datosCoeficientes = data;
    console.log("✅ Coeficientes cargados");
  })
  .catch(err => console.error("Error al cargar coeficientes:", err));


// Aplicar idioma y modo oscuro al cargar
window.addEventListener("DOMContentLoaded", () => {
  const idiomaGuardado = localStorage.getItem("idioma") || "es";
  selectorIdioma.value = idiomaGuardado;
  aplicarIdioma(idiomaGuardado);

  const guardado = localStorage.getItem("modoOscuro") === "true";
  aplicarModoOscuro(guardado);
});

const R = 8.314462618;

function convertirCoef(valor) {
  return parseFloat(valor.replace("D", "E").replace(/(?<=\d)-$/, "E-"));
}

function calcularCpCvGamma(simbolo, T, datos) {
  for (const entrada of datos) {
    if (entrada.simbolo === simbolo) {
      const tmin = parseFloat(entrada.t_min);
      const tmax = entrada.t_max === "0000.00" ? Infinity : parseFloat(entrada.t_max);

      if (T >= tmin && T <= tmax) {
        const a1 = convertirCoef(entrada.a1);
        const a2 = convertirCoef(entrada.a2);
        const a3 = convertirCoef(entrada.a3);
        const a4 = convertirCoef(entrada.a4);
        const a5 = convertirCoef(entrada.a5);
        const a6 = convertirCoef(entrada.a6);
        const a7 = convertirCoef(entrada.a7);

        const cp_R = a1*T**-2 + a2*T**-1 + a3 + a4*T + a5*T**2 + a6*T**3 + a7*T**4;
        const cp = cp_R * R;
        const cv = cp - R;
        const gamma = cp / cv;

        return { cp, cv, gamma, tmin, tmax };
      }
    }
  }
  return null;
}

document.getElementById("calcular").addEventListener("click", () => {
  const gas = document.getElementById("gas").value.trim();
  const T = parseFloat(document.getElementById("temperatura").value);

  if (!gas || isNaN(T)) {
    alert("Introduce un gas válido y una temperatura.");
    return;
  }

  const resultado = calcularCpCvGamma(gas, T, datosCoeficientes);

  if (!resultado) {
    document.getElementById("resultado").innerHTML = " No hay datos disponibles para esa temperatura.";
    return;
  }

  const { cp, cv, gamma } = resultado;

  document.getElementById("resultado").innerHTML = `
    Cp = ${cp.toFixed(3)} J/mol·K<br>
    Cv = ${cv.toFixed(3)} J/mol·K<br>
    γ = ${gamma.toFixed(4)}
  `;
});
