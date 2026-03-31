const express = require("express");
const app = express();

// 🔴 IMPORTANT: use Render port
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Data storage
let dataStore = {
  P1: 0,
  P2: 0,
  P3: 0
};

// Receive data from your laptop (Node.js)
app.post("/update", (req, res) => {
  dataStore = req.body;
  res.send("OK");
});

// Send data to frontend
app.get("/data", (req, res) => {
  res.json(dataStore);
});

// Dashboard UI
app.get("/", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Energy Dashboard</title>
    </head>

    <body style="font-family: Arial; text-align:center;">

      <h1>⚡ Energy Harvesting System</h1>

      <h2 id="status">Status: Waiting</h2>

      <h3>Person 1: <span id="p1">0</span></h3>
      <h3>Person 2: <span id="p2">0</span></h3>
      <h3>Person 3: <span id="p3">0</span></h3>

      <script>
        async function updateData() {
          const res = await fetch("/data");
          const data = await res.json();

          document.getElementById("p1").innerText = data.P1.toFixed(6);
          document.getElementById("p2").innerText = data.P2.toFixed(6);
          document.getElementById("p3").innerText = data.P3.toFixed(6);

          let total = data.P1 + data.P2 + data.P3;

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
