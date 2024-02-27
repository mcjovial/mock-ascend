// Import necessary modules
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

// Initialize Express app
const app = express();
require("dotenv").config();

const PORT = process.env.PORT || 3000;

// MongoDB connection setup
mongoose
  .connect("mongodb+srv://mcjovial:19971104Mj@int-dev.99vrolk.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));
const db = mongoose.connection;

// Create a schema for the user model
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  client_id: String,
  client_secret: String,
  timestamps: { type: Date, default: Date.now },
});

// Create a model for the user
const User = mongoose.model("User", userSchema);

// Define Price schema
const priceSchema = new mongoose.Schema({
  dealerId: String,
  locationId: String,
  upc: String,
  sku: String,
  basePrice: Number,
  promotionPrice: Number,
});

const Price = mongoose.model("Price", priceSchema);

// Middleware to enable CORS
app.use(cors());

// Middleware setup
app.use(bodyParser.json());

// Route to handle user registration
app.post("/api/public/register", async (req, res) => {
  try {
    const { username, email } = req.body;
    const client_id = generateClientId();
    const random_key = generateRandomKey();
    const client_secret = generateClientSecret(random_key);
    const user = new User({ username, email, client_id, client_secret });
    await user.save();
    res.status(201).json({
      message: "User registered successfully",
      user: { ...user._doc, client_secret: random_key },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to generate authentication token
app.post("/api/public/token", async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;
    const user = await User.findOne({ client_id });
    if (!user || !bcrypt.compareSync(client_secret, user.client_secret)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ client_id: user.client_id }, "your_secret_key");
    res.status(200).json({ access_token: token });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, "your_secret_key", (err, decoded) => {
    if (err) return res.status(401).json({ error: "Unauthorized" });
    req.client_id = decoded.client_id;
    next();
  });
};

// Route to get user details
app.get("/api/public/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ client_id: req.client_id });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to get dealers data
app.get("/api/public/dealers", verifyToken, (req, res) => {
  const dealersData = [
    {
      dealerId: 594939,
      name: "Dealer one",
      locations: [
        {
          locationId: 1,
          locationName: "Dealer one location one",
          isVatLocale: true,
        },
      ],
    },
    {
      dealerId: 493849,
      name: "Dealer two",
      locations: [
        {
          locationId: 1,
          locationName: "Dealer two location one",
          isVatLocale: true,
        },
      ],
    },
    {
      dealerId: 384934,
      name: "Dealer three",
      locations: [
        {
          locationId: 1,
          locationName: "Dealer three location one",
          isVatLocale: false,
        },
        {
          locationId: 2,
          locationName: "Dealer three location two",
          isVatLocale: true,
        },
      ],
    },
  ];
  res.status(200).json(dealersData);
});

// Endpoint to receive price data from webhook
app.post("/webhooks/prices", async (req, res) => {
  try {
    const priceData = req.body;

    // Validate the structure of the incoming data
    if (!Array.isArray(priceData)) {
      return res
        .status(400)
        .json({ error: "Invalid data format. Expected an array." });
    }

    // Store each price entry in the database
    await Promise.all(
      priceData.map(async (entry) => {
        const price = new Price(entry);
        await price.save();
      })
    );

    return res.status(201).json({ message: "Prices stored successfully." });
  } catch (error) {
    console.error("Error storing prices:", error);
    return res
      .status(500)
      .json({ error: "An internal server error occurred." });
  }
});

// Endpoint to retrieve all stored prices
app.get("/api/public/prices", async (req, res) => {
  try {
    const prices = await Price.find();
    return res.status(200).json(prices);
  } catch (error) {
    console.error("Error retrieving prices:", error);
    return res
      .status(500)
      .json({ error: "An internal server error occurred." });
  }
});

// Generate a random key
function generateRandomKey() {
  return Math.random().toString(36).substring(7);
}

// Helper function to generate client ID
const generateClientId = () => {
  // Generate a random string or use a more complex algorithm
  return "client_id_" + generateRandomKey();
};

// Helper function to generate client secret
const generateClientSecret = (randomKey) => {
  // Generate a random string or use a more complex algorithm
  return bcrypt.hashSync(randomKey, 10);
};

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
