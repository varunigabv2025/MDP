const express = require("express");
const app = express();

app.use(express.json());

let dataStore = {
  P1: 0,
  P2: 0,
  P3: 0
};

// Receive data from Node.js
app.post("/update", (req, res) => {
  dataStore = req.body;
  res.send("OK");
});

// Dashboard UI
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Energy Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>

  <body style="font-family: Arial; text-align:center; background:#0f172a; color:white;">

    <h1>⚡ Energy Harvesting System</h1>

    <h2 id="status">Status: Disconnected</h2>

    <h2>Total Energy</h2>
    <h1 id="total">0</h1>

    <canvas id="chart" width="400" height="200"></canvas>

    <script>
      let chart;

      async function fetchData() {
        const res = await fetch("/data");
        const data = await res.json();

        let total = data.P1 + data.P2 + data.P3;

        document.getElementById("total").innerText = total.toFixed(6) + " J";

        // Status
        document.getElementById("status").innerText =
          total > 0 ? "Status: Connected" : "Status: Waiting";

        // Graph
        if (!chart) {
          const ctx = document.getElementById("chart").getContext("2d");
          chart = new Chart(ctx, {
            type: "bar",
            data: {
              labels: ["Person 1", "Person 2", "Person 3"],
              datasets: [{
                label: "Energy (J)",
                data: [data.P1, data.P2, data.P3]
              }]
            }
          });
        } else {
          chart.data.datasets[0].data = [data.P1, data.P2, data.P3];
          chart.update();
        }
      }

      // Auto update every 2 sec
      setInterval(fetchData, 2000);
    </script>

  </body>
  </html>
  `);
});

// API to send data to frontend
app.get("/data", (req, res) => {
  res.json(dataStore);
});

app.listen(3000, () => console.log("Server running"));
