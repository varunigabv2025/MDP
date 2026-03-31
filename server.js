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
    data: { energy: 0, voltage: 0, power: 0, steps: 0 }
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

  users[currentUser].data = req.body;
  res.send("OK");
});

// ---------------- USER DATA ----------------
app.get("/user-data", (req, res) => {
  if (!currentUser) return res.json({});
  res.json(users[currentUser].data);
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

// ---------------- DASHBOARD ----------------
app.get("/", auth, (req, res) => {
  res.send(`
  <html>
  <head>
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

      .header {
        display:flex;
        justify-content:space-between;
        padding:20px;
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

      .leaderboard {
        margin-top:20px;
      }

      .leaderboard li {
        padding:5px;
        animation:fadeIn 0.5s ease;
      }

      button {
        padding:10px;
        border:none;
        border-radius:8px;
        cursor:pointer;
      }

      @keyframes fadeIn {
        from {opacity:0; transform:translateY(10px);}
        to {opacity:1;}
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

    <div class="header">
      <h2>⚡ Energy System</h2>
      <button onclick="toggleDark()">🌙</button>
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

      <div class="leaderboard card">
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

        document.getElementById("energy").innerText = d.energy.toFixed(4);
        document.getElementById("power").innerText = d.power.toFixed(4);
        document.getElementById("voltage").innerText = d.voltage.toFixed(2);
        document.getElementById("steps").innerText = d.steps;

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

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
