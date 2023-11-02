const dotenv = require('dotenv');
const express = require('express')
const port = 3000;
const mongoose = require('mongoose')
const authRouter = require('./routes/auth')
const homeRouter = require('./routes/home')
const tokenRouter = require('./routes/token')
const cookieParser = require('cookie-parser')

const app = express()

// Import .env file
dotenv.config();

// Connect to database
mongoose.connect("mongodb://localhost/timestampdb");

// Set view engine
app.set('view engine', 'ejs');

// Middleware
app.use(express.urlencoded({ extended: false}))
//app.use(express.json())
app.use(cookieParser());
app.use('/auth', authRouter)
app.use('/home', homeRouter)
app.use('/token', tokenRouter)

// Routes
app.get('/', (req, res) => {
  res.send('Homepage of timestamp backend')
})

// Create server and assign port
async function start() {
  try {
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`)
    })
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

// Start server
start()

