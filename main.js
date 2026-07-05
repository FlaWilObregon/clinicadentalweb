// Constantes del DOM
const form = document.getElementById("formCita");
const lista = document.getElementById("lista");
const btnSubmit = form.querySelector('button[type="submit"]');

// Elementos de Filtros
const searchBar = document.getElementById("searchBar");
const filterServicio = document.getElementById("filterServicio");

// Estado de la aplicación
let editando = false;
let idEditando = null;

// Inicialización de la App
document.addEventListener("DOMContentLoaded", () => {
  configurarCampos();
  mostrarCitas();
});

// Configurar límites y validaciones en caliente
function configurarCampos() {
  // 1. Fecha mínima (Hoy)
  const inputFecha = document.getElementById("fecha");
  const hoy = new Date().toISOString().split("T")[0];
  inputFecha.min = hoy;

  // 2. Forzar que el DNI solo acepte números en tiempo de escritura
  const inputDni = document.getElementById("dni");
  inputDni.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
  });
}

// Auxiliar: Formatear nombres de forma elegante (Capitalize)
function capitalizarTexto(texto) {
  return texto
    .toLowerCase()
    .trim()
    .split(" ")
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(" ");
}

// Obtener y guardar en LocalStorage
function obtenerCitas() {
  return JSON.parse(localStorage.getItem("citas")) || [];
}

function guardarCitas(citas) {
  localStorage.setItem("citas", JSON.stringify(citas));
}

// CREATE / UPDATE
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const dniValue = document.getElementById("dni").value.trim();
  const horaValue = document.getElementById("hora").value;

  // Validaciones de negocio Pro
  if (dniValue.length !== 8) {
    showToast("El DNI debe tener exactamente 8 dígitos ⚠️", "error");
    return;
  }

  if (horaValue < "08:00" || horaValue > "18:00") {
    showToast("Horario fuera de atención (8:00 AM - 6:00 PM) ⚠️", "error");
    return;
  }

  let citas = obtenerCitas();

  const datos = {
    id: editando ? idEditando : Date.now(),
    nombre: capitalizarTexto(document.getElementById("nombre").value),
    dni: dniValue,
    fecha: document.getElementById("fecha").value,
    hora: horaValue,
    servicio: document.getElementById("servicio").value
  };

  if (editando) {
    citas = citas.map(cita => cita.id === idEditando ? datos : cita);
    showToast("Cita actualizada ✔", "success");
    cancelarEdicion();
  } else {
    citas.push(datos);
    showToast("Cita creada ✔", "success");
  }

  guardarCitas(citas);
  form.reset();
  mostrarCitas();
});

// READ (Renderizado dinámico con filtros aplicados)
function mostrarCitas() {
  const citas = obtenerCitas();
  lista.innerHTML = "";

  const busqueda = searchBar.value.toLowerCase().trim();
  const servicioSeleccionado = filterServicio.value;

  // Aplicar filtros en tiempo real
  const citasFiltradas = citas.filter(cita => {
    const coincideBusqueda = cita.nombre.toLowerCase().includes(busqueda) || cita.dni.includes(busqueda);
    const coincideServicio = servicioSeleccionado === "" || cita.servicio === servicioSeleccionado;
    return coincideBusqueda && coincideServicio;
  });

  if (citasFiltradas.length === 0) {
    lista.innerHTML = `<p class="no-citas">No se encontraron citas que coincidan.</p>`;
    return;
  }

  const fragmento = document.createDocumentFragment();

  citasFiltradas.forEach(cita => {
    const card = document.createElement("div");
    card.className = "cita-card";
    card.dataset.id = cita.id;

    card.innerHTML = `
      <p><strong>Nombre:</strong> ${escapeHTML(cita.nombre)}</p>
      <p><strong>DNI:</strong> ${escapeHTML(cita.dni)}</p>
      <p><strong>Fecha:</strong> ${cita.fecha}</p>
      <p><strong>Hora:</strong> ${cita.hora}</p>
      <p><strong>Servicio:</strong> ${cita.servicio}</p>
      <div class="acciones">
        <button class="btn-edit">Editar</button>
        <button class="btn-delete">Eliminar</button>
      </div>
    `;
    fragmento.appendChild(card);
  });

  lista.appendChild(fragmento);
}

// ESCUCHADORES DE EVENTOS PARA FILTROS
searchBar.addEventListener("input", mostrarCitas);
filterServicio.addEventListener("change", mostrarCitas);

// DELEGACIÓN DE EVENTOS (Para botones de acción)
lista.addEventListener("click", (e) => {
  const card = e.target.closest(".cita-card");
  if (!card) return;
  
  const id = Number(card.dataset.id);

  if (e.target.classList.contains("btn-edit")) {
    prepararEdicion(id);
  } else if (e.target.classList.contains("btn-delete")) {
    eliminarCita(id);
  }
});

// PREPARAR EDICIÓN
function prepararEdicion(id) {
  const citas = obtenerCitas();
  const cita = citas.find(c => c.id === id);
  if (!cita) return;

  document.getElementById("nombre").value = cita.nombre;
  document.getElementById("dni").value = cita.dni;
  document.getElementById("fecha").value = cita.fecha;
  document.getElementById("hora").value = cita.hora;
  document.getElementById("servicio").value = cita.servicio;

  editando = true;
  idEditando = id;
  
  btnSubmit.textContent = "Guardar Cambios 💾";
  btnSubmit.classList.add("btn-update");

  if (!document.getElementById("btnCancelar")) {
    const btnCancelar = document.createElement("button");
    btnCancelar.type = "button";
    btnCancelar.id = "btnCancelar";
    btnCancelar.textContent = "Cancelar Edición";
    btnCancelar.className = "btn-cancel";
    btnCancelar.onclick = cancelarEdicion;
    form.appendChild(btnCancelar);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube suavemente para editar
}

function cancelarEdicion() {
  editando = false;
  idEditando = null;
  form.reset();
  btnSubmit.textContent = "Reservar Cita";
  btnSubmit.classList.remove("btn-update");
  
  const btnCancelar = document.getElementById("btnCancelar");
  if (btnCancelar) btnCancelar.remove();
}

// DELETE
function eliminarCita(id) {
  if (!confirm("¿Estás seguro de eliminar esta reserva?")) return;

  let citas = obtenerCitas();
  citas = citas.filter(cita => cita.id !== id);

  guardarCitas(citas);
  mostrarCitas();
  
  if (editando && idEditando === id) cancelarEdicion();

  showToast("Cita eliminada ❌", "error");
}

// TOAST
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.className = "toast"; 
  toast.classList.add(type, "show");
  toast.textContent = message;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// SEGURIDAD ANTI-XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}