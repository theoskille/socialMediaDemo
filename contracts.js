const { db } = require('../util/admin');
const { response } = require('express');

exports.getAllContracts = (request,response) =>{
    db.collection('contracts').orderBy('createdAt','desc').get().then((data) => {
       let contracts=[];
       data.forEach((doc) => {
           contracts.push({
               contractId: doc.id,
               body: doc.data().body,
               userHandle: doc.data().userHandle,
               createdAt: doc.data().createdAt, 
               commentCount: doc.data().commentCount,
               likeCount: doc.data().likeCount,
               userImage: doc.data().userImage
           });
       });
       return response.json(contracts);
   }).catch((err) => console.error(err));
}

exports.postOneContract = (request,response) => {
	const newContract = {
		body: request.body.body,
        userHandle: request.user.handle,
        userImage: request.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
	};
	db.collection('contracts').add(newContract).then((doc) => {
        const resContract = newContract;
        resContract.contractId = doc.id;
		response.json(resContract);
	}).catch((err) => {
		response.status(500).json({error: 'something went wrong'});
		console.error(err);
	});
 }

 exports.getContract = (req, res) => {
    let contractData = {};
    db.doc(`/contracts/${req.params.contractId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Contract not found' });
        }else{
        contractData = doc.data();
        contractData.contractId = doc.id;
        return db
          .collection('comments')
          .orderBy('createdAt', 'desc')
          .where('contractId', '==', req.params.contractId)
          .get();
        }
      })
      .then((data) => {
        contractData.comments = [];
        data.forEach((doc) => {
          contractData.comments.push(doc.data());
        });
        return res.json(contractData);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };

  //comment on a contract
exports.commentOnContract = (req, res) => {
    if (req.body.body.trim() === '')
      return res.status(400).json({ comment: 'Must not be empty' });
  
    const newComment = {
      body: req.body.body,
      createdAt: new Date().toISOString(),
      contractId: req.params.contractId,
      userHandle: req.user.handle,
      userImage: req.user.imageUrl
    };
    console.log(newComment);
  
    db.doc(`/contracts/${req.params.contractId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Contract not found' });
        }
        return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
      })
      .then(() => {
        return db.collection('comments').add(newComment);
      })
      .then(() => {
        res.json(newComment);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  };

 // Like a contract
exports.likeContract = (req, res) => {
    const likeDocument = db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .where('contractId', '==', req.params.contractId)
      .limit(1);
  
    const contractDocument = db.doc(`/contracts/${req.params.contractId}`);
  
    let contractData;
  
    contractDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          contractData = doc.data();
          contractData.contractId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'Contract not found' });
        }
      })
      .then((data) => {
        if (data.empty) {
          return db
            .collection('likes')
            .add({
              contractId: req.params.contractId,
              userHandle: req.user.handle
            })
            .then(() => {
              contractData.likeCount++;
              return contractDocument.update({ likeCount: contractData.likeCount });
            })
            .then(() => {
              return res.json(contractData);
            });
        } else {
          return res.status(400).json({ error: 'Contract already liked' });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };
  
  exports.unlikeContract = (req, res) => {
    const likeDocument = db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .where('contractId', '==', req.params.contractId)
      .limit(1);
  
    const contractDocument = db.doc(`/contracts/${req.params.contractId}`);
  
    let contractData;
  
    contractDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          contractData = doc.data();
          contractData.contractId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'Contract not found' });
        }
      })
      .then((data) => {
        if (data.empty) {
          return res.status(400).json({ error: 'Contract not liked' });
        } else {
          return db
            .doc(`/likes/${data.docs[0].id}`)
            .delete()
            .then(() => {
              contractData.likeCount--;
              return contractDocument.update({ likeCount: contractData.likeCount });
            })
            .then(() => {
              res.json(contractData);
            });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };

  // Delete a contract
exports.deleteContract = (req, res) => {
    const document = db.doc(`/contracts/${req.params.contractId}`);
    document
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Contract not found' });
        }
        if (doc.data().userHandle !== req.user.handle) {
          return res.status(403).json({ error: 'Unauthorized' });
        } else {
          return document.delete();
        }
      })
      .then(() => {
        res.json({ message: 'Contract deleted successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };