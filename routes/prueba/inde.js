const express = require('express');
const router  = express.Router();
const session = require('express-session');
const cors = require('cors');
const pool = require('../../keys2');
const fs = require('fs');
const path =require('path');

//SETEAMOS----SOCKET----EN---RUTA-------------------------->
module.exports = (io) =>{
/*(async function wsListar(limite){
     
});
	
(async function listarVideos () {
      
};


(async function wsLlamar(doctor,paciente,lugar){
    const info ={ doctor,paciente,lugar};
    const verificar = await  pool.query('select + from llamadas where paciente = ?  and doctor = ? and lugar = ?',[info]);
	if(verificar === null){
          await pool.query('insert into llamadas (paciente,doctor,lugar,fecha) set ?',[info]);
	  console.log('reg fue adicionado');
	};
});
*/
var compara = Date.now();
//-------funcion---verificar----------tiempo------------->
function salioDelBaneo(fechaActual,min){
 let result= compara - fechaActual
 let resultado = result / (60*1000);
 return resultado > min ; 
};

//--------------------------------------------------------------
router.get('/prueba/pantalla',async(req,res)=>{
    io.on('connetion', async(socket)=>{
	  console.log('conexion');
          socket.on('listarLlamadas',async()=>{
             let listaLlamadas = await pool.query('select * from llamadas ORDER BY codigo_llamada DESC LIMIT 5');
             socket.emit('listaLlamadas',listaLlamadas[0]);
	  });
    }); 
    console.log('prueba pantalla');

    res.render('../views/index.hbs',);
});
router.get('/prueba/registroLlamadaGet',async(req,res)=>{
      const {doc,pac,lug} = req.query;
	let fechaGet = Date.now();
	let resultado = {};
	let fecha = '2024-09-09 11:00';
	const info = { doctor:doc , paciente:pac, lugar:lug};
        let verificar =  await pool.query('select * from llamadas where  doctor = ? and paciente = ? and lugar =?',[doc,pac,lug]);
	       if(session.control & verificar[0].length === 0 ){
                    if( salioDelBaneo(session.control,2)){
		       info.fecha = fecha;
	      	       await pool.query('insert into llamadas set ?',[info]);
		       resultado.mensaje = 'a chamada foi cadastrada com suceso';
	           }else{
	               console.log('el doctor ' + doc + ' o el consultorio ' + lug + ' estan baneados todavia');
		       resultado.mensaje = 'ainda banido pelo tempo ';
		   };
	        }else {
                  session.control = fechaGet;
		  info.fecha = fecha;
	          await pool.query('insert into llamadas set ?',[info]);
	          resultado.mensaje = 'primeira chamada cadastrada com suceso';
        	}
       //const listaLlamadas = await pool.query('select * from llamadas');
       //socket.emit('listaLlamadas', listaLlamadas[0]);

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

/*/fingimos peticion get de gnexus

 router.get('/prueba/wsLlamar', async (req,res) =>{
    console.log(req.query);
    const {op,doc,pac,lug} = req.query;
    
    switch(op){
         case 'llamar' :
            if (op,doc,pac,lug){
              await  wsLlamar(doctor,paciente,lugar);      
            }else{
               console.log('no se recibieron datos validos');
            };
	  break;
    
	    
    res.redirect('back');
 });
 */
return router;
};

