module.exports = {
 formatearFechaHora(date,opcion) {
    const año = date.getFullYear();
    var  mes = String(date.getMonth() + 1).padStart(2, '0'); // Meses empiezan desde 0
    const día = String(date.getDate()).padStart(2, '0');
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    const segundos = String(date.getSeconds()).padStart(2, '0');
    if(opcion === 'normal'){
	    switch (mes) {
               case  '01': mes = 'enero'; break;
	       case  '02': mes = 'febrero'; break;
	       case  '03': mes = 'marzo'; break;
               case  '04': mes = 'abril'; break;
	       case  '05': mes = 'mayo' ;break;
	       case  '06': mes = 'junio'; break;
	       case  '07': mes = 'julio'; break;
	       case  '08': mes = 'agosto'; break;
	       case  '09': mes = 'septiembre'; break;
	       case  '10': mes = 'octubre'; break;
	       case  '11': mes = 'noviembre'; break;
	       case  '12': mes = 'diciembre'; break;
	    }
    const formatoFront = {
	    ano :  `${día} de  ${mes} del ${año} `,
	    hora : `${horas}:${minutos}:${segundos}`
           } 
    return (formatoFront);
    }else{
    return `${año}-${mes}-${día} ${horas}:${minutos}:${segundos}`;
    }
}
};
