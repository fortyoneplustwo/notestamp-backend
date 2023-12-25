const express = require('express');
const userDB = require("../User.js");
const router = express.Router();
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const token = require('./tokenRefresh.js');

// Connect to AWS
AWS.config.loadFromPath('./credentials.json');
const s3 = new AWS.S3();
const bucketName = 'timestampdocsbucket';

// Upload a document to S3
router.post('/upload', async (req, res) => {
  async function postAuthSaveProject(decoded) {
    try { // Upload to bucket and save metadata in db
      const user = await userDB.findOne({ _id: decoded.clientID });
      const key = user._id + '/' + metadata.title; // generate unique file path
      s3.upload(({ Bucket: bucketName, Key: key, Body: content }),
         async function (err, _) {
          if (err) return res.status(500).send('Save failed')
          const withoutProj = user.documents.filter(proj => proj.title !== metadata.title)
          user.documents = [{ ...metadata }, ...withoutProj];
          await user.save();
          return res.status(200).send(user.documents)
        }
      );
    } catch (err) {
      res.status(500).send(err.message)
    }
  }

  // Validation
  // const stmp = req.body.content;
  // const title = req.body.metadata.title;
  const metadata = req.body.metadata
  const content = req.body.content
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  if (!metadata || content === null) return res.status(400).send('No upload file received');
  if (!accessToken || !refreshToken) return res.status(400).send('Token undefined');

  
  // JWT authentication
	try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
    postAuthSaveProject(decoded)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true })
      // Request fresh tokens
      token.getFreshTokens(refreshToken)
        .then(result => {
          if (!result) return res.status(401).send('Token revoked')
          const options = { httpOnly: true, /* secure: true, */ maxAge: 60*60*1000 }
          res.cookie('accessToken', result.accessToken, options)
          res.cookie('refreshToken' ,result.refreshToken, options)
          postAuthSaveProject(decoded)
        })
    } else {
      return res.status(401).send(err.message)
    }
  }
});


// Open a document
router.get('/open', async(req, res) => {
  async function postAuthGetProjectData(decoded) {
    // Check that requested doc exists in user's account
    try {
      const user = await userDB.findOne({ _id: decoded.clientID });
      const project = user.documents.find(proj => proj.title === filename)
      if (!project) return res.status(404).send('Requested document does not exist');

      // Retrieve file from S3 bucket
      const key = user._id + '/' + filename;
      s3.getObject({Bucket: bucketName, Key: key}, (err, data) => {
        if (err) throw err;
        return res.status(200).json({
          metadata: { ...project },
          content: data.Body.toString()
        })
      });
    } catch (err) {
      return res.status(500).send(err.message)
    }
  }

  // Validation
	const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  const filename = req.query.name;
	if (!accessToken || !refreshToken || !filename) {
		return res.status(400).json('Either token expired or request parameters missing')
	}

  // JWT authentication
	try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
    postAuthGetProjectData(decoded)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Request fresh tokens
      token.getFreshTokens(refreshToken)
        .then(result => {
          if (!result) return res.status(401).send('Token revoked')
          const options = { httpOnly: true, secure: true, maxAge: 60*60*1000 }
          res.cookie('accessToken', result.accessToken, options)
          res.cookie('refreshToken' ,result.refreshToken, options)
          const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { 
            ignoreExpiration: true
          })
          postAuthGetProjectData(decoded)
        })
    } else {
      return res.status(401).send(err.message)
    }
  }
});

// Get list of user's projects
router.get('/list', async(req, res) => {
  async function postAuthGetProjectsDir(decoded) {
    try {
    // Get list of projects
      const user = await userDB.findOne({ _id: decoded.clientID });
      const projects = user.documents;
      res.send(projects);
    } catch (err) {
      return res.status(500).send(err.message)
    }
  }

  // Validation
	const accessToken = req.cookies.accessToken;
	const refreshToken = req.cookies.refreshToken;
	if (!accessToken || !refreshToken) return res.status(400).send('Token undefined');

  // Authentication
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
    postAuthGetProjectsDir(decoded)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true });
      token.getFreshTokens(refreshToken)
        .then(result => {
          if (!result) return res.status(401).send('Token revoked')
          const cookieOptions = { httpOnly: true, /* secure: true, */ maxAge: 60*60*1000 }
          res.cookie('accessToken', accessToken, cookieOptions)
          res.cookie('refreshToken', refreshToken, cookieOptions)
          postAuthGetProjectsDir(decoded)
        })
    } else {
      return res.status(401).send(err.message)
    }
	}
});

// Delete a project
router.delete('/delete', async(req, res) => {
  async function postAuthProjectDelete(decoded) {
    try {
      // Check that project exists in user's directory
      const user = await userDB.findOne({ _id: decoded.clientID });
      const projectIndex = user.documents.findIndex(proj => proj.title === filename)
      if (projectIndex < 0) return res.status(404).send('Project does not exist');

      // Delete project from s3 bucket and user's directory
      const key = user._id + '/' + filename;
      s3.deleteObject({ Bucket: bucketName, Key: key }, async(err, _) => {
        if (err) throw err;
        user.documents.splice(projectIndex, 1); 
        await user.save();
        return res.status(200).json(user.documents); // return updated directory
      });
    } catch (err) { res.status(500).send(err.message) }
  }

  // Validation
	const accessToken = req.cookies.accessToken;
	const refreshToken = req.cookies.refreshToken;
  const filename = req.query.name;
	if (!accessToken || !refreshToken || !filename) { 
    return res.status(400).send('Either token or document name undefined');
  }

  // Authentication
	try {
		const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    postAuthProjectDelete(decoded)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      token.getFreshTokens(refreshToken)
        .then(result => {
          if (!result) return res.status(401).send('Refresh token revoked')
          const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { 
            ignoreExpiration: true 
          });
          const cookieOptions = { httpOnly: true, /* secure: true, */ maxAge: 60*60*1000 }
          res.cookie('accessToken', accessToken, cookieOptions)
          res.cookie('refreshToken', refreshToken, cookieOptions)
          postAuthProjectDelete(decoded)
        })
    } else {
      return res.status(401).send(err.message)
    }
  }
});

module.exports = router

