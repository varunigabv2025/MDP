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

  if (users[user]) return res.send("User already exists");

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
      <input name="user" required/><br><br>
      <input name="pass" type="password" required/><br><br>
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

  let u = users[currentUser];
  u.data = req.body;

  u.history.push({
    time: new Date().toLocaleTimeString(),
    energy: u.data.energy
  });

  if (u.history.length > 30) u.history.shift();

  res.send("OK");
});

// ---------------- USER DATA ----------------
app.get("/user-data", (req, res) => {
  res.json(users[currentUser]?.data || {});
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

// ---------------- HISTORY DATA ----------------
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
      body {
        font-family: 'Segoe UI', sans-serif;
        margin:0;
        background: linear-gradient(135deg,#5b6ee1,#7c3aed);
        color:white;
      }

      .dark {
        background:#121212;
      }

      .nav {
        padding:15px;
        display:flex;
        justify-content:space-between;
      }

      .nav a {
        color:white;
        margin-left:15px;
        text-decoration:none;
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
        flex:1;
        min-width:200px;
        background:rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
        padding:20px;
        border-radius:15px;
        transition:0.3s;
      }

      .card:hover {
        transform:translateY(-5px) scale(1.02);
      }

      .value {
        font-size:28px;
        font-weight:bold;
      }

      .toast {
        position:fixed;
        bottom:20px;
        right:20px;
        background:#333;
        padding:15px;
        border-radius:10px;
        display:none;
      }
    </style>
  </head>

  <body id="body">

    <div class="nav">
      <div>⚡ Energy Dashboard</div>
      <div>
        <a href="/history-page">History</a>
        <a href="/challenge">Challenge</a>
        <a href="/qr">QR</a>
        <button onclick="toggleDark()">🌙</button>
      </div>
    </div>

    <div class="container">

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
          <div id="eff" class="value">0%</div>
        </div>

      </div>

      <div class="card">
        <h3>🏆 Leaderboard</h3>
        <ul id="board"></ul>
      </div>

    </div>

    <div id="toast" class="toast"></div>

    <script>
      function toggleDark(){
        document.body.classList.toggle("dark");
      }

      function showToast(msg){
        let t = document.getElementById("toast");
        t.innerText = msg;
        t.style.display = "block";
        setTimeout(()=> t.style.display="none",2000);
      }

      async function load(){
        let d = await fetch('/user-data').then(r=>r.json());

        document.getElementById("energy").innerText = (d.energy||0).toFixed(4);
        document.getElementById("power").innerText = (d.power||0).toFixed(4);
        document.getElementById("voltage").innerText = (d.voltage||0).toFixed(2);
        document.getElementById("steps").innerText = d.steps||0;

        let eff = d.steps > 0 ? (d.energy / d.steps)*100 : 0;
        document.getElementById("eff").innerText = eff.toFixed(2)+"%";

        if(d.energy > 1){
          showToast("🔥 Great energy generated!");
        }

        let board = await fetch('/leaderboard-data').then(r=>r.json());

        let list = document.getElementById("board");
        list.innerHTML = "";

        board.forEach((u,i)=>{
          list.innerHTML += "<li>"+(i+1)+". "+u.name+" - "+u.energy.toFixed(2)+" J</li>";
        });
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
    <h2>📊 Energy History</h2>
    <canvas id="chart"></canvas>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
  `);
});

// ---------------- CHALLENGE ----------------
app.get("/challenge", auth, (req, res) => {
  let goal = users[currentUser].goal;

  res.send(`
    <h2>🎯 Challenge</h2>
    <p>Goal: ${goal} J</p>
    <p id="progress"></p>

    <script>
      async function load(){
        let d = await fetch('/user-data').then(r=>r.json());
        document.getElementById("progress").innerText =
          "Progress: " + (d.energy||0).toFixed(2) + " / ${goal} J";
      }
      setInterval(load,2000);
    </script>
  `);
});

// ---------------- QR (FIXED) ----------------
app.get("/qr", (req, res) => {
  const url = req.protocol + "://" + req.get("host");

  res.send(`
    <h2>📱 Scan QR</h2>
    <p>${url}</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}" />
  `);
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
