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

  if (users[user]) return res.send("User exists");

  users[user] = {
    password: pass,
    data: { energy: 0, voltage: 0, power: 0, steps: 0 }
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

// ---------------- UPDATE DATA ----------------
app.post("/update", (req, res) => {
  if (!currentUser) return res.send("No user");

  users[currentUser].data = req.body;
  res.send("OK");
});

// ---------------- LEADERBOARD ----------------
app.get("/leaderboard-data", (req, res) => {
  let board = Object.entries(users).map(([name, u]) => ({
    name,
    energy: u.data.energy
  }));

  board.sort((a, b) => b.energy - a.energy);

  res.json(board);
});

// ---------------- USER DATA ----------------
app.get("/user-data", (req, res) => {
  if (!currentUser) return res.json({});
  res.json(users[currentUser].data);
});

// ---------------- DASHBOARD ----------------
app.get("/", auth, (req, res) => {
  res.send(`
  <html>
  <head>
    <style>
      body {
        font-family: Arial;
        margin:0;
        background: var(--bg);
        color: var(--text);
        transition: 0.3s;
      }

      :root {
        --bg: #f4f6fb;
        --text: black;
        --card: white;
      }

      .dark {
        --bg: #121212;
        --text: white;
        --card: #1e1e1e;
      }

      .header {
        display:flex;
        justify-content:space-between;
        padding:20px;
        background:#5b6ee1;
        color:white;
      }

      .container {
        padding:20px;
      }

      .cards {
        display:flex;
        gap:20px;
        flex-wrap:wrap;
      }

      .card {
        background:var(--card);
        padding:20px;
        border-radius:12px;
        flex:1;
        min-width:200px;
      }

      .value {
        font-size:24px;
        font-weight:bold;
      }

      button {
        padding:10px;
        margin-top:10px;
        border:none;
        border-radius:8px;
        cursor:pointer;
      }

      .leaderboard {
        margin-top:20px;
      }
    </style>
  </head>

  <body id="body">

    <div class="header">
      <h2>⚡ Energy Dashboard</h2>
      <button onclick="toggleDark()">🌙</button>
    </div>

    <div class="container">

      <!-- CARDS -->
      <div class="cards">

        <div class="card">
          <div>Energy</div>
          <div id="energy" class="value">0</div>
        </div>

        <div class="card">
          <div>Power</div>
          <div id="power" class="value">0</div>
        </div>

        <div class="card">
          <div>Voltage</div>
          <div id="voltage" class="value">0</div>
        </div>

        <div class="card">
          <div>Steps</div>
          <div id="steps" class="value">0</div>
        </div>

        <div class="card">
          <div>Efficiency</div>
          <div id="efficiency" class="value">0%</div>
        </div>

      </div>

      <!-- LEADERBOARD -->
      <div class="leaderboard card">
        <h3>🏆 Leaderboard</h3>
        <ul id="board"></ul>
      </div>

    </div>

    <script>
      function toggleDark(){
        document.body.classList.toggle("dark");
      }

      async function load(){

        let d = await fetch('/user-data').then(r=>r.json());

        document.getElementById("energy").innerText = d.energy.toFixed(4);
        document.getElementById("power").innerText = d.power.toFixed(4);
        document.getElementById("voltage").innerText = d.voltage.toFixed(2);
        document.getElementById("steps").innerText = d.steps;

        let efficiency = d.steps > 0 ? (d.energy / d.steps) * 100 : 0;
        document.getElementById("efficiency").innerText = efficiency.toFixed(2) + "%";

        // leaderboard
        let board = await fetch('/leaderboard-data').then(r=>r.json());

        let list = document.getElementById("board");
        list.innerHTML = "";

        board.forEach((u, i) => {
          list.innerHTML += "<li>" + (i+1) + ". " + u.name + " - " + u.energy.toFixed(2) + " J</li>";
        });
      }

      setInterval(load,2000);
    </script>

  </body>
  </html>
  `);
});

app.listen(PORT, () => console.log("Server running"));
