const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function saveLead(type, data) {
  const dir = path.join(__dirname, "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir, "leads.jsonl");
  fs.appendFileSync(file, JSON.stringify({ type, ...data, createdAt: new Date().toISOString() }) + "\n");
}

app.post("/stock-review", (req, res) => {
  saveLead("concentrated-stock", req.body);
  res.redirect("/stock-review-thank-you.html");
});
app.post("/stock-review", (req, res) => {
  ...
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => console.log(`Turill Financial V2 running at http://localhost:${PORT}`));
app.listen(PORT, () => console.log(`Turill Financial V2 running at http://localhost:${PORT}`));
