const mysql = require('mysql2/promise');

const dbConnection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Sharmi@26m',
  database: 'chatgpt',
});

module.exports = dbConnection;