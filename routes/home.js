const express = require('express');
const userDB = require("../User.js");
const multer = require('multer');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const fs = require('fs');

// Connect to AWS
AWS.config.loadFromPath('./credentials.json');
const s3 = new AWS.S3();
const bucketName = 'timestampdocsbucket';

// Set up middleware
const upload = multer({ dest: 'uploads/' })

// Routes
//
/* Upload a document to S3 */
router.post('/upload', upload.single('file'), async (req, res) => {
  // Validation
  const uploadFile = req.file;
  const token = req.cookies.accessToken;
  if (!uploadFile) return res.status(400).send('No upload file received');
  if (!token) return res.status(400).send('Token undefined');
  try {
    // Authentication
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userDB.findOne({ _id: decoded.clientID });
    // Get file contents
    fs.readFile(uploadFile.path, 'utf8', (err, data) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Error reading file');
      }
      if(!data) data = '';
      // Upload to s3
      const key = user._id + '/' + uploadFile.originalname; // TODO: add subdir for security reasons
      s3.upload(({ Bucket: bucketName, Key: key, Body: data }),
                   async function (err, data) {
                    if (err) throw err;
                    // Set doc metadata in user's account
                    for (const doc of user.documents) {
                      if (doc.title === uploadFile.originalname) return res.json(user.documents);
                    }
                    user.documents = [...user.documents, { title: uploadFile.originalname }];
                    await user.save();
                    // JSON response
                    return res.json(user.documents);
                  }
      );
    });
  } catch (err) {
    console.log(err);
  }
});

/* For test purposes only. TODO remove */
router.get('/', (req, res) => {
  res.render('login');
});

/* Open a document */
router.get('/open', async(req, res) => {
  // Validation
	const token = req.cookies.accessToken;
  const requestedDoc = req.query.name;
	if (!token || !requestedDoc) {
		return res.redirect(400, '/login');	
	}
	try {
    // Authentication
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await userDB.findOne({ _id: decoded.clientID });
    // Check that requested doc exists in user's account
    const docFound = () => {
      for (const savedDoc of user.documents) {
        if (savedDoc.title === requestedDoc) return true;
      }
      return false;
    };
    if (!docFound) return res.status(404).send('Requested document does not exist');
    // Get doc from S3
    const key = user._id + '/' + requestedDoc;
    s3.getObject({Bucket: bucketName, Key: key}, (err, data) => {
      if (err) throw err;
      return res.json(data.Body.toString());
    });
	} catch (err) {
		console.log(err);
	}
});

/* Get list of user's documents */
router.get('/list', async(req, res) => {
  // Validation
	const token = req.cookies.accessToken;
	if (!token) return res.status(400).send('Token undefined');
	try {
    // Authentication
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await userDB.findOne({ _id: decoded.clientID });
    // Get list
    const docs = user.documents;
		res.json(docs);
	} catch (err) {
    console.log(err.message);
    return res.status(400).send(err.message);
	}
});

/* Delete a document */
router.delete('/delete', async(req, res) => {
  // Validation
	const token = req.cookies.accessToken;
  const requestedDoc = req.query.name;
	if (!token || !requestedDoc) return res.status(400).send('Token or document name undefined');
	try {
    // Authentication
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await userDB.findOne({ _id: decoded.clientID });
    // Check if document exists
    const docIndex = () => {
      for (let i = 0; i < user.documents.length; i++) {
        if (user.documents[i].title === requestedDoc) return i;
      }
      return -1
    };
    if (docIndex < 0) return res.status(404).send('Document does not exist');
    // Delete doc from s3
    const key = user._id + '/' + requestedDoc;
    s3.deleteObject({ Bucket: bucketName, Key: key }, async(err, data) => {
      if (err) throw err;
      // Delete doc metadata from user's account
      user.documents.splice(docIndex, 1); 
      await user.save();
      return res.json(user.documents);
    });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router

