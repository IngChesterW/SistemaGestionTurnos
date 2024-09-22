//-----------------------------------------//
//   Archivo que contiene las funciones:   //
//      -- Conexión al Socket              //
//      -- Recepción de Notificaciónes     //
//      -- Peticiones a la BD              //
//      -- Carga de fecha y hora actual    //
//      -- Carga de videos                 //
//-----------------------------------------//

/////////////////////////////////////////
//   Definicio de Variables Globales   //
/////////////////////////////////////////

var Server;

var ultimoDoctor;
var ultimoPaciente;
var ultimoLugar;
var ultimoId;
let ultimoVideo = 1;

var videos = [];
var meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
var notificacionesPendientes = [];
var cargarPrimerVideo = true;
var mostrarNotificacion = false;

var contenedorVideo;
var contenedorHora;
var contenedorFecha;
var modal;
var tiempoNotificacion = 8000;
var limiteLlamadas = 4;
var sonido;
var estilo_actual;

//////////////////////
//   Hora y Fecha   //
//////////////////////

function fomatearNumero(numero) {
  numero < 10 ? (numero = `0${numero}`) : numero;
  return numero;
}

function cargarFecha() {
  let fechaActual = new Date();
  let anio = fechaActual.getFullYear();
  let mes = fechaActual.getMonth();
  let dia = fomatearNumero(fechaActual.getDate());
  let segundo = fomatearNumero(fechaActual.getSeconds());
  let minuto = fomatearNumero(fechaActual.getMinutes());
  let hora = fomatearNumero(fechaActual.getHours());

  contenedorHora.innerHTML = `${hora}:${minuto}:${segundo}`;
  contenedorFecha.innerHTML = `${dia} de ${meses[mes]} del ${anio}`;

  setTimeout(function () {
    cargarFecha();
  }, 500);
}

////////////////
//   Videos   //
////////////////

function obtenerVideosWS() {
  var url = "http://127.0.0.1/ws/ws.php?opcion=listar_videos";
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", url, true);
  xhttp.setRequestHeader("Access-Control-Allow-Headers", "*");
  xhttp.setRequestHeader("Content-type", "application/ecmascript");
  xhttp.setRequestHeader("Access-Control-Allow-Origin", "*");
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      videos = [];
      for (let i in data) {
        videos.push(`./recursos/videos/${data[i]}`);
      }
      if (cargarPrimerVideo) {
        contenedorVideo.setAttribute("src", videos[0]);
        cargarPrimerVideo = false;
        establecerEventoVideo();
      }
    }
  };
  xhttp.send();
}

function establecerEventoVideo() {
  let timer; // Variable para el temporizador

  contenedorVideo.addEventListener('loadedmetadata', function() {
    // Cancelar cualquier temporizador previo
    clearTimeout(timer);

    // Establecer nuevo temporizador que avanza al siguiente video si este no ha terminado cuando debería
    timer = setTimeout(reproducirSiguienteVideo, this.duration * 1000 + 2000); // Añadir un pequeño buffer para asegurar

    actualizarCuentaAtras(this.duration);
  });

  contenedorVideo.addEventListener('timeupdate', function() {
    // Actualizar el contador cada vez que el tiempo de reproducción cambia
    actualizarCuentaAtras(this.duration - this.currentTime);
  });

  contenedorVideo.addEventListener("ended", function () {
    clearTimeout(timer); // Cancelar el temporizador cuando el video termina normalmente
    reproducirSiguienteVideo();
  });

  contenedorVideo.addEventListener("error", function (e) {
    console.error("Error al cargar el video: ", contenedorVideo.src);
    clearTimeout(timer); // Cancelar el temporizador en caso de error
    reproducirSiguienteVideo();
  });
}

function actualizarCuentaAtras(tiempoRestante) {
  var minutos = Math.floor(tiempoRestante / 60);
  var segundos = Math.floor(tiempoRestante % 60);
  console.log(`${minutos}:${segundos < 10 ? '0' : ''}${segundos}`);
}

function reproducirSiguienteVideo() {
  ultimoVideo++;
  contenedorVideo.setAttribute("src", videos[ultimoVideo % videos.length]);
  console.log("Reproduciendo siguiente video: ", videos[ultimoVideo % videos.length]);
}

////////////////////////
//   Notificaciones   //
////////////////////////

function cargarNotificacion() {
  notificacionesPendientes.push([ultimoPaciente, ultimoLugar, ultimoDoctor]);
  if (notificacionesPendientes.length == 1) {
    mostrarModal();
  }
  mostrarNotificacion = false;
}

function mostrarModal() {
  cargarModal(notificacionesPendientes[0]);
  sonido.play();
  modal.className = "show";
  setTimeout(function () {
    notificacionesPendientes.shift();
    modal.className = modal.className.replace("show", "");
    //Si hay mas de una notificacion, vuelve a mostrar los nuevos datos
    if (notificacionesPendientes.length > 0) {
      mostrarModal();
    }
  }, tiempoNotificacion);
}

