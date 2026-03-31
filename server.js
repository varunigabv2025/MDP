const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------- USER STORAGE ----------------
let users = {};   // { username: { password, data } }
let currentUser = null;

// ---------------- REGISTER ----------------
app.get("/register", (req, res) => {
  res.send(`
    <h2>Register</h2>
    <form method="POST" action="/register">
      <input name="user" placeholder="Username" required/><br><br>
      <input name="pass" type="password" placeholder="Password" required/><br><br>
      <button type="submit">Register</button>
    </form>
    <br>
    <a href="/login">Already have account? Login</a>
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
    <form method="POST" action="/login">
      <input name="user" placeholder="Username"/><br><br>
      <input name="pass" type="password" placeholder="Password"/><br><br>
      <button type="submit">Login</button>
    </form>
    <br>
    <a href="/register">Create Account</a>
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
  if (!currentUser) return res.send("No user logged in");

  users[currentUser].data = req.body;
  res.send("OK");
});

// ---------------- DASHBOARD ----------------
app.get("/", auth, (req, res) => {
  res.send(`
  <html>
  <head>
    <style>
      body {
        font-family: Arial;
        background: linear-gradient(135deg, #5b6ee1, #7c3aed);
        color: white;
        margin:0;
        padding:20px;
      }

      .card {
        background: white;
        color: black;
        padding: 20px;
        margin: 10px;
        border-radius: 12px;
      }

      .container {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }

      h1 {
        text-align:center;
      }
    </style>
  </head>

  <body>

    <h1>⚡ Your Energy Dashboard</h1>

    <div class="container">

      <div class="card">
        <h3>Energy</h3>
        <p id="energy">0</p>
      </div>

      <div class="card">
        <h3>Voltage</h3>
        <p id="voltage">0</p>
      </div>

      <div class="card">
        <h3>Power</h3>
        <p id="power">0</p>
      </div>

      <div class="card">
        <h3>Steps</h3>
        <p id="steps">0</p>
      </div>

    </div>

    <script>
      async function load(){
        let res = await fetch('/user-data');
        let d = await res.json();

        document.getElementById("energy").innerText = d.energy.toFixed(4);
        document.getElementById("voltage").innerText = d.voltage.toFixed(2);
        document.getElementById("power").innerText = d.power.toFixed(4);
        document.getElementById("steps").innerText = d.steps;
      }

      setInterval(load,2000);
    </script>

  </body>
  </html>
  `);
});

// ---------------- USER DATA ----------------
app.get("/user-data", (req, res) => {
  if (!currentUser) return res.json({});
  res.json(users[currentUser].data);
});

app.listen(PORT, () => console.log("Server running"));
