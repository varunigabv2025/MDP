const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

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
    <title>Energy App</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
      body {
        margin: 0;
        font-family: 'Segoe UI', sans-serif;
        background: #f5f6fa;
      }

      .app {
        max-width: 420px;
        margin: auto;
        padding: 15px;
      }

      .header {
        background: linear-gradient(135deg, #5b6ee1, #7c3aed);
        color: white;
        padding: 20px;
        border-radius: 20px;
      }

      .status {
        margin-top: 10px;
        font-size: 14px;
        opacity: 0.9;
      }

      .card {
        background: white;
        border-radius: 15px;
        padding: 15px;
        margin-top: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      }

      .title {
        font-size: 14px;
        color: gray;
      }

      .value {
        font-size: 28px;
        font-weight: bold;
      }

      .row {
        display: flex;
        justify-content: space-between;
      }

      button {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 10px;
        background: #5b6ee1;
        color: white;
        font-weight: bold;
        margin-top: 10px;
      }
    </style>
  </head>

  <body>

    <div class="app">

      <!-- HEADER -->
      <div class="header">
        <h2>⚡ Energy System</h2>
        <div id="status" class="status">Disconnected</div>
      </div>

      <!-- ENERGY CARD -->
      <div class="card">
        <div class="title">Total Energy</div>
        <div id="energy" class="value">0 J</div>
      </div>

      <!-- POWER + STEPS -->
      <div class="card row">
        <div>
          <div class="title">Power</div>
          <div id="power" class="value">0 W</div>
        </div>
        <div>
          <div class="title">Steps</div>
          <div id="steps" class="value">0</div>
        </div>
      </div>

      <!-- SYSTEM INFO -->
      <div class="card">
        <div class="title">Voltage</div>
        <div id="voltage" class="value">0 V</div>
      </div>

      <!-- GRAPH -->
      <div class="card">
        <div class="title">Energy Distribution</div>
        <canvas id="chart"></canvas>
      </div>

      <!-- RESET BUTTON -->
      <button onclick="resetData()">Reset System</button>

    </div>

    <script>
      let chart;

      async function updateData() {
        const res = await fetch("/data");
        const data = await res.json();

        let total = data.P1 + data.P2 + data.P3;

        document.getElementById("energy").innerText = total.toFixed(4) + " J";
        document.getElementById("power").innerText = data.power.toFixed(4) + " W";
        document.getElementById("voltage").innerText = data.voltage.toFixed(2) + " V";
        document.getElementById("steps").innerText = data.steps;

        document.getElementById("status").innerText =
          total > 0 ? "Connected" : "Disconnected";

        if (!chart) {
          const ctx = document.getElementById("chart").getContext("2d");
          chart = new Chart(ctx, {
            type: "doughnut",
            data: {
              labels: ["P1", "P2", "P3"],
              datasets: [{
                data: [data.P1, data.P2, data.P3]
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
