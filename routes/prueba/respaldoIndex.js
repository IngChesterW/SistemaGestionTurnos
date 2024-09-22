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

router.get('/prueba/pantalla',async(req,res)=>{
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
             let listaLlamadas = await pool.query('select * from llamadas ORDER BY codigo_llamada DESC LIMIT 5');
             //emitimos la lista de llamadas que acabamos de guardar en listaLlamadas
	     socket.emit('listaLlamadas',listaLlamadas[0]);
	  });
      });
     //escuchamos por actualizaciones en las llamadas 
     io.on('pruebaConGet', async ()=>{   
       //listamos y emitimos la nueva lista 
       let listaLlamadas = await pool.query('select * from llamadas ORDER BY codigo_llamada DESC LIMIT 5');
       io.emit('listaLlamadas',listaLlamadas[0]);
       console.log('prueba pantalla');
      });
    res.render('../views/index.hbs',);
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
		       adicionarVerificarLlamada(info)
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
       io.emit('listaLlamadas', listaLlamadas[0]);
     
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
	    
      socket.on('wsListarVideos', async ()=>{
           let videos = path.join(__dirname,'../../public/videos');
	   fs.readdir(videos,(err,files)=>{
             if(err){ console.log(err);}else{files.forEach(file=>{console.log(file);});};
	   });
      });

      socket.on('wsConfiguracion', async()=>{
          let configuraciones = await pool.query('select * from configuraciones where habilitada = 1');
	  if  (configuraciones[0].length !=  0) {
              configuraciones[0].forEach(configuracion =>{console.log(configuracion)});
	  }else{ console.log('no hay configuraciones habilitadas')};
      });
	     
     });
      res.render('../views/prueba.hbs'); 
});

return router;
};

