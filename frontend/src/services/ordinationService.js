import { 
  collection, 
  doc, 
  addDoc,
  updateDoc,
  deleteDoc,
  query, 
  orderBy, 
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;
const LOCAL_ORDINATIONS_KEY = "smya_ordinations_list";
const subscribers = new Set();

const getLocalOrdinations = () => {
  const data = localStorage.getItem(LOCAL_ORDINATIONS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } catch {
    return [];
  }
};

const saveLocalOrdinations = (ordinations) => {
  localStorage.setItem(LOCAL_ORDINATIONS_KEY, JSON.stringify(ordinations));
  notifySubscribers();
};

const notifySubscribers = () => {
  const ordinations = getLocalOrdinations();
  subscribers.forEach((callback) => callback(ordinations));
};

export const ordinationService = {
  subscribeOrdinations: (onUpdate) => {
    if (!isFirebaseConfigured) {
      subscribers.add(onUpdate);
      onUpdate(getLocalOrdinations());
      return () => {
        subscribers.delete(onUpdate);
      };
    }

    const ordinationRef = collection(db, "ordinations");
    const ordinationQuery = query(ordinationRef, orderBy("createdAt", "asc"));
    return onSnapshot(ordinationQuery, (snapshot) => {
      const ordinations = [];
      snapshot.forEach((docSnap) => {
        ordinations.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(ordinations);
    });
  },

  addRegistration: async (data) => {
    const newReg = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      paid: !!data.paid,
      checkInStatus: data.checkInStatus || "Pending",
      createdAt: new Date().toISOString()
    };

    if (!isFirebaseConfigured) {
      const list = getLocalOrdinations();
      const item = { id: `ord-${Date.now()}`, ...newReg };
      list.push(item);
      saveLocalOrdinations(list);
      return item;
    }

    const docRef = await addDoc(collection(db, "ordinations"), newReg);
    return { id: docRef.id, ...newReg };
  },

  updateRegistration: async (id, data) => {
    const updatedFields = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      paid: !!data.paid,
      checkInStatus: data.checkInStatus || "Pending"
    };

    if (!isFirebaseConfigured) {
      const list = getLocalOrdinations();
      const idx = list.findIndex(item => item.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updatedFields };
        saveLocalOrdinations(list);
      }
      return { id, ...updatedFields };
    }

    const docRef = doc(db, "ordinations", id);
    await updateDoc(docRef, updatedFields);
    return { id, ...updatedFields };
  },

  deleteRegistration: async (id) => {
    if (!isFirebaseConfigured) {
      const list = getLocalOrdinations();
      const filtered = list.filter(item => item.id !== id);
      saveLocalOrdinations(filtered);
      return;
    }

    const docRef = doc(db, "ordinations", id);
    await deleteDoc(docRef);
  }
};
