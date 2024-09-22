//IMPORTAMOS LOS MODULOS NECESARIOS
const si = require('systeminformation');
const promClient = require('prom-client');
const os = require('os');
const fs = require('fs');
const logTxt = './log.txt';
const express = require('express');
const session = require('express-session');
const https = require('https');
const pool = require('./keys');
const socketIo = require('socket.io');
const cors = require('cors');
const exphbs = require('express-handlebars');
const http = require('http');
const path = require('path');
const flash = require('connect-flash');
//CONFIGURACION DE PROMETHEUS
const register = new promClient.Registry();

//uso de cpu (no hay XD)
const usoDeCpuNode = new promClient.Gauge ({
	name:'node_cpu_usage',
	help:'current cpu usage percentage',
	registers:[register],
});

//uso de memoria 
const usoDeMemoriaNode = new promClient.Gauge({
      name:'node_memory_usage_bytes',
      help:'Current memory usage bytes',
      registers:[register],
});

//uso de almacenamiento usado 
const usoDeAlmacenamiento = new promClient.Gauge({
      name:'node_disk_used_bytes',
      help:'Current storage usage bytes',
      labelNames:['filesystem'],
      registers:[register],
});

//almacenamiento total disponible
const almacenamientoTotal = new promClient.Gauge({
     name:'node_disk_total_bytes',
     help:'Total disk available',
     labelNames:['filesystem'],
     registers:[register],
});


//funcion actualizar metricas
async function actualizarMetricas(){
	try{
	    const discos = await si.fsSize();
	     discos.forEach(disk => {
		 almacenamientoTotal.set({filesystem: disk.fs}, disk.size);
		 usoDeAlmacenamiento.set({filesystem: disk.fs}, disk.used);
	     });
           const cpuData = await si.currentLoad();
	   const memData = await si.mem();	   
	   usoDeCpuNode.set(cpuData.currentLoad);
	   usoDeMemoriaNode.set(memData.active);
	}catch(error){
          console.log('error -- ' + error );
	};
};
setInterval(actualizarMetricas,1000);


//VARIABLE CON FECHA ACTUAL Y FUNCION PARA DARLE FORMATO 

function formatearFechaHora(date) {
    const año = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0'); // Meses empiezan desde 0
    const día = String(date.getDate()).padStart(2, '0');
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    const segundos = String(date.getSeconds()).padStart(2, '0');

    return `${año}-${mes}-${día} ${horas}:${minutos}:${segundos}`;
};


//REGISTRO DEL LOG  

const regLog =  async (info,update) => { 
  const actualizarDb = {
    EquiposClinicaFechaActualizaci : update.fecha,
    EquiposClinicaEstado : update.conexion,
  }
  fs.appendFile( logTxt, info, async (err) =>{
     if (err){
       return(err);
     }else{
       try{
          await pool.query('update equiposCli set  ?  where equiposClinicaMacaddress = ?',[actualizarDb,update.mac]);
          console.log('actualizo');
        }catch{
          console.log('noActualizo');
       }
      }
   });
};

//LEVANTANDO VSERVER

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

//SETEANDO CORS ALLOW ORIGIN

app.use(cors({
   origin: '*',
}));

app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs.engine({
	layout: 'main',
	layoutsDir: path.join(app.get('views'), 'layouts'),
	partialsDir: path.join(app.get('views'), 'partials'),
	helpers: require('./helpers'),
	extname:'.hbs',

}));
app.get('/metrics', async (req,res)=>{
 const metrics = await register.metrics();
 res.setHeader('Content-Type', register.contentType);
 res.end(metrics);
});

//configuracion de sessions
app.use(session({
	secret: 'cualquierCosa',
	resave: false,
	saveUninitialized: true,
}));

app.use(flash());
app.use((req,res,next)=>{
  app.locals.message = req.flash('message'),
  next();
});

app.use(require("./routes/prueba")(io));
app.use(express.static(path.join(__dirname, './public')));
app.set('view engine','.hbs');


