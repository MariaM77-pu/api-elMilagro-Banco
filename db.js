const mysql = require('mysql2');

const conexion = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'banco',
    port: 3309 
});

conexion.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:  (banco)', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL (banco)');
});

module.exports = conexion;
