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

// store history for analytics
let history = [];

app.post("/update", (req, res) => {
  dataStore = req.body;

  history.push({
    time: new Date().toLocaleTimeString(),
    energy: dataStore.P1 + dataStore.P2 + dataStore.P3
  });

  if (history.length > 20) history.shift();

  res.send("OK");
});

app.get("/data", (req, res) => res.json(dataStore));
app.get("/history", (req, res) => res.json(history));

app.get("/reset", (req, res) => {
  dataStore = { P1: 0, P2: 0, P3: 0, voltage: 0, power: 0, steps: 0 };
  history = [];
  res.send("Reset Done");
});

// ---------------- NAVBAR TEMPLATE ----------------
function layout(content) {
  return `
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      body {
        margin:0;
        font-family: Arial;
        background: #f5f6fa;
      }
      .nav {
        display:flex;
        gap:20px;
        padding:15px;
        background:#5b6ee1;
      }
      .nav a {
        color:white;
        text-decoration:none;
        font-weight:bold;
      }
      .container {
        padding:20px;
      }
      .card {
        background:white;
        padding:20px;
        border-radius:10px;
        margin:10px 0;
      }
    </style>
  </head>
  <body>

    <div class="nav">
      <a href="/">Dashboard</a>
      <a href="/analytics">Analytics</a>
      <a href="/system">System</a>
    </div>

    <div class="container">
      ${content}
    </div>

  </body>
  </html>
  `;
}

// ---------------- PAGE 1: DASHBOARD ----------------
app.get("/", (req, res) => {
  res.send(layout(`
    <h2>⚡ Dashboard</h2>

    <div class="card">Total Energy: <span id="energy">0</span></div>
    <div class="card">Voltage: <span id="voltage">0</span></div>
    <div class="card">Power: <span id="power">0</span></div>
    <div class="card">Steps: <span id="steps">0</span></div>

    <script>
      async function load(){
        let d = await fetch('/data').then(r=>r.json());
        let total = d.P1 + d.P2 + d.P3;

        document.getElementById("energy").innerText = total.toFixed(4);
        document.getElementById("voltage").innerText = d.voltage.toFixed(2);
        document.getElementById("power").innerText = d.power.toFixed(4);
        document.getElementById("steps").innerText = d.steps;
      }
      setInterval(load,2000);
    </script>
  `));
});

// ---------------- PAGE 2: ANALYTICS ----------------
app.get("/analytics", (req, res) => {
  res.send(layout(`
    <h2>📊 Analytics</h2>
    <canvas id="chart"></canvas>

    <script>
      async function load(){
        let data = await fetch('/history').then(r=>r.json());

        let labels = data.map(d=>d.time);
        let values = data.map(d=>d.energy);

        new Chart(document.getElementById("chart"), {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{ label:'Energy', data: values }]
          }
        });
      }
      load();
    </script>
  `));
});

// ---------------- PAGE 3: SYSTEM ----------------
app.get("/system", (req, res) => {
  res.send(layout(`
    <h2>⚙ System Info</h2>

    <div class="card">Status: <span id="status">Disconnected</span></div>
    <div class="card">Voltage: <span id="voltage">0</span></div>
    <div class="card">Power: <span id="power">0</span></div>

    <button onclick="reset()">Reset System</button>

    <script>
      async function load(){
        let d = await fetch('/data').then(r=>r.json());
        let total = d.P1 + d.P2 + d.P3;

        document.getElementById("status").innerText =
          total > 0 ? "Connected" : "Disconnected";

        document.getElementById("voltage").innerText = d.voltage;
        document.getElementById("power").innerText = d.power;
      }

      function reset(){
        fetch('/reset');
      }

      setInterval(load,2000);
    </script>
  `));
});

app.listen(PORT, () => console.log("Server running"));
