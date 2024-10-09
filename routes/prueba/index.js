const express = require('express');
const router  = express.Router();
const session = require('express-session');
const cors = require('cors');
const pool = require('../../keys2');
const fs = require('fs');
const path =require('path');
const {formatearFechaHora} = require('../../funcAux/funcionesAuxiliares');


//SETEAMOS----SOCKET----EN---RUTA-------------------------->

module.exports = (io) =>{


//-------funcion---verificar----------tiempo------------->

function salioDelBaneo(fechaControl,fechaGet,min){
   let result= fechaGet - fechaControl ;
   console.log(fechaControl + '--------' + fechaGet);
   let resultado = result / (60*1000);
   console.log(resultado);
   return resultado > min ; 
};



//-------funcion-----adicionar-------llamadas-----con---verificacion------------->
 
async function adicionarVerificarLlamada(info){
    const {doctor,paciente,lugar} = info;
    const fecha = new Date();
    info.fecha = formatearFechaHora(fecha);
   //verificamos que no este duplicado 
   let verificar = await pool.query('select * from llamadas where doctor = ?  and paciente = ?  and lugar = ?',[doctor,paciente,lugar]);
   if (verificar[0].length === 0){
      await pool.query('insert into llamadas set ?',[info]);
      console.log('funciona verifica e inserta funcion');
   }else{
      console.log('funciona verifica y no inserta funcion');
   };
};


//------PANTALLA DE MUESTRA DE TURNOS----------------------------------------

router.get('/prueba/pantalla/:servicio',async(req,res)=>{
    const {servicio} = req.params;
    console.log(servicio);
	let pedo={doctor:'doc',paciente:'paciente',lugar:'lugar'};
    
    //escuchamos la conexion desde el front
     io.on('connection', async(socket)=>{
	   console.log('conetou');
	  socket.on('preguntarHoraFecha',()=>{
	    let fechaHoraFront = new Date();
	    let opcion = 'normal';
            fechaHoraF = formatearFechaHora(fechaHoraFront,opcion); 
            socket.emit('horaFechaFront',fechaHoraF);
	  });
	  //escuchamos cuando el front pregunta por la lista de llamadas
          socket.on('listarLlamadas',async()=>{
	     console.log('trae');
             const  listaLlamadas = await pool.query('select * from llamadas ORDER BY codigo_llamada DESC LIMIT 5');
             //emitimos la lista de llamadas que acabamos de guardar en listaLlamadas
	     let  maxCodigoLlamada = Math.max(...listaLlamadas[0].map(item => item.codigo_llamada));
	        const ultimaCaja =  listaLlamadas[0].map((item) =>{
	      if(item.codigo_llamada === maxCodigoLlamada){
		     item.clase='ultima_caja';
		    
	      }else{
		     item.clase='caja';
		    
	      }
	    return item;
	  });
	     socket.emit('listaLlamadas',ultimaCaja);
	  });
//configuraciones------------------- de---------------------  video
      let listaVideos ={};
      let a = 0;
      let videos = path.join(__dirname,'../../public/videos/');
      fs.readdir(videos,(err,files)=>{
	 let i = 0;
	 files.forEach(file =>{
         i= i+1;
	 a = a +1;
         listaVideos[i] = file;
	 });
	 });
      socket.on('video',(idVid)=>{
         if(idVid === '0'){
            let  nuevoVid = {idVideo : 1 , src: listaVideos[1]};
            io.emit('nuevoVideo',nuevoVid);
	 }else{
            let aux = Number(idVid);
	    if(aux < a){
	      aux = aux + 1;
	      nuevoVid = { idVideo : aux, src: listaVideos[aux]};
	      socket.emit('nuevoVideo',nuevoVid);
             }else{
	        nuevoVid = {idVideo:1, src: listaVideos[1]};
	       socket.emit('nuevoVideo',nuevoVid);
             };
	 };
      });
      
      
//listar------------mensajes-------------front-------------------------------->
 socket.on('listarMensajes',async ()=>{
 let mensajes = await pool.query('select * from mensajes');
     mensajes = mensajes[0];
 var listaMensajes = ' ';
 var indice = 0;
 var  espacios = ' '.repeat(7);
 var  prueba = espacios.repeat(10);
       mensajes.forEach(mensaje =>{
        listaMensajes = (listaMensajes + espacios  + [mensajes[0].mensaje]);
	indice = indice + 1;
       });
 socket.emit('listaMensajes',listaMensajes); 
 });
     });

//render de views segun que servicio sea
 if(servicio){
   console.log('entra if');
   switch(servicio){
	   case  'consultorio' :
	     console.log('entra cons'); 
	     let  consultorio = 1;
             res.render('../views/index.hbs',{consultorio});
           break;
	   case  'imagenologia' :
	     console.log('entra imagenologia');
	     let  imagenologia = 1;
	     res.render('../views/index.hbs',{imagenologia});
           break;
	   case 'laboratorio' :
             let laboratorio = 1;
	     res.render('../views/index.hbs',{laboratorio});
	     break;
           case 'emergencia' :
             let emergencia = 1;
	     res.render('../views/index.hbs',{emergencia});
	     break;
   };
  }else{
	res.send('no se recibio el tipo de servicio');
  };
});


//registro---de----llamadas------------------------------>
router.get('/prueba/registroLlamadaGet',async(req,res)=>{
      const {doc,pac,lug} = req.query;
	//fecha en que se realiza el get (actual)
	let fechaGet = Date.now();
	//seteamos la fecha del get en sesion para comparar
	session.fechaGet= fechaGet;
	console.log(session.fechaGet + '--------' + session.fechaControl);
	let resultado = {};
	let fecha = new Date();
	    fecha = formatearFechaHora(fecha);
	let  info = {doctor:doc,paciente:pac,lugar:lug};
        //preguntamos si ya se configuró una fecha de control (primer registro del doctor)
	      if(session.fechaControl){
                  //preguntamos si desde la fecha de control han pasado 2 minutos desde la fechaGet (primer registro)
	          if( salioDelBaneo(session.fechaControl,session.fechaGet,1)){         
		       session.fechaControl = session.fechaGet;
		       adicionarVerificarLlamada(info);
		       req.flash('message',info);
		       resultado.mensaje = 'a primeira chamada foi cadastrada com suceso';
	           }else{
		      //todavia baneado por tiempo 
	               console.log('el doctor ' + doc + ' o el consultorio ' + lug + ' estan baneados todavia');
		       resultado.mensaje = 'ainda banido pelo tempo ';
		   };
	        }else {
		  //primer get, entonces registramos la fecha y hacemos la insercion
                  session.fechaControl = session.fechaGet;
		  info.fecha = fecha;
	          await pool.query('insert into llamadas set ?',[info]);
	          resultado.mensaje = ' chamada de cotrole cadastrada com suceso';
        	}
	//emitimos el evento para  mostrar lista llamadas  en pantalla en tiempo real
       const listaLlamadas = await pool.query('select * from llamadas order by codigo_llamada desc limit  5');
       
       io.emit('nuevaLlamada');
       //resultado para testing de rest
	res.send(resultado);
});

//--------------------------------------------------------------




// Configuración de Socket.IO
router.get('/prueba',async(req,res)=>{
     const {doc,pac,lug}=req.query;
     console.log(req.query);
        
	const info = {doctor:doc,paciente:pac,lugar:lug}; 
	const verificar = await pool.query('select * from llamadas where paciente = ? and doctor = ? and lugar =?',[info]);
        if (verificar[0].length === 0){
         try{
           await pool.query('insert into llamadas set ?',[info]);
	   console.log('cadastrou');
         }catch(e){
           console.log('pqp : ' + e);
	 };
	}else{
	   console.log('nao recebe dados');
        };
     io.on('connection', (socket) => { 
      
      /*socket.on('configurar',(configurar) => {
         console.log(configurar);
	 if (configurar === 5){
            res.render('../views/prueba.hbs');
	 }else{
          res.send('aja finalmente');, asyn
	 };
       }); 
       */
       socket.on('wsLlamar', async  () => {
          /*console.log(info);
          const informacion = {
		  doctor: info.doctor,
		  paciente: info.paciente,
		  lugar: info.lugar
	  };
	  const verificar = await pool.query('select * from llamadas where paciente = ? and doctor = ? and lugar = ?',[informacion]);
	   if  (verificar[0].length  === 0) {
             await pool.query('insert into llamadas  set ?',[informacion]);
	     console.log('llamada registrada');
	   }else{
             console.log('no se recibieron parametros correctos');
	   };*/
	   const llamadas = await pool.query('select * from llamadas');
	   socket.emit('listaLlamadas',llamadas);
       });

      socket.on('listar',async (limite) =>{
           await pool.query("delete from llamadas where UNIX_TIMESTAMP(fecha)<(UNIX_TIMESTAMP()-1800)");
	   const listado = await pool.query('select *  from llamadas order by codigo_llamada desc limit ?',[limite]);
	   console.log(listado);
      });
	    
      //socket.on('wsListarVideos', async ()=>{
	    var listaVid = [];
           let videos = path.join(__dirname,'../../public/videos');
	   fs.readdir(videos,(err,files)=>{
             if(err){ console.log(err);}else{files.forEach(file=>{listaVid.videos= file;});};
	   });
     // });

      socket.on('wsConfiguracion', async()=>{
          let configuraciones = await pool.query('select * from configuraciones where habilitada = 1');
	  if  (configuraciones[0].length !=  0) {
              configuraciones[0].forEach(configuracion =>{console.log(configuracion)});
	  }else{ console.log('no hay configuraciones habilitadas')};
      });
	     
     });
     // res.render('../views/prueba.hbs');
     res.send(listaVid);
});
return router;
};