function cargarModal(data = []) {
  $("#modal").empty();
  $("#modal").append(`
    <img class="logo" id="logo" src="./recursos/imagenes/logo_caf_itaes.png" />
    <div class="paciente">
      Paciente: <br />
      <span>${data[0]}</span>
    </div>
    <div class="lugar">Pase a: <span>${data[1]}</span><br /></div>
    <div class="doctor">${data[2]}</div>
  `);
}

////////////////////////////
//   Pacientes Llamados   //
////////////////////////////

function cargarLlamados() {
  var url = `http://127.0.0.1/ws/ws.php?opcion=listar&limite=${limiteLlamadas}`;
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", url, true);
  xhttp.setRequestHeader("Access-Control-Allow-Headers", "*");
  xhttp.setRequestHeader("Content-type", "application/ecmascript");
  xhttp.setRequestHeader("Access-Control-Allow-Origin", "*");
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      $("#listado").empty();
      var data = JSON.parse(this.responseText);
      if (data.length > 0) {
        ultimoPaciente = "";
        ultimoLugar = "";
        ultimoDoctor = "";
        ultimoId = "";
        for (let i in data) {
          $("#listado").append(`
            <div class="caja" id="caja${i}">
              <div class="etiqueta_paciente">${data[i]["paciente"]}</div>
              <div class="etiqueta_flecha">></div>
              <div class="etiqueta_lugar">
                <div class="pase">Por favor pase a:</div>
                <div class="lugar">${data[i]["lugar"]}</div>
                <div class="doctor">${data[i]["doctor"]}</div>
              </div>
            </div>`);
          if (
            ultimoPaciente == "" &&
            ultimoLugar == "" &&
            ultimoDoctor == "" &&
            ultimoId == ""
          ) {
            ultimoPaciente = data[i]["paciente"];
            ultimoLugar = data[i]["lugar"];
            ultimoDoctor = data[i]["doctor"];
            ultimoId = `caja${i}`;
          }
        }
      } else {
        $("#listado").append(`
            <div class="caja_grande">
	      Est&eacute atento, <br> su NOMBRE aparecer&aacute en pantalla cuando sea su turno.
            </div>`);
      }
      $(`#${ultimoId}`).addClass("ultima_caja");
      if (mostrarNotificacion) {
        cargarNotificacion();
      }
    }
  };
  xhttp.send();
}

////////////////////////////////////////////
//   Socket de comunicacion de enventos   //
////////////////////////////////////////////

function socketConexion() {
  Server = new FancyWebSocket("ws://127.0.0.1:9300");
  //Let the user know we're connected
  Server.bind("open", function () {
    // console.log("Connected.");
  });
  //OH NOES! Disconnection occurred.
  Server.bind("close", function (data) {
    // console.log("Disconnected.");
  });
  //Log any messages sent from server
  Server.bind("message", function (payload) {
    mostrarNotificacion = true;
    cargarLlamados();
  });

  Server.connect();
}

/////////////////////////
//   Cambiar Estilos   //
/////////////////////////

function actualizarConfiguracion() {
  var url =
    "http://127.0.0.1/ws/ws.php?opcion=configuracion_actual";
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", url, true);
  xhttp.setRequestHeader("Access-Control-Allow-Headers", "*");
  xhttp.setRequestHeader("Content-type", "application/ecmascript");
  xhttp.setRequestHeader("Access-Control-Allow-Origin", "*");
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      if (data.length > 0) {
        if(data[0]["estilo"] != estilo_actual){
          document.getElementById("estilo_actual").remove();
          var head = document.getElementsByTagName("head")[0];
          var link = document.createElement("link");
          link.id = "estilo_actual";
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = data[0]["estilo"];
          link.media = "all";
          head.appendChild(link);
          estilo_actual = data[0]["estilo"];
        }
        
        contenedorVideo.volume = data[0]["volumen_video"];
        limiteLlamadas = data[0]["limite_consulta"];
        sonido = new Audio(data[0]["sonido_alerta"]);
        sonido.volume = data[0]["volumen_sonido_alerta"];
        tiempoNotificacion = data[0]["tiempo_notificacion"];
      }

      obtenerVideosWS();
      cargarLlamados();
    }
  };
  xhttp.send();
}

////////////////////////////////////////
//   Disparo de Funciones y Eventos   //
////////////////////////////////////////

(function () {
  contenedorHora = document.getElementById("hora");
  contenedorFecha = document.getElementById("fecha");
  contenedorVideo = document.getElementById("video");
  modal = document.getElementById("modal");
  cargarFecha();
  socketConexion();
  actualizarConfiguracion();
  function actualizar() {
    setTimeout(function () {
      console.log("update Data");
      actualizarConfiguracion();
      actualizar();
    }, 60000);
  }
  actualizar();
})();
