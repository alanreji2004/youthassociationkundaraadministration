import { 
  collection, 
  doc, 
  runTransaction, 
  query, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "./firebase";
import { authService } from "./authService";

const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

// Local Fallback Storage Keys
const LOCAL_MEMBERS_KEY = "smya_members_list";
const LOCAL_COUNTER_KEY = "smya_member_counter";
const subscribers = new Set();

// Helper to get local members
const getLocalMembers = () => {
  const data = localStorage.getItem(LOCAL_MEMBERS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data).sort((a, b) => b.serialNumber - a.serialNumber);
  } catch (e) {
    return [];
  }
};

// Helper to save local members and notify
const saveLocalMembers = (members) => {
  localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
  notifySubscribers();
};

const notifySubscribers = () => {
  const members = getLocalMembers();
  subscribers.forEach((callback) => callback(members));
};

export const memberService = {
  /**
   * Subscribes to real-time member updates.
   * Calls onUpdate with list of members sorted descending by serialNumber.
   */
  subscribeMembers: (onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      subscribers.add(onUpdate);
      // Immediately send current cached list
      onUpdate(getLocalMembers());
      return () => {
        subscribers.delete(onUpdate);
      };
    }

    // Query members ordered by serialNumber descending
    const membersQuery = query(collection(db, "members"), orderBy("serialNumber", "desc"));
    
    return onSnapshot(membersQuery, (snapshot) => {
      const members = [];
      snapshot.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() });
      });
      onUpdate(members);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      if (onError) onError(error);
    });
  },

  /**
   * Adds a single member using a Firestore transaction to auto-increment the serial number.
   */
  addMember: async (memberData) => {
    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const members = getLocalMembers();
          let currentCounter = parseInt(localStorage.getItem(LOCAL_COUNTER_KEY) || "0", 10);
          const nextSerialNumber = currentCounter + 1;
          
          const newMember = {
            id: `mock-member-${Date.now()}`,
            serialNumber: nextSerialNumber,
            ...memberData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Update local members & counter
          members.unshift(newMember); // Insert at beginning (since desc order)
          localStorage.setItem(LOCAL_COUNTER_KEY, nextSerialNumber.toString());
          saveLocalMembers(members);
          resolve(newMember);
        }, 500);
      });
    }

    try {
      const result = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "metadata", "memberCounter");
        const counterSnap = await transaction.get(counterRef);
        
        let currentCounter = 0;
        if (counterSnap.exists()) {
          currentCounter = counterSnap.data().counterValue || 0;
        }

        const nextSerialNumber = currentCounter + 1;

        // Create a new member document reference
        const membersCollectionRef = collection(db, "members");
        const newMemberRef = doc(membersCollectionRef);

        const newMemberData = {
          serialNumber: nextSerialNumber,
          name: memberData.name.trim(),
          address: memberData.address.trim(),
          gender: memberData.gender,
          dob: memberData.dob,
          mobileNumber: memberData.mobileNumber.trim(),
          bloodGroup: memberData.bloodGroup,
          remarks: memberData.remarks ? memberData.remarks.trim() : "",
          createdAt: new Date().toISOString(), // Use ISO string or serverTimestamp. Since transactions are atomic, ISO string is fine and works offline-mode/locally.
          updatedAt: new Date().toISOString()
        };

        // Write the new member document
        transaction.set(newMemberRef, newMemberData);

        // Update the counter
        transaction.set(counterRef, { counterValue: nextSerialNumber }, { merge: true });

        return { id: newMemberRef.id, ...newMemberData };
      });

      return result;
    } catch (error) {
      console.error("Firestore transaction error while adding member:", error);
      throw new Error(`Failed to add member: ${error.message}`);
    }
  },

  /**
   * Bulk imports multiple members.
   * Runs inside a single transaction chunking to avoid 500-doc limit.
   */
  bulkImportMembers: async (membersList) => {
    if (membersList.length === 0) return;

    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const members = getLocalMembers();
          let currentCounter = parseInt(localStorage.getItem(LOCAL_COUNTER_KEY) || "0", 10);
          
          const importedList = [];
          membersList.forEach((memberData) => {
            currentCounter += 1;
            importedList.push({
              id: `mock-member-${Date.now()}-${currentCounter}`,
              serialNumber: currentCounter,
              name: memberData.name.trim(),
              address: memberData.address.trim(),
              gender: memberData.gender,
              dob: memberData.dob,
              mobileNumber: memberData.mobileNumber.trim(),
              bloodGroup: memberData.bloodGroup,
              remarks: memberData.remarks ? memberData.remarks.trim() : "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          });

          // Prepend in reverse to keep serial descending
          const updatedMembers = [...importedList.reverse(), ...members];
          localStorage.setItem(LOCAL_COUNTER_KEY, currentCounter.toString());
          saveLocalMembers(updatedMembers);
          resolve(importedList);
        }, 800);
      });
    }

    try {
      // Chunk imports in batches of 150 members to comfortably stay under Firestore's 500 operations per transaction limit (1 counter update + 150 writes = 151 operations)
      const chunkSize = 150;
      const chunks = [];
      for (let i = 0; i < membersList.length; i += chunkSize) {
        chunks.push(membersList.slice(i, i + chunkSize));
      }

      for (const chunk of chunks) {
        await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, "metadata", "memberCounter");
          const counterSnap = await transaction.get(counterRef);
          
          let currentCounter = 0;
          if (counterSnap.exists()) {
            currentCounter = counterSnap.data().counterValue || 0;
          }

          let startingSerial = currentCounter;
          const membersCollectionRef = collection(db, "members");

          for (const memberData of chunk) {
            startingSerial += 1;
            const newMemberRef = doc(membersCollectionRef);
            const newMemberData = {
              serialNumber: startingSerial,
              name: memberData.name.trim(),
              address: memberData.address.trim(),
              gender: memberData.gender,
              dob: memberData.dob,
              mobileNumber: memberData.mobileNumber.trim(),
              bloodGroup: memberData.bloodGroup,
              remarks: memberData.remarks ? memberData.remarks.trim() : "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            transaction.set(newMemberRef, newMemberData);
          }

          // Update counter doc with the final counter value for this chunk
          transaction.set(counterRef, { counterValue: startingSerial }, { merge: true });
        });
      }
    } catch (error) {
      console.error("Firestore transaction error during bulk import:", error);
      throw new Error(`Bulk import failed: ${error.message}`);
    }
  }
};
