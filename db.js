/* const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: '', 
  database: 'cyber-stream_db_cs_main'
});

connection.connect(err => {
  if (err) throw err;
  console.log("Conectado a MySQL exitosamente");
});

module.exports = connection;

*/

const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  // Si existe DB_HOST en el sistema (GitHub), lo usa. Si no, usa 'localhost' (Tu PC).
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  // Si existe DB_PASSWORD (GitHub), lo usa. Si no, usa '' (Tu PC).
  password: process.env.DB_PASSWORD || '', 
  database: process.env.DB_NAME || 'cyber-stream_db_cs_main'
});

connection.connect(err => {
  if (err) {
    console.error("Error de conexión:", err.message);
    return;
  }
  console.log("Conectado a MySQL exitosamente");
});

module.exports = connection;