const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Data storage
let dataStore = {
  P1: 0,
  P2: 0,
  P3: 0
};

// Receive data from your laptop
app.post("/update", (req, res) => {
  dataStore = req.body;
  res.send("OK");
});

// Send data to frontend
app.get("/data", (req, res) => {
  res.json(dataStore);
});

// 🔥 DASHBOARD UI
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Energy Dashboard</title>

    <style>
      body {
        font-family: Arial;
        background: linear-gradient(135deg, #4f46e5, #9333ea);
        color: white;
        text-align: center;
        margin: 0;
        padding: 0;
      }

      h1 {
        margin-top: 20px;
      }

      .status {
        margin: 10px;
        font-size: 20px;
        font-weight: bold;
      }

      .container {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 40px;
        flex-wrap: wrap;
      }

      .card {
        background: white;
        color: black;
        padding: 25px;
        border-radius: 15px;
        width: 220px;
        box-shadow: 0px 5px 15px rgba(0,0,0,0.3);
      }

      .title {
        font-size: 18px;
        margin-bottom: 10px;
      }

      .value {
        font-size: 28px;
        font-weight: bold;
      }

      .total {
        margin-top: 30px;
        font-size: 24px;
        font-weight: bold;
      }
    </style>
  </head>

  <body>

    <h1>⚡ Energy Harvesting System</h1>
    <div id="status" class="status">Status: Waiting</div>

    <div class="container">

      <div class="card">
        <div class="title">Person 1</div>
        <div id="p1" class="value">0</div>
      </div>

      <div class="card">
        <div class="title">Person 2</div>
        <div id="p2" class="value">0</div>
      </div>

      <div class="card">
        <div class="title">Person 3</div>
        <div id="p3" class="value">0</div>
      </div>

    </div>

    <div id="total" class="total">Total Energy: 0 J</div>

    <script>
      async function updateData() {
        const res = await fetch("/data");
        const data = await res.json();

        document.getElementById("p1").innerText = data.P1.toFixed(6);
        document.getElementById("p2").innerText = data.P2.toFixed(6);
        document.getElementById("p3").innerText = data.P3.toFixed(6);

        let total = data.P1 + data.P2 + data.P3;

        document.getElementById("total").innerText =
          "Total Energy: " + total.toFixed(6) + " J";

        document.getElementById("status").innerText =
          total > 0 ? "Status: Connected" : "Status: Waiting";
      }

      setInterval(updateData, 2000);
    </script>

  </body>
  </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
