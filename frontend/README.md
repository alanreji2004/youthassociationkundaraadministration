# St. Mary's Youth Association, Kundara - Administration Portal

A production-ready administrative dashboard portal built with React + Vite, Firebase, and CSS Modules. 

## Features

1. **Dashboard Overview**: Summary widgets showing real-time statistics (total members, gender distributions) and placeholders for future modules (Accounts, Events, System Logs).
2. **Real-time Member Registry**: Real-time Firestore subscription (`onSnapshot`) syncing additions across devices immediately.
3. **Fuzzy Search & Filters**: Instant multi-attribute search (Name, Mobile, Blood Group, Remarks, Address) and filters for Gender and Blood Group.
4. **Excel Import/Export**: 
   - **Template Generation**: One-click download of a standard bulk-import template file.
   - **Spreadsheet Parsing & Validation**: Real-time client-side preview with line-by-line validation, highlighting errors, showing stats (total/valid/invalid counts), and filtering out bad data before upload.
   - **Database Snapshot Export**: Instantly download the active registry state as `SMYA_Kundara_Members.xlsx`.
5. **Secure Transaction-safe Auto-increment**: Assigns gapless, ascending serial numbers (`#1`, `#2`, etc.) via Firestore transactions (`runTransaction`), maintaining consistency across concurrent devices.
6. **Authentication & Security**: Email/password authentication, route guards preventing unauthenticated access, and security rules restricting unauthorized database queries.
7. **Local Fallback Mode**: If Firestore environment parameters are not provided in `.env`, the app automatically switches to Local Mock Mode using `localStorage` for database actions, allowing direct local previewing.

---

## Technical Stack
- **Framework**: React 18 + Vite 8
- **Routing**: React Router DOM v6
- **Database**: Firestore Database
- **Auth**: Firebase Authentication
- **Styles**: CSS Modules (`.module.css`) for scoping
- **Spreadsheet parsing**: `xlsx` (SheetJS)
- **Spreadsheets download**: `file-saver`
- **Icons**: `react-icons`

---

## Directory Structure
```
frontend/
├── firestore.rules          # Database security configurations
├── package.json             # App scripts and dependencies
├── vite.config.js           # Vite builds setup
├── .env                     # Local environment keys template
├── .gitignore               # Ignored nodes/environment modules
├── public/                  # Static assets
└── src/
    ├── main.jsx             # Mounting target
    ├── App.jsx              # Wraps Router & context providers
    ├── styles/              
    │   ├── variables.css    # Typography, HSL colors, design tokens
    │   └── global.css       # Resets, baseline rules, skeleton anims
    ├── services/            
    │   ├── firebase.js      # Initializes live Firestore connection
    │   ├── authService.js   # Login ID mappings & Firebase auth/mock fallback
    │   └── memberService.js # Transactions-based auto-increment additions & sync
    ├── routes/              
    │   └── AppRoutes.jsx    # Guarded dashboard path declarations
    ├── hooks/               
    │   └── useAuth.jsx      # Context state consumers
    ├── utils/               
    │   └── excelUtils.js    # Sheet parsers, headers validator, downloads
    ├── components/          
    │   ├── RouteGuard.jsx   # Auth protection gatekeeper
    │   ├── Layout.jsx       # Side navbar, organization header, mobile drawer
    │   ├── Toast.jsx        # Unified toast notification context/hooks
    │   ├── ConfirmationModal.jsx # Accessibility-compliant confirmation modals
    │   ├── Toast.module.css
    │   ├── Layout.module.css
    │   └── ConfirmationModal.module.css
    └── pages/               
        ├── Login.jsx        # Login panel with fallback notices
        ├── Dashboard.jsx    # Stats widgets & locked expansion cards
        ├── Membership.jsx   # Table grid, sorting controls, pagination
        ├── AddMember.jsx    # Form cards & bulk excel file upload zone
        ├── Login.module.css
        ├── Dashboard.module.css
        ├── Membership.module.css
        └── AddMember.module.css
```