//INFO VSERVER

 server.listen(app.get('port'),()=>{
   console.log('vservidor en puerto : ', app.get('port'));
   actualizarMetricas();
});
//app.use(require('./routes'));
app.use(require("./routes/prueba"));
//DETECCION DE IP - MACADDRES - HOSTNAME  RB
const ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function async (ifname) {
   //variable guarda la informacion de las interfaces
    var aux = (ifaces[ifname]);
   //iteramos sobre las interfaces buscando la que tiene conexion y sea ipv4
    aux.forEach( function async (minhaIp){
    if (minhaIp.internal === false &&  minhaIp.family === 'IPv4' ) {
	//guardamos la informacion ip y mac del rapsberry en una local sesion
         session.macAddress = minhaIp.mac;
	 session.hostName = os.hostname();
	 session.ip = minhaIp.address;
         session.rev = 0;
	 session.conexion = 0;
	 console.log('IP : ' + session.ip + '  Mac : ' + session.macAddress);
         return;
   }
  });
});

//REGISTRANDO INFO EN SESSION DE FORMA GLOBAL
const infoEnSession = ('HOST : ' +  session.hostName + ' //  IP : ' + session.ip + ' //  MAC : ' + session.macAddress  );

//REGISTRO DE LA IP Y MAC EN DB
(async  function ingresar(){
    const equiposClinicaDescripcion = session.hostName;
    const equiposClinicaMacAddress = session.macAddress;
    const equiposClinicaIp = session.ip;
    const equiposClinicaEstado = 'conectado';
    const equiposClinicaFecha  = new Date();
    const novo = {equiposClinicaMacAddress, equiposClinicaIp, equiposClinicaDescripcion, equiposClinicaEstado};
    // variable trae la informacion de esa mac en la tabla
    const verificar = await pool.query('select equiposClinicaMacAddress from equiposCli where equiposClinicaMacaddress = ?',[equiposClinicaMacAddress]);
	//verificamos si la mac ya tiene registro )
	  if (verificar[0].length === 0 ){
	    await  pool.query('insert into equiposCli set  ?',[novo]);      
	    console.log('fue agregado' + novo);
         //si ya tiene  modificamos  ip        
	  }else{
            console.log('verifica');
            await pool.query('update equiposCli set equiposClinicaIp = ?  where equiposClinicaMacaddress = ?',[equiposClinicaIp,equiposClinicaMacAddress]);   
          }
  return;
 })();


//COMPROBAR SI LA RB  TIENE CONEXION A INTERNET
const url = 'https://www.google.com/'; 
( async function comprobarConexion(){
//seteamos intervalo de tiempo para la funcion que hace ping a la url
   setInterval( async ()=>{
      https.get(url, async (res)=>{
       if (res.statusCode >= 200 && res.statusCode < 300){
        if( session.conexion === 0 ){
	    try{
	      let fechaActual = new Date(); 
	      let fechaActualFormato = formatearFechaHora(fechaActual);
              session.conexion = 1;
              session.rev = 0;
	      const update = { conexion:'conectado', mac: session.macAddress, fecha:fechaActualFormato };
              const conectadoLog =( infoEnSession + ' // FECHA-REV : ' + fechaActualFormato + `\n` );
              regLog(conectadoLog,update);
            }catch(e){
                console.log(' tiene conexion pero : ' + e );	  
            };
         }
	 }}).on('error', (e) => {
          if(session.rev === 0){
          session.conexion = 0;
          let fechaActual = new Date();
          let fechaActualFormato = formatearFechaHora(fechaActual);
          const update = { conexion:'desconectado',  mac: session.macAddress, fecha:fechaActualFormato };
          const desconectadoLog = ( infoEnSession + ' // FECHA-CAIDA : ' + fechaActualFormato + `\n`);
          session.rev = 1;
          regLog(desconectadoLog,update).then(result => {
            console.log('sin internet  - actualizo datos correctamente en el log.txt');
        }).catch(error => {
            console.error('Error en ctualizar datos del log.txt:', error);
        });
        };
       });
  },1200);
  return;
})();


