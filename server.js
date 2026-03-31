const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------- USERS ----------------
let users = {};
let currentUser = null;

// ---------------- REGISTER ----------------
app.get("/register", (req, res) => {
  res.send(`
    <h2>Register</h2>
    <form method="POST">
      <input name="user" placeholder="Username" required/><br><br>
      <input name="pass" type="password" placeholder="Password" required/><br><br>
      <button>Register</button>
    </form>
    <a href="/login">Login</a>
  `);
});

app.post("/register", (req, res) => {
  const { user, pass } = req.body;

  users[user] = {
    password: pass,
    data: { energy: 0, voltage: 0, power: 0, steps: 0 },
    history: [],
    goal: 10
  };

  res.redirect("/login");
});

// ---------------- LOGIN ----------------
app.get("/login", (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="POST">
      <input name="user"/><br><br>
      <input name="pass" type="password"/><br><br>
      <button>Login</button>
    </form>
    <a href="/register">Register</a>
  `);
});

app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (!users[user] || users[user].password !== pass) {
    return res.send("Invalid login");
  }

  currentUser = user;
  res.redirect("/");
});

// ---------------- AUTH ----------------
function auth(req, res, next) {
  if (!currentUser) return res.redirect("/login");
  next();
}

// ---------------- UPDATE ----------------
app.post("/update", (req, res) => {
  let u = users[currentUser];
  u.data = req.body;

  u.history.push({
    time: new Date().toLocaleTimeString(),
    energy: u.data.energy
  });

  if (u.history.length > 30) u.history.shift();

  res.send("OK");
});

// ---------------- DATA ----------------
app.get("/user-data", (req, res) => res.json(users[currentUser]?.data || {}));
app.get("/history", (req, res) => res.json(users[currentUser]?.history || []));

// ---------------- LAYOUT WITH DARK MODE ----------------
function layout(content, active) {
  return `
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
      body {
        margin:0;
        font-family:'Segoe UI';
        display:flex;
        background:#f4f6fb;
        transition:0.3s;
      }

      body.dark {
        background:#121212;
        color:white;
      }

      .sidebar {
        width:220px;
        background:#5b6ee1;
        color:white;
        height:100vh;
        padding:20px;
      }

      .sidebar a {
        display:block;
        color:white;
        text-decoration:none;
        margin:10px 0;
        padding:10px;
        border-radius:8px;
      }

      .sidebar a.active {
        background:white;
        color:#5b6ee1;
      }

      .main {
        flex:1;
        padding:20px;
      }

      .topbar {
        display:flex;
        justify-content:space-between;
        margin-bottom:20px;
      }

      .cards {
        display:flex;
        gap:20px;
        flex-wrap:wrap;
      }

      .card {
        background:white;
        padding:20px;
        border-radius:12px;
        flex:1;
        min-width:200px;
      }

      body.dark .card {
        background:#1e1e1e;
      }

      .value {
        font-size:26px;
        font-weight:bold;
      }

      button {
        padding:8px 12px;
        border:none;
        border-radius:8px;
        cursor:pointer;
      }
    </style>
  </head>

  <body id="body">

    <div class="sidebar">
      <h2>⚡ Energy</h2>
      <a href="/" class="${active==="dash"?"active":""}">Dashboard</a>
      <a href="/history-page" class="${active==="hist"?"active":""}">History</a>
      <a href="/challenge" class="${active==="goal"?"active":""}">Goal</a>
      <a href="/qr" class="${active==="qr"?"active":""}">QR</a>
    </div>

    <div class="main">

      <div class="topbar">
        <h2>${active.toUpperCase()}</h2>
        <button onclick="toggleDark()">🌙 Toggle</button>
      </div>

      ${content}

    </div>

    <script>
      function toggleDark(){
        document.body.classList.toggle("dark");
      }
    </script>

  </body>
  </html>
  `;
}

// ---------------- DASHBOARD ----------------
app.get("/", auth, (req, res) => {
  res.send(layout(`
    <div class="cards">
      <div class="card">Energy<br><span id="energy" class="value">0</span></div>
      <div class="card">Power<br><span id="power" class="value">0</span></div>
      <div class="card">Voltage<br><span id="voltage" class="value">0</span></div>
    </div>

    <script>
      async function load(){
        let d = await fetch('/user-data').then(r=>r.json());
        document.getElementById("energy").innerText = (d.energy||0).toFixed(2);
        document.getElementById("power").innerText = (d.power||0).toFixed(2);
        document.getElementById("voltage").innerText = (d.voltage||0).toFixed(2);
      }
      setInterval(load,2000);
    </script>
  `,"dash"));
});

// ---------------- HISTORY ----------------
app.get("/history-page", auth, (req, res) => {
  res.send(layout(`
    <canvas id="chart"></canvas>

    <script>
      async function load(){
        let data = await fetch('/history').then(r=>r.json());

        new Chart(document.getElementById("chart"), {
          type:'line',
          data:{
            labels:data.map(d=>d.time),
            datasets:[{data:data.map(d=>d.energy)}]
          }
        });
      }
      load();
    </script>
  `,"hist"));
});

// ---------------- GOAL ----------------
app.get("/challenge", auth, (req, res) => {
  let goal = users[currentUser].goal;

  res.send(layout(`
    <p>Target: ${goal} J</p>
    <p id="progress"></p>

    <script>
      async function load(){
        let d = await fetch('/user-data').then(r=>r.json());
        document.getElementById("progress").innerText =
          "Progress: " + (d.energy||0).toFixed(2) + " / ${goal} J";
      }
      setInterval(load,2000);
    </script>
  `,"goal"));
});

// ---------------- QR ----------------
app.get("/qr", (req, res) => {
  const url = req.protocol + "://" + req.get("host");

  res.send(layout(`
    <p>${url}</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}" />
  `,"qr"));
});

app.listen(PORT, () => console.log("Server running"));
