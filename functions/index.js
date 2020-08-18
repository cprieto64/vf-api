/* eslint-disable promise/always-return */
/* eslint-disable no-useless-escape */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
const dbStoresCollection = 'stores';

const express = require('express');
const cors = require('cors');
const app = express();

const crypto = require('crypto');
const cryptoKey = 'N^kM;C":.r.RF~2+'
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

app.use(cors({ origin: true }));

isEmpty = (obj) => {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}

// create
app.post('/', (req, res) => {
  (async () => {

    const {
      tenantId,
      storeName,
      storeSubDomain,
      storePhone,
      storeEmail,
    } = req.body;

    if (
      !tenantId ||
      typeof tenantId !== 'string' ||
      !storeName ||
      typeof storeName !== 'string' ||
      !storeSubDomain ||
      typeof storeSubDomain !== 'string' ||
      !storePhone ||
      typeof storePhone !== 'string' ||
      !storeEmail ||
      typeof storeEmail !== 'string' ||
      !emailRegex.test(String(storeEmail).toLowerCase())
    ) {

      res.status(400).json({
        message: 'Invalid fields for store creation.'
      });
    }

    let hash = crypto.createHmac('sha512', cryptoKey)
    hash.update(tenantId + '--' + storeName + '--' + storeSubDomain)
    const storeID = hash.digest('hex')

    req.body.storeReferenceID = storeID
    req.body.storeDateCreated = Date.now()
    
    try {
      await db.collection(dbStoresCollection).doc('/' + storeID + '/')
        .create(req.body);

      let processResponse = {
        message: 'Store created successfuly',
        storeData: req.body
      }

      res.status(201).json(processResponse);
    } catch (error) {

      console.log(error);
      res.status(500).json({
        message: error
      });      
    }
  })();
});

// read store data by storeReferenceID
app.get('/:storeReferenceID', (req, res) => {
  (async () => {

    if (!req.params.storeReferenceID || typeof req.params.storeReferenceID !== 'string') {
      let error = "Invalid Store Reference ID"

      res.status(400).json({
        message: error
      });      
    }

    try {

      let cityRef = db.collection(dbStoresCollection).doc(req.params.storeReferenceID);
      let getDoc = cityRef.get()
        .then(doc => {

          if (!doc.exists) {

            let message = 'This store does not exists'
            res.status(404).json({
              message: message
            }); 
          } else {

            const storeData = doc.data()
            delete storeData.tenantId

            res.json({
              storeData
            });
          }

        })
        .catch(err => {
          console.log('Error getting document', err);
        });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error
      }); 
    }
  })();
});

// delete store by storeReferenceID
app.delete('/:storeReferenceID', (req, res) => {
  (async () => {

    if (!req.params.storeReferenceID || typeof req.params.storeReferenceID !== 'string') {

      res.status(400).json({
        message: "Invalid Store ID"
      }); 
    }

    try {

      const document = db.collection(dbStoresCollection).doc(req.params.storeReferenceID);

      let item = await document.get();
      let response = item.data();

      if (!response) {

        res.status(404).json({
          message: 'This store does not exists'
        }); 
      } else {

        try {

          const document = db.collection(dbStoresCollection).doc(req.params.storeReferenceID);
          await document.delete();
    
          res.status(200).json({
            message: 'Store deleted successfuly'
          }); 
        } catch (error) {

          console.log(error);

          res.status(500).json({
            message: error
          }); 
        }
      }
    } catch (error) {

      console.log(error);
      res.status(500).json({
        message: error
      });       
    }
  })();
});

// update store by storeReferenceID
app.put('/:storeReferenceID', (req, res) => {
  (async () => {

    if (!req.params.storeReferenceID || typeof req.params.storeReferenceID !== 'string') {
      res.status(400).send("Invalid Store ID");
    }

    if (!req.body || isEmpty(req.body)) {
      res.status(400).send("Nothing to update for this store");
    }

    try {

      const storeID = req.params.storeReferenceID
      const document = db.collection(dbStoresCollection).doc(storeID);
      await document.update(req.body);

      let operationResponse = {
        message: 'Store updated successfuly',
        storeID: storeID
      }

      return res.status(200).send(operationResponse);

    } catch (error) {

      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

exports.stores = functions.https.onRequest(app);