---

## Setup Instructions

### 1. Installation
Ensure you have [Node.js](https://nodejs.org/) installed, navigate into the project folder, and install all dependencies:
```bash
npm install
```

### 2. Configure Firebase Environment Variables
Create a `.env` file in the `frontend` root (based on the `.env` template) and fill in your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```
*Note: If these credentials are left blank, the portal runs in **Local Mock Mode** where data is stored in browser cache (`localStorage`) and credentials default to: ID: `admin` / Password: `jsoyaadmin`.*

### 3. Firebase Console Configuration
To activate live database connection:
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Under **Authentication**, enable the **Email/Password** sign-in method.
3. Add a user with Email: `admin@smya.org` (the portal automatically maps the entered username `admin` to this email format) and Password: `jsoyaadmin`.
4. Create a **Cloud Firestore** database.
5. In your Firestore Database, create an initial counter document to initialize the auto-increment:
   - Collection name: `metadata`
   - Document ID: `memberCounter`
   - Fields: `counterValue` (number) -> set to `0`

---

## Firestore Database Security Rules

Paste the following configurations under your **Firestore Database -> Rules** tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return true;
    }

    match /members/{memberId} {
      allow read, write: if isAuthenticated();
    }

    match /metadata/{metadataId} {
      allow read, write: if isAuthenticated();
    }

    match /fixedDeposits/{fdId} {
      allow read, write: if isAuthenticated();
    }

    match /fdTransactions/{txId} {
      allow read, write: if isAuthenticated();
    }

    match /fdEvents/{eventId} {
      allow read, write: if isAuthenticated();
    }

    match /fdNotes/{noteId} {
      allow read, write: if isAuthenticated();
    }

    match /fdDocuments/{docId} {
      allow read, write: if isAuthenticated();
    }

    match /fdAuditLogs/{logId} {
      allow read, write: if isAuthenticated();
    }

    match /financeReceipts/{receiptId} {
      allow read, write: if isAuthenticated();
    }

    match /financePayments/{paymentId} {
      allow read, write: if isAuthenticated();
    }

    match /financeEvents/{eventId} {
      allow read, write: if isAuthenticated();
    }

    match /financeEventDocuments/{docId} {
      allow read, write: if isAuthenticated();
    }

    match /financeEventNotes/{noteId} {
      allow read, write: if isAuthenticated();
    }

    match /financeAuditLogs/{logId} {
      allow read, write: if isAuthenticated();
    }

    match /financeReceiptCategories/{catId} {
      allow read, write: if isAuthenticated();
    }

    match /financePaymentCategories/{catId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

---

## Testing Locally
Run the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

- Sign in with Login ID `admin` and Password `jsoyaadmin`.
- Try adding a single member.
- Download the import template, populate it, and upload it in the Bulk Import section to preview valid/invalid records.
- Click **Export Excel** on the members list page to retrieve the spreadsheet snapshot.

---

## Production Deployment Guide

### Option 1: Firebase Hosting (Recommended)
1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to your Firebase account:
   ```bash
   firebase login
   ```
3. Initialize hosting in the `frontend` folder:
   ```bash
   firebase init
   ```
   - Select **Hosting: Configure files for Firebase Hosting**.
   - Select your existing Firebase project.
   - Set **public directory** to `dist` (Vite's output folder).
   - Configure as a **single-page app** (rewrite all URLs to `/index.html`) -> **Yes**.
   - Set up automatic builds and deploys with GitHub -> **No** (optional).
4. Run the production build:
   ```bash
   npm run build
   ```
5. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```

### Option 2: Vercel / Netlify / Static Host
1. Connect your repository to Vercel or Netlify.
2. Set build command to: `npm run build`
3. Set output directory to: `dist`
4. Define the Firestore API credentials as environment variables under the hosting provider's panel.
5. Add a redirects rule file (e.g., `_redirects` for Netlify or `vercel.json` for Vercel) to rewrite all routes to `/index.html` to avoid 404s on browser refreshes.
