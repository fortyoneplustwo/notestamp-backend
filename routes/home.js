const express = require('express');
const multer = require('multer');
const userDB = require("../User.js");
const router = express.Router();
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const token = require('./tokenRefresh.js');

// Connect to AWS
AWS.config.loadFromPath('./credentials.json');
const s3 = new AWS.S3();
const bucketName = 'timestampdocsbucket';

// multipart form data middleware
const upload = multer()

// Save project metadata to db and upload content and media to s3.
router.post('/upload', upload.single('mediaFile'), async (req, res) => {
  const postAuthSaveWithMediaFile = async decoded => {
    try {
      // Attempt content upload to s3. On success, attempt media upload to s3.
      const user = await userDB.findOne({ _id: decoded.clientID });
      const contentKey = `${user._id}/${metadata.title}.stmp`
      s3.upload(({ Bucket: bucketName, Key: contentKey, Body: content }), async (err, _) => {
        if (err) throw err

        if (mediaFile) {
          const mediaKey = `${user._id}/${metadata.title}.${metadata.mimetype.split('/')[1]}`
          s3.upload(({ Bucket: bucketName, Key: mediaKey, Body: mediaFile.buffer }), async (err, _) => {
            if (err) {
              s3.deleteObject({ Bucket: bucketName, Key: contentKey }, async(err, _) => {
                if (err) throw err
              });
              throw err
            }
          })
        }

        // Update db 
        const projectIndex = user.documents.findIndex(project => project.title === metadata.title)
        if (projectIndex !== -1) user.documents.splice(projectIndex, 1)
        user.documents = [ metadata, ...user.documents]
        await user.save()
        return res.status(200).send(user.documents)
      })
    } catch (err) {
      res.status(500).send(err.message)
    }
  } 

  // Validation
  const metadata = JSON.parse(req.body.metadata)
  const content = req.body.content
  const mediaFile = req.file
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  if (!metadata || content === null) return res.status(400).send('Upload file(s) missing from request');
  if (!accessToken || !refreshToken) return res.status(400).send('Token undefined');

  // JWT authentication
	try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
    postAuthSaveWithMediaFile(decoded)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true })
      token.getFreshTokens(refreshToken)
        .then(result => {
          if (!result) return res.status(401).send('Token revoked')
          const options = { httpOnly: true, /* secure: true, */ maxAge: 60*60*1000 }
          res.cookie('accessToken', result.accessToken, options)
          res.cookie('refreshToken' ,result.refreshToken, options)
          postAuthSaveWithMediaFile(decoded)
        })
    } else {
      return res.status(401).send(err.message)
    }
  }
})


