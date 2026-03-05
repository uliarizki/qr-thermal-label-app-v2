/**
 * Test Firebase Connection and Create Admin User
 * 
 * This script tests Firebase connection and creates the first admin user.
 * Run with: node scripts/testFirebase.js
 */

import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';

// Load environment variables from .env file
dotenv.config();

// Firebase config from environment
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('🔥 Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testConnection() {
    try {
        console.log('\n✅ Firebase initialized successfully!');
        console.log('Project ID:', firebaseConfig.projectId);

        // Test Firestore connection
        console.log('\n📊 Testing Firestore connection...');
        const testCollection = collection(db, 'test');
        await getDocs(testCollection);
        console.log('✅ Firestore connection successful!');

        return true;
    } catch (error) {
        console.error('❌ Firebase connection failed:', error.message);
        return false;
    }
}

async function createAdminUser(username, password, displayName) {
    try {
        console.log('\n👤 Creating admin user...');
        console.log('Username:', username);

        // Convert username to email format (same as firebaseAuthService)
        const email = username.includes('@') ? username : `${username}@bintangmas.local`;

        console.log('Email (internal):', email);

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('✅ User created in Firebase Auth');
        console.log('UID:', user.uid);

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: email,
            username: displayName,
            role: 'admin',
            createdAt: new Date(),
            lastLogin: new Date()
        });

        console.log('✅ User profile created in Firestore');
        console.log('\n🎉 Admin user created successfully!');
        console.log('You can now login with:');
        console.log('  Username:', username);
        console.log('  Password: [the password you provided]');

        return true;
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('⚠️  User already exists with this username');
        } else {
            console.error('❌ Failed to create admin user:', error.message);
            console.error('Error code:', error.code);
        }
        return false;
    }
}

async function main() {
    console.log('🚀 Firebase Test & Admin User Creation\n');
    console.log('='.repeat(50));

    // Test connection first
    const connected = await testConnection();

    if (!connected) {
        console.log('\n❌ Cannot proceed without Firebase connection');
        process.exit(1);
    }

    // Create admin user
    console.log('\n' + '='.repeat(50));

    // You can change these values
    const adminUsername = 'admin'; // Just username, will be converted to admin@bintangmas.local
    const adminPassword = 'admin123456'; // Change this to a secure password!

    await createAdminUser(adminUsername, adminPassword, adminUsername);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed!');
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
