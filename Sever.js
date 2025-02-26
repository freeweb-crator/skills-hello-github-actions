require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const UserSchema = new mongoose.Schema({
  balance: Number,
  invested: Number,
  accountLevel: String,
});

const User = mongoose.model("User", UserSchema);

async function getBTCPrice() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    return response.data.bitcoin.usd;
  } catch (error) {
    console.error("Error fetching BTC price:", error);
    return 0;
  }
}

app.get("/btc-price", async (req, res) => {
  const price = await getBTCPrice();
  res.json({ btcPrice: price });
});

app.post("/update-balance", async (req, res) => {
  const { balance } = req.body;
  const btcPrice = await getBTCPrice();
  const btcEquivalent = balance / btcPrice;

  await User.findOneAndUpdate({}, { balance }, { upsert: true });

  io.emit("balanceUpdated", { balance, btcEquivalent });
  res.json({ balance, btcEquivalent });
});

app.post("/update-investment", async (req, res) => {
  const { invested } = req.body;
  await User.findOneAndUpdate({}, { invested }, { upsert: true });

  io.emit("investmentUpdated", { invested });
  res.json({ invested });
});

app.post("/update-account-level", async (req, res) => {
  const { accountLevel } = req.body;
  await User.findOneAndUpdate({}, { accountLevel }, { upsert: true });

  io.emit("accountLevelUpdated", { accountLevel });
  res.json({ accountLevel });
});

server.listen(5000, () => console.log("Server running on port 5000"));
