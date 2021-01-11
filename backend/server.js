import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
// import bcrypt from 'bcrypt-js'
// eventuellt byta ut bcrypt paketet 
import bcrypt from 'bcrypt-nodejs'

// to do
// create message variables

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/authAPI"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
mongoose.Promise = Promise

// Model
const User = mongoose.model("user", {
  name: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8, // this is not working - postman accepts shorter passwords
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
    // this is the unique identifier when the user logs in
  }
})


// Defines the port the app will run on. Defaults to 8080, but can be 
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

// middlewear authenticate User
const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header('Authorization'),
    })

    if (user) {
      req.user = user
      next()
    } else {
      res
        .status(401)
        .json({ loggedOut: true, message: 'Please try logging in again' })
    }
  } catch (err) {
    res
      .status(403)
      .json({ message: 'Access token is missing or wrong', errors: err })
  }
}

// Start defining your routes here
app.get('/', (req, res) => {
  res.send('Hello world')
})

// create user
// this is working
app.post('/users', async (req, res) => {
  try {
    const {name, email, password} = req.body
    const user = new User({ name, email, password: bcrypt.hashSync(password) })
    const saved = await user.save()
    res.status(201).json({ userId: saved._id, accessToken: saved.accessToken })
  } catch (err) {
    res.status(400).json({ message: 'Could not create user', errors: {
      message: err.message,
      error: err, 
    }, })
  }
})

// Secure endpoint, user needs to be logged in to access this.
// this is working
app.get('/users/:id/secret', authenticateUser);
app.get('/users/:id/secret', (req, res) => {
  const secretMessage = `'fun' message here ${req.user.name}`
  res.status(201).json({ secretMessage })
})

// log in user endpoint (POST)

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
