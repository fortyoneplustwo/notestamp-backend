const dotenv = require('dotenv');
const express = require('express')
const userDB = require("../User.js");
const tokenDB = require("../Token.js");
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const token = require('./tokenRefresh.js')
// Import .env file
dotenv.config();


// User sign up
router.post('/register', async (req, res) => {
  try {
		// Return if form fields are undefined
		const email = req.body.username;
		const password = req.body.password;
    if (!email || !password) {
      return res.status(400).json('Missing field data')
    }
    // Return if user already registered in database
    const userIsReg = await userDB.findOne({ email });
    if (userIsReg) {
      return res.status(409).json('Account already registered')
		}
		// Hash password
		const saltRounds = 10;
		const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
		// Create user account
		const user = await userDB.create({ 
			email: email,
			password: hash,
			salt: salt
		});
		return res.status(200).send('Account created');
  } catch (error) {
    res.status(500).json(error.message)
  }
});

// User sign in
router.post('/signin', async (req, res) => {
	try {
		// Validation
		const email = req.body.username;
		const password = req.body.password;
		if (!(email && password)) {
			return res.status(400).send('Email and password cannot be empty');
		}
		// Return if user account does not exist
		const registeredUser = await userDB.findOne({ email });
		if (!registeredUser) {
			return res.status(404).send('This account does not exist. Please register.');
		}
		// Return if password is incorrect
		const passMatched = bcrypt.compare(password, registeredUser.password);
		if (!passMatched) {
			return res.status(401).send('Incorrect credentials');
		}
		// Authorization (generate tokens)
		const accessToken = jwt.sign({ clientID: registeredUser._id, email: email },
			       process.env.JWT_SECRET,
			       { expiresIn: process.env.JWT_EXPIRES_IN }
		);
		const refreshToken = jwt.sign({ clientID: registeredUser._id },
			       process.env.JWT_REF_SECRET,
			       { expiresIn: process.env.JWT_REF_EXPIRES_IN }
		);
		// Set cookie
		const cookieOptions = { httpOnly: true, /* secure: true, */ maxAge: 60*60*1000 };
		res.cookie("accessToken", accessToken, cookieOptions);
		res.cookie("refreshToken", refreshToken, cookieOptions);
		// Response ok
		res.status(200).json(
      { 
        email: registeredUser.email,
        directory: registeredUser.documents
      }
    )
	} catch (err) {
		return res.status(500).send(err.message);
	}
});

// User account deletion
router.delete('/remove', async (req, res) => {
  async function postAuthAccountDeletion(decoded) {
		// Delete user from db
    try {
      const user = await userDB.findOneAndDelete({ _id: decoded.clientID });
      res.status(200).send('Account deleted');
    } catch (err) {
      res.status(500).send(err.message) 
    }
  }

	// Redirect to login if token is missing
	const accessToken = req.cookies.accessToken;
	const refreshToken = req.cookies.refreshToken;
	if (!accessToken || !refreshToken) {
		return res.redirect(400, '/login');	
	}

  // JWT authentication
	try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
    postAuthAccountDeletion(decoded)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true })
      // Request fresh tokens 
      token.getFreshTokens(refreshToken)
        .then(result => {
          if (!result) return res.status(401).send('Token revoked')
          postAuthAccountDeletion(decoded)
        })
    } else {
      return res.status(401).send(err.message)
    }
  }
  ``
});

// User log out
router.delete('/signout', async (req, res) => {
  async function postAuthLogOut(decoded) {
    // Revoke refresh token by pushing it to token db
    const result = await tokenDB.create({ clientID: decoded.clientID, signature: refreshToken.split('.')[2] });
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    // JSON response
    return res.status(200).send('Signed out')
  }
  
  // Validation
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.accessToken;
  if (!accessToken || !refreshToken) return res.status(400).json('Tokens undefined');
  
  // JWT authentication
	try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
    postAuthLogOut(decoded)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true })
      // Request fresh tokens 
      // If suceeds, then the request is authorized
      token.getFreshTokens(refreshToken)
        .then(result => {
          if (!result) return res.status(401).send('Token revoked')
          postAuthLogOut(decoded)
        })
    } else {
      return res.status(401).send(err.message)
    }
  }
});

module.exports = router

