const express = require("express");
const app = express();

app.use(express.json());

let dataStore = {
  P1: 0,
  P2: 0,
  P3: 0
};

app.post("/update", (req, res) => {
  dataStore = req.body;
  res.send("OK");
});

app.get("/", (req, res) => {
  res.send(`
    <h1>⚡ Piezo Energy Dashboard</h1>
    <p>Person 1: ${dataStore.P1}</p>
    <p>Person 2: ${dataStore.P2}</p>
    <p>Person 3: ${dataStore.P3}</p>
  `);
});

app.listen(3000, () => console.log("Server running"));
