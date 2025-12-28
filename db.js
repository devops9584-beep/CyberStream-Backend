const mysql = require('mysql2');
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