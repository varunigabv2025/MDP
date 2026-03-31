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
      <input name="user" required/><br><br>
      <input name="pass" type="password" required/><br><br>
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
app.get("/user-data", (req, res) => {
  res.json(users[currentUser]?.data || {});
});

app.get("/history", (req, res) => {
  res.json(users[currentUser]?.history || []);
});

// ---------------- DASHBOARD ----------------
app.get("/", auth, (req, res) => {
  res.send(`
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      body { font-family:Arial; margin:0; background:#f4f6fb; }
      .nav { padding:15px; background:#5b6ee1; color:white; }
      .container { padding:20px; }
      .card { background:white; padding:15px; margin:10px 0; border-radius:10px; }
    </style>
  </head>

  <body>

    <div class="nav">
      ⚡ Energy System |
      <a href="/history-page">History</a> |
      <a href="/challenge">Challenge</a> |
      <a href="/qr">QR</a>
    </div>

    <div class="container">

      <div class="card">Energy: <span id="energy">0</span></div>
      <div class="card">Power: <span id="power">0</span></div>
      <div class="card">Voltage: <span id="voltage">0</span></div>

    </div>

    <script>
      async function load(){
        let d = await fetch('/user-data').then(r=>r.json());

        document.getElementById("energy").innerText = d.energy || 0;
        document.getElementById("power").innerText = d.power || 0;
        document.getElementById("voltage").innerText = d.voltage || 0;
      }
      setInterval(load,2000);
    </script>

  </body>
  </html>
  `);
});

// ---------------- HISTORY PAGE ----------------
app.get("/history-page", auth, (req, res) => {
  res.send(`
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>

  <body>
    <h2>📊 Energy History</h2>
    <canvas id="chart"></canvas>

    <script>
      async function load(){
        let data = await fetch('/history').then(r=>r.json());

        new Chart(document.getElementById("chart"), {
          type:'line',
          data:{
            labels:data.map(d=>d.time),
            datasets:[{label:'Energy', data:data.map(d=>d.energy)}]
          }
        });
      }
      load();
    </script>
  </body>
  </html>
  `);
});

// ---------------- CHALLENGE ----------------
app.get("/challenge", auth, (req, res) => {
  let goal = users[currentUser].goal;

  res.send(`
  <h2>🎯 Daily Challenge</h2>
  <p>Goal: ${goal} J</p>
  <p id="progress">0</p>

  <script>
    async function load(){
      let d = await fetch('/user-data').then(r=>r.json());
      document.getElementById("progress").innerText =
        "Progress: " + d.energy.toFixed(2) + " / ${goal} J";
    }
    setInterval(load,2000);
  </script>
  `);
});

// ---------------- QR ----------------
app.get("/qr", (req, res) => {
  res.send(`
    <h2>📱 Scan QR</h2>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://mdpfinal.onrender.com/" />
  `);
});

app.listen(PORT, () => console.log("Server running"));
