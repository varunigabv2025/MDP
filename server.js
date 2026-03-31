const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 Simple login (hardcoded)
const USER = "admin";
const PASS = "1234";

let loggedIn = false;

// Data
let dataStore = {
  P1: 0,
  P2: 0,
  P3: 0,
  voltage: 0,
  power: 0,
  steps: 0
};

let history = [];

// ---------------- LOGIN PAGE ----------------
app.get("/login", (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="POST" action="/login">
      <input name="user" placeholder="Username"/><br><br>
      <input name="pass" type="password" placeholder="Password"/><br><br>
      <button type="submit">Login</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === USER && pass === PASS) {
    loggedIn = true;
    res.redirect("/");
  } else {
    res.send("Invalid login");
  }
});

// Middleware protect pages
function auth(req, res, next) {
  if (!loggedIn) return res.redirect("/login");
  next();
}

// ---------------- DATA ----------------
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
app.get("/history", (req, res) => res.json(history);

app.get("/reset", (req, res) => {
  dataStore = { P1: 0, P2: 0, P3: 0, voltage: 0, power: 0, steps: 0 };
  history = [];
  res.send("Reset Done");
});

// ---------------- LAYOUT ----------------
function layout(title, active, content) {
  return `
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      body { margin:0; font-family:Arial; background:#f4f6fb; }
      .nav { display:flex; justify-content:space-between; padding:15px; background:#5b6ee1; color:white; }
      .nav a { margin-left:20px; color:white; text-decoration:none; }
      .container { padding:20px; }
      .card { background:white; padding:15px; border-radius:10px; margin:10px 0; }
      .alert { background:#ffcccc; padding:10px; border-radius:8px; margin-bottom:10px; }
    </style>
  </head>
  <body>

    <div class="nav">
      <div>⚡ Energy System</div>
      <div>
        <a href="/">Dashboard</a>
        <a href="/analytics">Analytics</a>
        <a href="/system">System</a>
      </div>
    </div>

    <div class="container">
      ${content}
    </div>

  </body>
  </html>
  `;
}

// ---------------- DASHBOARD ----------------
app.get("/", auth, (req, res) => {
  res.send(layout("Dashboard","dash",`

    <h2>Dashboard</h2>

    <div id="alert"></div>

    <div class="card">Energy: <span id="energy">0</span></div>
    <div class="card">Power: <span id="power">0</span></div>
    <div class="card">Voltage: <span id="voltage">0</span></div>

    <script>
      async function load(){
        let d = await fetch('/data').then(r=>r.json());
        let total = d.P1 + d.P2 + d.P3;

        document.getElementById("energy").innerText = total.toFixed(4);
        document.getElementById("power").innerText = d.power.toFixed(4);
        document.getElementById("voltage").innerText = d.voltage.toFixed(2);

        let alertBox = document.getElementById("alert");
        alertBox.innerHTML = "";

        if (total < 0.001) {
          alertBox.innerHTML = "<div class='alert'>⚠ Low Energy Detected</div>";
        }

        if (d.voltage > 3) {
          alertBox.innerHTML += "<div class='alert'>⚠ High Voltage</div>";
        }
      }

      setInterval(load,2000);
    </script>
  `));
});

// ---------------- ANALYTICS ----------------
app.get("/analytics", auth, (req, res) => {
  res.send(layout("Analytics","ana",`
    <h2>Analytics</h2>
    <canvas id="chart"></canvas>

    <script>
      async function load(){
        let data = await fetch('/history').then(r=>r.json());

        new Chart(document.getElementById("chart"), {
          type:'line',
          data:{
            labels:data.map(d=>d.time),
            datasets:[{label:'Energy',data:data.map(d=>d.energy)}]
          }
        });
      }
      load();
    </script>
  `));
});

// ---------------- SYSTEM ----------------
app.get("/system", auth, (req, res) => {
  res.send(layout("System","sys",`

    <h2>System</h2>

    <div class="card">Voltage: <span id="voltage">0</span></div>
    <div class="card">Power: <span id="power">0</span></div>

    <button onclick="reset()">Reset</button>

    <script>
      async function load(){
        let d = await fetch('/data').then(r=>r.json());
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
