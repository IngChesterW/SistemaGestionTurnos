module.exports = {
 formatearFechaHora(date,opcion) {
    const año = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0'); // Meses empiezan desde 0
    const día = String(date.getDate()).padStart(2, '0');
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    const segundos = String(date.getSeconds()).padStart(2, '0');
    if(opcion === 'normal'){
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
