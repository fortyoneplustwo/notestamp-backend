//
// NOTE:
// 
// This file is not used anymore since token refresh is no longer done via api enpoint.
// But keep this file for future reference

const express = require('express');
const userDB = require("../User.js");
const tokenDB = require("../Token.js");
const router = express.Router();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
// Import .env file
dotenv.config();

/*
 * Provides new access and refresh tokens
 */
router.get('/refresh', async(req, res) => {
  console.log('starting refresh')
  // Validation
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  if(!accessToken || !refreshToken) return res.status(400).send('Token missing');
  try {
    // Return if refresh token has been revoked
    const isRevoked = await tokenDB.findOne({ signature: refreshToken.split('.')[2] })
    if (isRevoked) return res.status(400).send('Refresh token is invalid');
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REF_SECRET);
    // Renew access and refresh tokens
    const newAccessToken = jwt.sign(
      { clientID: decoded.clientID },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    const newRefreshToken = jwt.sign(
      { clientID: decoded.clientID },
      process.env.JWT_REF_SECRET,
      { expiresIn: process.env.JWT_REF_EXPIRES_IN }
    );
    // Set cookies
    const cookieOptions = { httpOnly: true, secure: true, maxAge: 50*1000 };
    res.cookie("accessToken", newAccessToken, cookieOptions);
    res.cookie("refreshToken", newRefreshToken, cookieOptions);
    // JSON response
    const user = await userDB.findOne({ _id: decoded.clientID });
    return res.status(200).send('Token refresh successful');
  } catch(error) { 
    console.log(error)
  }
});

module.exports = router

