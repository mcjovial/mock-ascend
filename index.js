// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// MongoDB connection setup
mongoose.connect('mongodb://localhost:27017/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

// Create a schema for the user model
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  client_id: String,
  client_secret: String,
  timestamps: { type: Date, default: Date.now }
});

// Create a model for the user
const User = mongoose.model('User', userSchema);

// Middleware setup
app.use(bodyParser.json());

// Route to handle user registration
app.post('/register', async (req, res) => {
  try {
    const { username, email } = req.body;
    const client_id = generateClientId();
    const client_secret = generateClientSecret();
    const user = new User({ username, email, client_id, client_secret });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to generate authentication token
app.post('/token', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;
    const user = await User.findOne({ client_id });
    if (!user || !bcrypt.compareSync(client_secret, user.client_secret)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ client_id: user.client_id }, 'your_secret_key');
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, 'your_secret_key', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.client_id = decoded.client_id;
    next();
  });
};

// Route to get user details
app.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ client_id: req.client_id });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get dealers data
app.get('/dealers', verifyToken, (req, res) => {
  const dealersData = [
    {
      dealerId: 594939,
      name: 'Dealer one',
      locations: [
        {
          locationId: 1,
          locationName: 'Dealer one location one',
          isVatLocale: true
        }
      ]
    },
    {
      dealerId: 493849,
      name: 'Dealer two',
      locations: [
        {
          locationId: 1,
          locationName: 'Dealer two location one',
          isVatLocale: true
        }
      ]
    },
    {
      dealerId: 384934,
      name: 'Dealer three',
      locations: [
        {
          locationId: 1,
          locationName: 'Dealer three location one',
          isVatLocale: false
        },
        {
          locationId: 2,
          locationName: 'Dealer three location two',
          isVatLocale: true
        }
      ]
    }
  ];
  res.status(200).json(dealersData);
});

// Helper function to generate client ID
const generateClientId = () => {
  // Generate a random string or use a more complex algorithm
  return 'client_id_' + Math.random().toString(36).substring(7);
};

// Helper function to generate client secret
const generateClientSecret = () => {
  // Generate a random string or use a more complex algorithm
  return bcrypt.hashSync(Math.random().toString(36).substring(7), 10);
};

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
