const dotenv = require('dotenv');
const express = require('express')
const port = 8080
const cors = require('cors')
const mongoose = require('mongoose')
const authRouter = require('./routes/auth')
const homeRouter = require('./routes/home')
const cookieParser = require('cookie-parser')

const app = express()

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))

// Import .env file
dotenv.config();

// Connect to database
mongoose.connect("mongodb://localhost/timestampdb");

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true}))
app.use(cookieParser());
app.use('/auth', authRouter)
app.use('/home', homeRouter)

// Routes
app.get('/', (_, res) => {
  res.send('Homepage of notestamp backend')
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

