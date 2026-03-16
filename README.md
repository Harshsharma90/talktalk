# 💬 ChatApp — WhatsApp Clone (React + Vite + Firebase)

A real-time chat application with phone OTP login, email login, contacts, and live messaging.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Firebase (REQUIRED)

#### Create a Firebase Project
1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → Name it (e.g. `chatapp`) → Continue
3. Disable Google Analytics (optional) → Create project

#### Enable Authentication
1. In Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** tab → Enable:
   - ✅ **Phone** (for OTP login)
   - ✅ **Email/Password** (for email login)

#### Enable Firestore Database
1. **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** (for development)
3. Select a region → Done

#### Enable Storage
1. **Storage** → **Get started**
2. Start in test mode → Choose region → Done

#### Get your Firebase Config
1. **Project Settings** (⚙️ gear icon) → **Your apps**
2. Click **</>** (Web) → Register app
3. Copy the `firebaseConfig` object

#### Update `src/firebase.js`
Replace the placeholder values:
```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

#### Set Firestore Security Rules
Go to **Firestore → Rules** and paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/contacts/{contactId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      match /messages/{msgId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

#### Set Storage Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### 3. Run the app
```bash
npm run dev
```

Open **http://localhost:5173**

---

## 📱 Features

| Feature | Description |
|---------|-------------|
| 📱 Phone Login | Enter mobile number → receive OTP → verify |
| ✉️ Email Login | Sign in or sign up with email + password |
| 👤 Profile Setup | Set name, status, upload avatar photo |
| 👥 Add Contacts | Search users by phone number or email |
| 💬 Real-time Chat | Messages sync instantly via Firestore |
| 🟢 Online Status | See who's online in real time |
| 😊 Emoji Picker | Full emoji picker in chat |
| ✓✓ Read Receipts | Blue ticks when messages are read |
| 🔔 System Messages | Notification when a contact is added |
| 🔍 Search Contacts | Filter your contact list |

---

## 🗂️ Project Structure

```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginPage.jsx     # Phone + Email login tabs
│   │   ├── OtpPage.jsx       # 6-digit OTP input
│   │   └── ProfileSetup.jsx  # Name, status, avatar
│   ├── Chat/
│   │   └── ChatWindow.jsx    # Message list + input
│   └── Dashboard/
│       ├── Dashboard.jsx     # Main layout + sidebar
│       └── AddContactModal.jsx
├── context/
│   └── AuthContext.jsx       # Firebase auth state
├── utils/
│   └── firestore.js          # Firestore helper functions
├── firebase.js               # ⚠️ Add your config here
├── App.jsx                   # Routes
├── main.jsx
└── index.css                 # All styles
```

---

## 🛠️ Tech Stack
- **React 18** + **Vite**
- **Firebase** (Auth, Firestore, Storage)
- **React Router v6**
- **react-hot-toast** for notifications
- **emoji-picker-react** for emoji panel
- **date-fns** for timestamp formatting

---

## ⚠️ Notes
- Phone OTP requires a real phone number (Firebase uses reCAPTCHA)
- For testing phone auth, add test numbers in Firebase Auth → Phone → Test phone numbers
- The app uses `+91` prefix by default (India). Change in `LoginPage.jsx` for other countries.
