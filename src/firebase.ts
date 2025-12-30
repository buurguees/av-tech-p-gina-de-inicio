// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAWZqAehMMT5S2w8I3hDnYEQx_1bNL8Tc",
  authDomain: "avtech-305e7.firebaseapp.com",
  projectId: "avtech-305e7",
  storageBucket: "avtech-305e7.firebasestorage.app",
  messagingSenderId: "862629395330",
  appId: "1:862629395330:web:d10b7ad3b204896254ad9b",
  measurementId: "G-96LEGT6079"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };

