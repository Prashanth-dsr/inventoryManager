const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "inventory.db");
let db = null;

const initializeDBAndServer = async () => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  app.listen(3000, () => {
    console.log("Server running at PN: 3000");
  });
};

initializeDBAndServer();

const authenticateJWTToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid jwtToken");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", (error) => {
      if (error) {
        response.status(401);
        response.send("Invalid jwtToken");
      } else {
        next();
      }
    });
  }
};

// registration
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const userQ = `SELECT username FROM users WHERE username="${username}"`;
  const dbUser = await db.get(userQ);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      registerQ = `INSERT INTO users(username,password,name,gender) 
      VALUES ("${username}", "${hashedPassword}", "${name}", "${gender}")`;
      await db.run(registerQ);
      response.send("User created successfully");
    }
  }
});

// login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userQ = `SELECT username,password FROM users WHERE username = "${username}"`;
  const dbUser = await db.get(userQ);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);
    console.log(dbUser.password);
    if (isPasswordValid) {
      const payload = { username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// create
app.post("/inventory/", authenticateJWTToken, async (request, response) => {
  const { name, stock, price } = request.body;
  const createQ = `INSERT INTO inventory(name,stock,price) VALUES ('${name}',${stock},${price})`;
  await db.run(createQ);
  response.send("Added to inventory");
});

// read
app.get("/inventory/", authenticateJWTToken, async (request, response) => {
  const readQ = `SELECT * FROM inventory`;
  const inventory = await db.all(readQ);
  response.send(inventory);
});

app.get("/inventory/:id", authenticateJWTToken, async (request, response) => {
  const { id } = request.params;
  const readQ = `SELECT * FROM inventory WHERE id = ${id}`;
  const inventoryItem = await db.get(readQ);
  response.send(inventoryItem);
});

// update
app.put("/inventory/", authenticateJWTToken, async (request, response) => {
  const { name, stock, price } = request.body;
  const updateQ = `UPDATE inventory SET stock=${stock},price=${price} 
    WHERE name = "${name}"`;
  await db.run(updateQ);
  response.send("inventory updated successfully");
});

// delete
app.delete(
  "/inventory/:id",
  authenticateJWTToken,
  async (request, response) => {
    const { id } = request.params;
    const deleteQ = `DELETE FROM inventory WHERE id = ${id}`;
    await db.run(deleteQ);
    response.send("item deleted successfully");
  }
);

module.exports = app;
