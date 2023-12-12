const dotenv = require('dotenv');
const express = require('express')
const userDB = require("../User.js");
const tokenDB = require("../Token.js");
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Import .env file
dotenv.config();

/* Routes */
// Send login form
router.get('/', (req, res) => {
	res.render('login');
});

// User sign up
router.post('/register', async (req, res) => {
  try {
		// Return if form fields are undefined
		const email = req.body.username;
		const password = req.body.password;
    if (!email || !password) {
      return res.status(400).send('All fields must be filled');
    }
    // Return if user already registered in database
    const userIsReg = await userDB.findOne({ email });
    if (userIsReg) {
      return res.status(400).send('This email is registered already');
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
		// Redirect to login page
		return res.redirect(302, '/auth');
  } catch (error) {
    console.log(error);
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
			return res.status(400).send('This account does not exist. Please register.');
		}
		// Return if password is incorrect
		const passMatched = await bcrypt.compare(password, registeredUser.password);
		if (!passMatched) {
			return res.status(401).send('Incorrect email or password');
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
		const cookieOptions = { httpOnly: true };
		res.cookie("accessToken", accessToken, cookieOptions);
		res.cookie("refreshToken", refreshToken, cookieOptions);
		// Response
		res.status(200).json(registeredUser);
    // TODO: Serve app
	} catch (err) {
		console.log(err);
	}
});

// User account deletion
router.delete('/remove', async (req, res) => {
	// Redirect to login if token is missing
	const token = req.cookies.token;
	if (!token) {
		return res.redirect(400, '/login');	
	}
	try {
		// Delete user if token is valid
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await userDB.findOneAndDelete({ _id: decoded.clientID });
		res.json(user);
	} catch (err) {
		// Invalid or expired token. Redirect to login.
		console.log(err);
		res.redirect(401, '/login');
	}
});

// User log out
router.delete('/signout', async (req, res) => {
  // Return if tokens are undefined
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.accessToken;
  if (!accessToken || !refreshToken) return res.status(400).send('Tokens undefined');
  try {
    // Verify access token
		const decode = jwt.verify(accessToken, process.env.JWT_SECRET);
    // Invalidate refresh token
    const result = await tokenDB.create({ clientID: decode.clientID, signature: refreshToken.split('.')[2] });
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    // JSON response
    return res.json(result);
  } catch (err) {
    console.log(err);
  }
});

module.exports = router

