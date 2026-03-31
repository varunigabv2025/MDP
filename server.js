const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔴 INITIAL ZERO DATA
let dataStore = {
  P1: 0,
  P2: 0,
  P3: 0,
  voltage: 0,
  power: 0,
  steps: 0
};

app.post("/update", (req, res) => {
  dataStore = req.body;
  res.send("OK");
});

app.get("/reset", (req, res) => {
  dataStore = { P1: 0, P2: 0, P3: 0, voltage: 0, power: 0, steps: 0 };
  res.send("Reset Done");
});

app.get("/data", (req, res) => {
  res.json(dataStore);
});

app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Energy Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
      body {
        margin: 0;
        font-family: 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #5b6ee1, #7c3aed);
        color: white;
      }

      .container {
        padding: 20px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255,255,255,0.1);
        padding: 20px;
        border-radius: 20px;
      }

      .status {
        font-weight: bold;
        padding: 8px 15px;
        border-radius: 10px;
        background: rgba(255,255,255,0.2);
      }

      .cards {
        display: flex;
        gap: 20px;
        margin-top: 20px;
        flex-wrap: wrap;
      }

      .card {
        flex: 1;
        min-width: 220px;
        background: white;
        color: black;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        transition: transform 0.2s;
      }

      .card:hover {
        transform: translateY(-5px);
      }

      .title {
        font-size: 14px;
        color: gray;
      }

      .value {
        font-size: 32px;
        font-weight: bold;
      }

      .section {
        display: flex;
        gap: 20px;
        margin-top: 20px;
        flex-wrap: wrap;
      }

      .box {
        flex: 1;
        min-width: 300px;
        background: white;
        color: black;
        padding: 20px;
        border-radius: 15px;
      }

      canvas {
        margin-top: 10px;
      }

      button {
        margin-top: 10px;
        padding: 10px 15px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: bold;
      }

      .reset { background: red; color: white; }
    </style>
  </head>

  <body>

    <div class="container">

      <!-- HEADER -->
      <div class="header">
        <h2>⚡ Energy Harvesting System</h2>
        <div id="status" class="status">Disconnected</div>
      </div>

      <!-- CARDS -->
      <div class="cards">

        <div class="card">
          <div class="title">TOTAL ENERGY</div>
          <div id="energy" class="value">0</div>
          <small>Joules</small>
        </div>

        <div class="card">
          <div class="title">CURRENT POWER</div>
          <div id="power" class="value">0</div>
          <small>Watts</small>
        </div>

        <div class="card">
          <div class="title">TOTAL STEPS</div>
          <div id="steps" class="value">0</div>
          <small>steps</small>
        </div>

      </div>

      <!-- GRAPH + INFO -->
      <div class="section">

        <div class="box">
          <h3>Energy Generation</h3>
          <canvas id="chart"></canvas>
        </div>

        <div class="box">
          <h3>System Information</h3>
          <p>Voltage: <span id="voltage">0</span> V</p>
          <p>Power: <span id="power2">0</span> W</p>
          <button class="reset" onclick="resetData()">Reset</button>
        </div>

      </div>

    </div>

    <script>
      let chart;

      async function updateData() {
        const res = await fetch("/data");
        const data = await res.json();

        let total = data.P1 + data.P2 + data.P3;

        document.getElementById("energy").innerText = total.toFixed(4);
        document.getElementById("power").innerText = data.power.toFixed(4);
        document.getElementById("power2").innerText = data.power.toFixed(4);
        document.getElementById("voltage").innerText = data.voltage.toFixed(2);
        document.getElementById("steps").innerText = data.steps;

        document.getElementById("status").innerText =
          total > 0 ? "Connected" : "Disconnected";

        if (!chart) {
          const ctx = document.getElementById("chart").getContext("2d");
          chart = new Chart(ctx, {
            type: "line",
            data: {
              labels: ["Person 1", "Person 2", "Person 3"],
              datasets: [{
                label: "Energy",
                data: [data.P1, data.P2, data.P3],
                borderColor: "blue",
                fill: false
              }]
            }
          });
        } else {
          chart.data.datasets[0].data = [data.P1, data.P2, data.P3];
          chart.update();
        }
      }

      function resetData() {
        fetch("/reset");
      }

      setInterval(updateData, 2000);
    </script>

  </body>
  </html>
  `);
});

app.listen(PORT, () => console.log("Server running"));