// Return a project from user's directory i.e. the metadata, notes content 
// and (possibly) a media stream endpoint.
router.get('/open', async(req, res) => {
  async function postAuthGetProjectData(decoded) {
    try {
      // Get project from db
      const user = await userDB.findOne({ _id: decoded.clientID });
      const project = user.documents.find(proj => proj.title === filename)
      if (!project) return res.status(404).send('Requested document does not exist');

      // Retrieve file from S3 bucket
      const key = user._id + '/' + filename + '.stmp'
      s3.getObject({Bucket: bucketName, Key: key}, (err, data) => {
        if (err) throw err;
        return res.status(200).json({
          metadata: { 
            ...project,
            src: project.type === 'audio' ? 'http://localhost:8080/home/stream-audio' : project.src
          },
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


// Return a media file from s3
router.get('/media-file/:filename', async(req, res) => {
  async function postAuthGetMediaFile(decoded) {
    try {
      // Get project from db
      const user = await userDB.findOne({ _id: decoded.clientID });
      const project = user.documents.find(proj => proj.title === filename)
      if (!project) return res.status(404).send('Requested document does not exist');

      // Retrieve file from S3 bucket
      const key = `${user._id}/${filename}.${project.mimetype.split('/')[1]}` 
      s3.getObject({Bucket: bucketName, Key: key}, (err, data) => {
        if (err) throw err;
        res.setHeader('Content-Type', data.ContentType);
        return res.status(200).send(data.Body)
      });
    } catch (err) {
      return res.status(500).send(err.message)
    }
  }

  // Validation
	const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  const { filename }= req.params
	if (!accessToken || !refreshToken || !filename) {
		return res.status(400).json('Either token expired or request parameters missing')
	}

  // JWT authentication
	try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
    postAuthGetMediaFile(decoded)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      token.getFreshTokens(refreshToken)
        .then(result => {
          if (!result) return res.status(401).send('Token revoked')
          const options = { httpOnly: true, secure: true, maxAge: 60*60*1000 }
          res.cookie('accessToken', result.accessToken, options)
          res.cookie('refreshToken' ,result.refreshToken, options)
          const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { 
            ignoreExpiration: true
          })
          postAuthGetMediaFile(decoded)
        })
    } else {
      return res.status(401).send(err.message)
    }
  }
});


// Return a media stream from s3
router.get('/stream-audio/:filename', async(req, res) => {
  const postAuthGetMediaStream = async () => {
    try {
      // Get project metadata from db
      const user = await userDB.findOne({ _id: decoded.clientID });
      const project = user.documents.find(proj => proj.title === filename)
      if (!project) return res.status(404).send('Requested document does not exist');

      // Get audio file from s3 and create a stream
      const key = `${user._id}/${filename}.${project.mimetype.split('/')[1]}`
      const s3Stream = s3.getObject({Bucket: bucketName, Key: key})
      .createReadStream()
      .on('error', error => {
        if (error) return res.status(500).send(error.message)
      })

      // Return stream 
      res.set({
        'Content-Type': project.mimetype,
      })

      s3Stream.pipe(res)
    } catch (err) {
      return res.status(500).send(err.message)
    }
  }

  // Validation
	const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  const { filename } = req.params
	if (!accessToken || !refreshToken || !filename) {
		return res.status(400).json('Either token expired or request parameters missing')
	}

  // JWT authentication
  let decoded = null
	try {
    decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
    postAuthGetMediaStream()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      try {
        const newTokens = await token.getFreshTokens(refreshToken)
        if (!result) return res.status(401).send('Token revoked')
        const options = { httpOnly: true, secure: true, maxAge: 60*60*1000 }
        res.cookie('accessToken', newTokens.accessToken, options)
        res.cookie('refreshToken' ,newTokens.refreshToken, options)
        decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true })
        postAuthGetMediaStream()
      } catch (error) {
        return res.status(401).send(error.message)
      }
    } else {
      return res.status(401).send(err.message)
    }
  }
})


// Return a list of user's projects
router.get('/list', async(req, res) => {
  async function postAuthGetProjectsDir(decoded) {
    try {
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


// Delete a project and return the updated directory.
router.delete('/delete', async(req, res) => {
  async function postAuthProjectDelete(decoded) {
    try {
      // Check that project exists in user's directory
      const user = await userDB.findOne({ _id: decoded.clientID });
      const projectIndex = user.documents.findIndex(proj => proj.title === filename)
      if (projectIndex < 0) return res.status(404).send('Project does not exist');

      // Delete content and media from s3. If success, delete project from db.
      const contentKey = user._id + '/' + filename + '.stmp'
      s3.deleteObject({ Bucket: bucketName, Key: contentKey }, async(err, _) => {
        if (err) throw err; // TODO: put content back into bucket?

        if (project.mimetype) {
          const mediaKey = `${user._id}/${filename}.${project.mimetype.split('/')[1]}`
          s3.deleteObject({ Bucket: bucketName, Key: mediaKey }, async(err, _) => {
            if (err) throw err // TODO: put content back?

            user.documents.splice(projectIndex, 1); 
            await user.save();
            return res.status(200).json(user.documents);
          })
        }
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

