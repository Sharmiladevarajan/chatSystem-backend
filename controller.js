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
    try {
      let result = await queryFile.createOrUpdateChat(req, res);
      return result
    } catch (error) {
      console.log(error);
      
    }
    })

app.get("/fetchAllchats", async (req, res) => {
  try {
    console.log("API Called: /fetchAllchats"); 
    await queryFile.fetchAllChats(req, res);
  } catch (error) {
    console.error("Error in /fetchAllchats:", error);
    res.status(500).send({ message: "Server error" });
  }
  
});
app.get("/fetchChat", async (req, res) => {
  try {
    console.log("API Called: /fetchChat"); 
    await queryFile.fetchChat(req, res);
  } catch (error) {
    console.error("Error in /fetchAllChats:", error);
    res.status(500).send({ message: "Server error" });
  }
  
});

app.post("/deleteChat", async (req, res) => {
  try {
    console.log("API Called: /deleteChat"); 
    await queryFile.deleteChat(req, res);
  } catch (error) {
    console.error("Error in /deleteChats:", error);
    res.status(500).send({ message: "Server error" });
  }
  
});


    
