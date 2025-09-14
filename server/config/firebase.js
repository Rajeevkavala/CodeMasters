const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length === 0) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccountKey) {
        // If service account key is provided as JSON string
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Use default credentials (for production with service account file)
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
      }
      
      console.log('✅ Firebase Admin SDK initialized successfully');
    }
    
    return admin;
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    // Don't throw error, just log it for development
    return null;
  }
};

// Verify Firebase ID token
const verifyFirebaseToken = async (idToken) => {
  try {
    const firebaseAdmin = initializeFirebase();
    if (!firebaseAdmin) {
      throw new Error('Firebase Admin not initialized');
    }
    
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error(`Firebase token verification failed: ${error.message}`);
  }
};

module.exports = {
  initializeFirebase,
  verifyFirebaseToken
};