import express from "express";
import users from "./MOCK_DATA.json" assert { type: "json" };
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve("./");

//Dummy Key
const validAPIKey = process.env.API_Key;

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function checkApiKey(req, res, next) {
  // const apiKey = req.query.appid; //Query Params

  const apiKey = req.headers.appid;

  if (!apiKey) {
    return res.status(401).json({ error: "API key is missing" });
  }

  if (apiKey !== validAPIKey) {
    return res.status(401).json({ error: "Unauthorized Access" });
  }
  next();
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes),
});

app.use(limiter);

//Routes

//Query Route

app.get("/api/users", (req, res) => {
  const { gender, job_title, page = 1, limit = 10 } = req.query;

  const targetUser = users.filter((user) => {
    if (gender && job_title) {
      return gender === user.gender && job_title === user.job_title;
    } else if (gender) {
      return gender === user.gender;
    } else if (job_title) {
      return job_title === user.job_title;
    } else {
      //User koi parameter nahi di
      return true; // Sarey data return
    }
  });

  //Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedUser = targetUser.splice(startIndex, endIndex);

  res.json({
    page: Number(page),
    limit: Number(limit),
    totalResult: targetUser.length,
    totalPages: Math.ceil(targetUser.length / limit),
    data: paginatedUser,
  });
});

app.get("/users", (req, res) => {
  const html = `<ul>
      ${users.map((user) => `<li>${user.first_name}</li>`).join("")}
    </ul>`;

  res.send(html);
});

//Dynamic routes

app.get("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = users.find((user) => user.id === id);
  if (!user) {
    return res.status(404).json({ error: "User not found!" });
  }
  res.json(user);
});

//Post request

app.post("/api/users", checkApiKey, (req, res) => {
  // Create new user
  const newUser = req.body;

  if (
    !newUser.first_name ||
    !newUser.last_name ||
    !newUser.gender ||
    !newUser.email ||
    !newUser.job_title
  ) {
    return res.status(400).json({ error: "More feild required" });
  }

  newUser.id = users.length + 1; // Assign a unique ID

  // Push the new user to the array
  users.push(newUser);

  // Write updated users array to file
  console.log(__dirname + "/MOCK_DATA.json");
  fs.writeFile(__dirname + "/MOCK_DATA.json", JSON.stringify(users), (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to write to file" });
    }
    return res.status(201).json({ status: "sucess", id: users.length });
  });
});

// PUT - Replace user
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params; // Get the user ID from the URL
  const updatedUser = req.body; // Get the updated user data from the request body

  if (
    !updatedUser.first_name ||
    !updatedUser.last_name ||
    !updatedUser.gender ||
    !updatedUser.email ||
    !updatedUser.job_title
  ) {
    return res.status(400).json({ error: "More feild required" });
  }

  // Find the index of the user with the given ID
  const userIndex = users.findIndex((user) => user.id == id);

  if (userIndex !== -1) {
    // Replace the user data
    users[userIndex] = { id: Number(id), ...updatedUser };
  }

  try {
    fs.writeFileSync(
      path.join(__dirname, "MOCK_DATA.json"),
      JSON.stringify(users)
    );
    return res.json({ status: "success", user: updatedUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

//patch - update
//Find that user

app.patch("/api/users/:id", checkApiKey, (req, res) => {
  const id = Number(req.params.id);
  const userIndex = users.findIndex((user) => user.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const updatedUser = { ...users[userIndex], ...req.body };
  users[userIndex] = updatedUser;

  try {
    fs.writeFileSync(
      path.join(__dirname, "MOCK_DATA.json"),
      JSON.stringify(users)
    );
    return res.json({ status: "success", user: updatedUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/api/users/:id", checkApiKey, (req, res) => {
  // Extract user ID from request parameters
  const id = Number(req.params.id);

  // Find index of the user with the given ID
  const userIndex = users.findIndex((user) => user.id === id);

  // Check if user exists
  if (userIndex === -1 || userIndex > users.length) {
    return res.status(404).json({ error: "User not found" });
  }

  // Remove the user from the array
  users.splice(userIndex, 1);

  // Decrement IDs of users following the deleted user
  for (let i = userIndex; i < users.length; i++) {
    users[i].id -= 1;
  }

  try {
    // Write updated users array to file
    fs.writeFileSync(
      path.join(__dirname, "MOCK_DATA.json"),
      JSON.stringify(users)
    );
    return res.json({ status: "success" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

//Server
app.listen(PORT, (req, res) => {
  console.log(`Server is running on port ${PORT}`);
});
