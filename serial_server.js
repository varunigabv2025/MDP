const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

let dataStore = {
  P1: 0,
  P2: 0,
  P3: 0,
  voltage: 0,
  power: 0
};

// Receive data
app.post("/update", (req, res) => {
  dataStore = req.body;
  res.send("OK");
});

// Reset
app.get("/reset", (req, res) => {
  dataStore = { P1: 0, P2: 0, P3: 0, voltage: 0, power: 0 };
  res.send("Reset Done");
});

// Calibrate
app.get("/calibrate", (req, res) => {
  res.send("Calibration Complete");
});

// Send data
app.get("/data", (req, res) => {
  res.json(dataStore);
});

// DASHBOARD UI
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Energy Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
      body {
        margin: 0;
        font-family: Arial;
        background: linear-gradient(135deg, #4f46e5, #9333ea);
        color: white;
        text-align: center;
      }

      h1 {
        margin-top: 20px;
      }

      .status {
        font-size: 18px;
        margin-bottom: 10px;
      }

      .container {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
        margin: 20px;
      }

      .card {
        background: white;
        color: black;
        padding: 20px;
        border-radius: 15px;
        width: 200px;
        box-shadow: 0px 5px 15px rgba(0,0,0,0.3);
      }

      .value {
        font-size: 24px;
        font-weight: bold;
      }

      button {
        margin: 10px;
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        font-weight: bold;
        cursor: pointer;
      }

      .reset { background: red; color: white; }
      .calibrate { background: green; color: white; }

      canvas {
        margin-top: 30px;
        background: white;
        border-radius: 10px;
      }
    </style>
  </head>

  <body>

    <h1>⚡ Energy Harvesting Dashboard</h1>
    <div id="status" class="status">Status: Waiting</div>

    <div class="container">
      <div class="card">
        <h3>Total Energy</h3>
        <div id="energy" class="value">0</div>
      </div>

      <div class="card">
        <h3>Voltage</h3>
        <div id="voltage" class="value">0</div>
      </div>

      <div class="card">
        <h3>Power</h3>
        <div id="power" class="value">0</div>
      </div>
    </div>

    <div>
      <button class="reset" onclick="resetData()">Reset</button>
      <button class="calibrate" onclick="calibrate()">Calibrate</button>
    </div>

    <canvas id="chart" width="400" height="200"></canvas>

    <script>
      let chart;

      async function updateData() {
        const res = await fetch("/data");
        const data = await res.json();

        let total = data.P1 + data.P2 + data.P3;

        document.getElementById("energy").innerText = total.toFixed(6) + " J";
        document.getElementById("voltage").innerText = data.voltage.toFixed(3) + " V";
        document.getElementById("power").innerText = data.power.toFixed(6) + " W";

        document.getElementById("status").innerText =
          total > 0 ? "Status: Connected" : "Status: Waiting";

        if (!chart) {
          const ctx = document.getElementById("chart").getContext("2d");
          chart = new Chart(ctx, {
            type: "bar",
            data: {
              labels: ["Person 1", "Person 2", "Person 3"],
              datasets: [{
                label: "Energy (J)",
                data: [data.P1, data.P2, data.P3],
                backgroundColor: ["blue", "green", "orange"]
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

      function calibrate() {
        fetch("/calibrate");
        alert("Calibration Done");
      }

      setInterval(updateData, 2000);
    </script>

  </body>
  </html>
  `);
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
