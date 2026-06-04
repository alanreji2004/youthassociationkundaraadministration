import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

// Determine if Firebase is fully configured
const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

// Mock session key for local fallback
const LOCAL_SESSION_KEY = "smya_admin_session";
const listeners = new Set();

let currentMockUser = null;

// Initialize mock user from localStorage if it exists
if (!isFirebaseConfigured) {
  const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
  if (savedSession) {
    try {
      currentMockUser = JSON.parse(savedSession);
    } catch (e) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  }
}

const notifyListeners = (user) => {
  listeners.forEach((callback) => callback(user));
};

export const authService = {
  /**
   * Log in the user.
   * Maps 'admin' Login ID to email 'admin@smya.org' for Firebase Auth.
   * Falls back to local credentials if Firebase is not configured.
   */
  login: async (loginId, password) => {
    // Standard credential checks
    const mappedEmail = loginId === "admin" ? "admin@smya.org" : loginId;

    if (!isFirebaseConfigured) {
      // Fallback local auth mock
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (loginId === "admin" && password === "jsoyaadmin") {
            const user = {
              uid: "mock-admin-uid",
              email: "admin@smya.org",
              displayName: "SMYA Admin (Local Mode)",
              isMock: true
            };
            currentMockUser = user;
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
            notifyListeners(user);
            resolve(user);
          } else {
            reject(new Error("Invalid Login ID or Password. Please try again."));
          }
        }, 500); // simulate network delay
      });
    }

    // Live Firebase authentication
    try {
      const userCredential = await signInWithEmailAndPassword(auth, mappedEmail, password);
      return userCredential.user;
    } catch (error) {
      console.error("Firebase authentication error:", error);
      let friendlyMessage = "Failed to sign in. Please verify your credentials.";
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        friendlyMessage = "Invalid Login ID or Password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        friendlyMessage = "Invalid format. Please enter a valid Login ID.";
      }
      throw new Error(friendlyMessage);
    }
  },

  /**
   * Log out current user.
   */
  logout: async () => {
    if (!isFirebaseConfigured) {
      currentMockUser = null;
      localStorage.removeItem(LOCAL_SESSION_KEY);
      notifyListeners(null);
      return;
    }
    await signOut(auth);
  },

  /**
   * Get the current authenticated user.
   */
  getCurrentUser: () => {
    if (!isFirebaseConfigured) {
      return currentMockUser;
    }
    return auth.currentUser;
  },

  /**
   * Subscribe to authentication state changes.
   */
  onAuthStateChange: (callback) => {
    if (!isFirebaseConfigured) {
      listeners.add(callback);
      // Immediately call with initial state
      callback(currentMockUser);
      return () => {
        listeners.delete(callback);
      };
    }

    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  },

  /**
   * Helper check to display warning banners if running in fallback mode.
   */
  isFallbackMode: () => {
    return !isFirebaseConfigured;
  }
};
