const jwt = require('jsonwebtoken');
const tokenDB = require("../Token.js");

const getFreshTokens = async (refreshToken) => {
  if (!refreshToken) return null
  try {
    // Return if refresh token has been revoked
    const refreshTokenRevoked = await tokenDB.findOne({ signature: refreshToken.split('.')[2] })
    if (refreshTokenRevoked) return null;
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REF_SECRET, { ignoreExpiration: true });
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
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  } catch (err) {
    console.log(err)
    return null
  }
}

module.exports = { getFreshTokens }
