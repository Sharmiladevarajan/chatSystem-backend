const express=require('express')
const app = express();  
const cors = require('cors');
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
const queryFile=require("./apis/operations")
app.use(cors()); 
app.use(express.json())
let port = 8080;
app.listen(port);
console.log(port);


app.post("/createOrUpdate", async (req, res) => {
    
    let result = await queryFile.createOrUpdate(req, res);
return result})
app.post("/openAI", async (req, res) => {
    
  let result = await queryFile.openAI(req, res);
return result})


    


// const express = require('express');
// const mysql = require('mysql2/promise');
// const app = express();
// const PORT = 8080;

// app.use(express.json());

// // MySQL Connection Pool
// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: 'Sharmi@26m',
//   database: 'chatgpt',
  
// });

// // API to Get Data from Multiple Tables
// app.get('/data', async (req, res) => {
//   try {
//     const connection = await pool.getConnection();
//     const [rows] = await connection.query(`SELECT BIN_TO_UUID(userId) AS userId, userName, userEmail FROM users`);
//     console.log(rows);
    
  
//     connection.release();

//     res.status(200).send({
//       data: rows,
//       statusMessage: "success"
//     });
//   } catch (err) {
//     console.error('Database Error:', err);
//     res.status(500).send({
//       message: 'Database Error',
//       error: err
//     });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });
