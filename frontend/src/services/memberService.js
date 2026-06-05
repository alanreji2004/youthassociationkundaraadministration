import { 
  collection, 
  doc, 
  runTransaction, 
  query, 
  orderBy, 
  onSnapshot,
  updateDoc,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "./firebase";

const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;


const LOCAL_MEMBERS_KEY = "smya_members_list";
const LOCAL_COUNTER_KEY = "smya_member_counter";
const subscribers = new Set();


const getLocalMembers = () => {
  const data = localStorage.getItem(LOCAL_MEMBERS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data).sort((a, b) => b.serialNumber - a.serialNumber);
  } catch {
    return [];
  }
};


const saveLocalMembers = (members) => {
  localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
  notifySubscribers();
};

const notifySubscribers = () => {
  const members = getLocalMembers();
  subscribers.forEach((callback) => callback(members));
};

export const memberService = {
  
  subscribeMembers: (onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      subscribers.add(onUpdate);
      
      onUpdate(getLocalMembers());
      return () => {
        subscribers.delete(onUpdate);
      };
    }

    
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
            status: "Active",
            ...memberData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          
          members.unshift(newMember); 
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
          status: "Active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        
        transaction.set(newMemberRef, newMemberData);

        
        transaction.set(counterRef, { counterValue: nextSerialNumber }, { merge: true });

        return { id: newMemberRef.id, ...newMemberData };
      });

      return result;
    } catch (error) {
      console.error("Firestore transaction error while adding member:", error);
      throw new Error(`Failed to add member: ${error.message}`, { cause: error });
    }
  },

  
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
              status: "Active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          });

          
          const updatedMembers = [...importedList.reverse(), ...members];
          localStorage.setItem(LOCAL_COUNTER_KEY, currentCounter.toString());
          saveLocalMembers(updatedMembers);
          resolve(importedList);
        }, 800);
      });
    }

    try {
      
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
              status: "Active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            transaction.set(newMemberRef, newMemberData);
          }

          
          transaction.set(counterRef, { counterValue: startingSerial }, { merge: true });
        });
      }
    } catch (error) {
      console.error("Firestore transaction error during bulk import:", error);
      throw new Error(`Bulk import failed: ${error.message}`, { cause: error });
    }
  },

  
  updateMember: async (memberId, memberData) => {
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const members = getLocalMembers();
          const idx = members.findIndex((m) => m.id === memberId);
          if (idx === -1) {
            reject(new Error("Member not found in local registry."));
            return;
          }
          members[idx] = {
            ...members[idx],
            name: memberData.name.trim(),
            address: memberData.address.trim(),
            gender: memberData.gender,
            dob: memberData.dob,
            mobileNumber: memberData.mobileNumber.trim(),
            bloodGroup: memberData.bloodGroup,
            remarks: memberData.remarks ? memberData.remarks.trim() : "",
            status: memberData.status || "Active",
            updatedAt: new Date().toISOString()
          };
          saveLocalMembers(members);
          resolve(members[idx]);
        }, 500);
      });
    }

    try {
      const memberRef = doc(db, "members", memberId);
      const updateData = {
        name: memberData.name.trim(),
        address: memberData.address.trim(),
        gender: memberData.gender,
        dob: memberData.dob,
        mobileNumber: memberData.mobileNumber.trim(),
        bloodGroup: memberData.bloodGroup,
        remarks: memberData.remarks ? memberData.remarks.trim() : "",
        status: memberData.status || "Active",
        updatedAt: new Date().toISOString()
      };
      await updateDoc(memberRef, updateData);
      return { id: memberId, ...updateData };
    } catch (error) {
      console.error("Firestore update error:", error);
      throw new Error(`Failed to update member details: ${error.message}`, { cause: error });
    }
  },

  
  toggleMemberStatus: async (memberId, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const members = getLocalMembers();
          const idx = members.findIndex((m) => m.id === memberId);
          if (idx === -1) {
            reject(new Error("Member not found in local registry."));
            return;
          }
          members[idx].status = nextStatus;
          members[idx].updatedAt = new Date().toISOString();
          saveLocalMembers(members);
          resolve(members[idx]);
        }, 500);
      });
    }

    try {
      const memberRef = doc(db, "members", memberId);
      await updateDoc(memberRef, { 
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      return { id: memberId, status: nextStatus };
    } catch (error) {
      console.error("Firestore status toggle error:", error);
      throw new Error(`Failed to toggle member status: ${error.message}`, { cause: error });
    }
  },

  
  deleteAllMembers: async () => {
    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify([]));
          localStorage.setItem(LOCAL_COUNTER_KEY, "0");
          notifySubscribers();
          resolve();
        }, 600);
      });
    }

    try {
      const counterRef = doc(db, "metadata", "memberCounter");
      const membersQuery = query(collection(db, "members"));
      const querySnapshot = await getDocs(membersQuery);
      
      const docs = querySnapshot.docs;
      const chunkSize = 400; 
      
      for (let i = 0; i < docs.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + chunkSize);
        chunk.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }

      
      const batchFinal = writeBatch(db);
      batchFinal.set(counterRef, { counterValue: 0 }, { merge: true });
      await batchFinal.commit();
    } catch (error) {
      console.error("Firestore reset error:", error);
      throw new Error(`Failed to wipe registry: ${error.message}`, { cause: error });
    }
  },

  
  deleteAllMembersWithAuth: async (password) => {
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (password === "jsoyaadmin") {
            localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify([]));
            localStorage.setItem(LOCAL_COUNTER_KEY, "0");
            notifySubscribers();
            resolve();
          } else {
            reject(new Error("Incorrect password. Wipe database aborted."));
          }
        }, 600);
      });
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No authenticated session found.");
      }

      
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      
      await memberService.deleteAllMembers();
    } catch (error) {
      console.error("Authentication/wipe error:", error);
      let friendlyError = error.message;
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        friendlyError = "Incorrect password. Wipe database aborted.";
      }
      throw new Error(friendlyError, { cause: error });
    }
  }
};
