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
import { db, auth } from "./firebase";

const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

const LOCAL_FDS_KEY = "smya_fds_list";
const LOCAL_FD_TX_KEY = "smya_fd_tx_list";
const LOCAL_FD_EV_KEY = "smya_fd_ev_list";
const LOCAL_FD_NT_KEY = "smya_fd_nt_list";
const LOCAL_FD_DOC_KEY = "smya_fd_doc_list";
const LOCAL_FD_AUDIT_KEY = "smya_fd_audit_list";
const LOCAL_FD_COUNTER_KEY = "smya_fd_sequence_counter";

const fdSubscribers = new Set();
const txSubscribers = new Map();
const evSubscribers = new Map();
const ntSubscribers = new Map();
const docSubscribers = new Map();
const auditSubscribers = new Map();

const getLocalData = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const notifyFdListeners = () => {
  const fds = getLocalData(LOCAL_FDS_KEY);
  fdSubscribers.forEach((cb) => cb(fds));
};

const calculateFdStatus = (fd) => {
  if (fd.status === "Renewed") return "Renewed";
  if (fd.status === "Closed") return "Closed";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturity = new Date(fd.maturityDate);
  maturity.setHours(0, 0, 0, 0);

  if (today >= maturity) {
    return "Matured";
  }
  return "Active";
};

export const fdService = {
  subscribeFds: (onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      fdSubscribers.add(onUpdate);
      const data = getLocalData(LOCAL_FDS_KEY).map(fd => ({
        ...fd,
        status: calculateFdStatus(fd)
      }));
      onUpdate(data);
      return () => {
        fdSubscribers.delete(onUpdate);
      };
    }

    const q = query(collection(db, "fixedDeposits"), orderBy("maturityDate", "asc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const fd = { id: d.id, ...d.data() };
        fd.status = calculateFdStatus(fd);
        list.push(fd);
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeFdTransactions: (fdId, onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      if (!txSubscribers.has(fdId)) {
        txSubscribers.set(fdId, new Set());
      }
      txSubscribers.get(fdId).add(onUpdate);
      const list = getLocalData(LOCAL_FD_TX_KEY).filter(t => t.fdId === fdId);
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      onUpdate(list);
      return () => {
        const subs = txSubscribers.get(fdId);
        if (subs) {
          subs.delete(onUpdate);
          if (subs.size === 0) txSubscribers.delete(fdId);
        }
      };
    }

    const q = query(collection(db, "fdTransactions"), orderBy("date", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.fdId === fdId) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeFdEvents: (fdId, onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      if (!evSubscribers.has(fdId)) {
        evSubscribers.set(fdId, new Set());
      }
      evSubscribers.get(fdId).add(onUpdate);
      const list = getLocalData(LOCAL_FD_EV_KEY).filter(e => e.fdId === fdId);
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      onUpdate(list);
      return () => {
        const subs = evSubscribers.get(fdId);
        if (subs) {
          subs.delete(onUpdate);
          if (subs.size === 0) evSubscribers.delete(fdId);
        }
      };
    }

    const q = query(collection(db, "fdEvents"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.fdId === fdId) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeFdNotes: (fdId, onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      if (!ntSubscribers.has(fdId)) {
        ntSubscribers.set(fdId, new Set());
      }
      ntSubscribers.get(fdId).add(onUpdate);
      const list = getLocalData(LOCAL_FD_NT_KEY).filter(n => n.fdId === fdId);
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      onUpdate(list);
      return () => {
        const subs = ntSubscribers.get(fdId);
        if (subs) {
          subs.delete(onUpdate);
          if (subs.size === 0) ntSubscribers.delete(fdId);
        }
      };
    }

    const q = query(collection(db, "fdNotes"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.fdId === fdId) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeFdDocuments: (fdId, onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      if (!docSubscribers.has(fdId)) {
        docSubscribers.set(fdId, new Set());
      }
      docSubscribers.get(fdId).add(onUpdate);
      const list = getLocalData(LOCAL_FD_DOC_KEY).filter(d => d.fdId === fdId);
      list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      onUpdate(list);
      return () => {
        const subs = docSubscribers.get(fdId);
        if (subs) {
          subs.delete(onUpdate);
          if (subs.size === 0) docSubscribers.delete(fdId);
        }
      };
    }

    const q = query(collection(db, "fdDocuments"), orderBy("uploadedAt", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.fdId === fdId) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeFdAuditLogs: (fdId, onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      if (!auditSubscribers.has(fdId)) {
        auditSubscribers.set(fdId, new Set());
      }
      auditSubscribers.get(fdId).add(onUpdate);
      const list = getLocalData(LOCAL_FD_AUDIT_KEY).filter(a => a.fdId === fdId);
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      onUpdate(list);
      return () => {
        const subs = auditSubscribers.get(fdId);
        if (subs) {
          subs.delete(onUpdate);
          if (subs.size === 0) auditSubscribers.delete(fdId);
        }
      };
    }

    const q = query(collection(db, "fdAuditLogs"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.fdId === fdId) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  addFixedDeposit: async (fdData) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    
    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const fds = getLocalData(LOCAL_FDS_KEY);
          const fdNumber = fdData.fdNumber.trim();
          
          const newFd = {
            id: `local-fd-${Date.now()}`,
            fdNumber,
            bankName: fdData.bankName.trim(),
            branch: fdData.branch.trim(),
            principalAmount: parseFloat(fdData.principalAmount),
            interestRate: parseFloat(fdData.interestRate),
            depositDate: fdData.depositDate,
            maturityDate: fdData.maturityDate,
            maturityAmount: parseFloat(fdData.maturityAmount),
            remarks: fdData.remarks ? fdData.remarks.trim() : "",
            status: "Active",
            parentFdNumber: fdData.parentFdNumber || null,
            childFdNumber: null,
            createdBy: creator,
            createdAt: new Date().toISOString()
          };

          fds.push(newFd);
          localStorage.setItem(LOCAL_FD_COUNTER_KEY, nextVal.toString());
          saveLocalData(LOCAL_FDS_KEY, fds);

          const events = getLocalData(LOCAL_FD_EV_KEY);
          events.push({
            id: `local-ev-${Date.now()}`,
            fdId: newFd.id,
            timestamp: new Date().toISOString(),
            type: "FD Created",
            description: `Fixed Deposit record created by ${creator}`
          });
          saveLocalData(LOCAL_FD_EV_KEY, events);

          const txs = getLocalData(LOCAL_FD_TX_KEY);
          txs.push({
            id: `local-tx-${Date.now()}`,
            fdId: newFd.id,
            date: fdData.depositDate,
            type: "Deposit",
            description: "Initial principal investment amount",
            amount: parseFloat(fdData.principalAmount),
            referenceNumber: "AUTO",
            createdBy: creator
          });
          saveLocalData(LOCAL_FD_TX_KEY, txs);

          const audits = getLocalData(LOCAL_FD_AUDIT_KEY);
          audits.push({
            id: `local-aud-${Date.now()}`,
            fdId: newFd.id,
            timestamp: new Date().toISOString(),
            actionType: "Create",
            oldValue: null,
            newValue: JSON.stringify(newFd),
            user: creator
          });
          saveLocalData(LOCAL_FD_AUDIT_KEY, audits);

          notifyFdListeners();
          resolve(newFd);
        }, 500);
      });
    }

    try {
      const result = await runTransaction(db, async (transaction) => {
        const fdNumber = fdData.fdNumber.trim();
        const fdCollectionRef = collection(db, "fixedDeposits");
        const newFdRef = doc(fdCollectionRef);

        const newFdData = {
          fdNumber,
          bankName: fdData.bankName.trim(),
          branch: fdData.branch.trim(),
          principalAmount: parseFloat(fdData.principalAmount),
          interestRate: parseFloat(fdData.interestRate),
          depositDate: fdData.depositDate,
          maturityDate: fdData.maturityDate,
          maturityAmount: parseFloat(fdData.maturityAmount),
          remarks: fdData.remarks ? fdData.remarks.trim() : "",
          status: "Active",
          parentFdNumber: fdData.parentFdNumber || null,
          childFdNumber: null,
          createdBy: creator,
          createdAt: new Date().toISOString()
        };

        transaction.set(newFdRef, newFdData);

        const evRef = doc(collection(db, "fdEvents"));
        transaction.set(evRef, {
          fdId: newFdRef.id,
          timestamp: new Date().toISOString(),
          type: "FD Created",
          description: `Fixed Deposit record created by ${creator}`
        });

        const txRef = doc(collection(db, "fdTransactions"));
        transaction.set(txRef, {
          fdId: newFdRef.id,
          date: fdData.depositDate,
          type: "Deposit",
          description: "Initial principal investment amount",
          amount: parseFloat(fdData.principalAmount),
          referenceNumber: "AUTO",
          createdBy: creator
        });

        const auditRef = doc(collection(db, "fdAuditLogs"));
        transaction.set(auditRef, {
          fdId: newFdRef.id,
          timestamp: new Date().toISOString(),
          actionType: "Create",
          oldValue: null,
          newValue: JSON.stringify(newFdData),
          user: creator
        });

        return { id: newFdRef.id, ...newFdData };
      });

      return result;
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to create Fixed Deposit: ${err.message}`);
    }
  },

  updateFixedDeposit: async (fdId, updatedFields) => {
    const creator = auth.currentUser?.displayName || "Administrator";

    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const fds = getLocalData(LOCAL_FDS_KEY);
          const idx = fds.findIndex(f => f.id === fdId);
          if (idx === -1) {
            reject(new Error("FD not found"));
            return;
          }

          const oldVal = { ...fds[idx] };
          fds[idx] = {
            ...fds[idx],
            bankName: updatedFields.bankName.trim(),
            branch: updatedFields.branch.trim(),
            principalAmount: parseFloat(updatedFields.principalAmount),
            interestRate: parseFloat(updatedFields.interestRate),
            depositDate: updatedFields.depositDate,
            maturityDate: updatedFields.maturityDate,
            maturityAmount: parseFloat(updatedFields.maturityAmount),
            remarks: updatedFields.remarks ? updatedFields.remarks.trim() : ""
          };

          saveLocalData(LOCAL_FDS_KEY, fds);

          const audits = getLocalData(LOCAL_FD_AUDIT_KEY);
          audits.push({
            id: `local-aud-${Date.now()}`,
            fdId,
            timestamp: new Date().toISOString(),
            actionType: "Edit",
            oldValue: JSON.stringify(oldVal),
            newValue: JSON.stringify(fds[idx]),
            user: creator
          });
          saveLocalData(LOCAL_FD_AUDIT_KEY, audits);

          notifyFdListeners();
          resolve(fds[idx]);
        }, 500);
      });
    }

    try {
      const ref = doc(db, "fixedDeposits", fdId);
      const snap = await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(ref);
        if (!docSnap.exists()) {
          throw new Error("Fixed Deposit document does not exist.");
        }

        const oldData = docSnap.data();
        const nextData = {
          ...oldData,
          bankName: updatedFields.bankName.trim(),
          branch: updatedFields.branch.trim(),
          principalAmount: parseFloat(updatedFields.principalAmount),
          interestRate: parseFloat(updatedFields.interestRate),
          depositDate: updatedFields.depositDate,
          maturityDate: updatedFields.maturityDate,
          maturityAmount: parseFloat(updatedFields.maturityAmount),
          remarks: updatedFields.remarks ? updatedFields.remarks.trim() : ""
        };

        transaction.update(ref, nextData);

        const auditRef = doc(collection(db, "fdAuditLogs"));
        transaction.set(auditRef, {
          fdId,
          timestamp: new Date().toISOString(),
          actionType: "Edit",
          oldValue: JSON.stringify(oldData),
          newValue: JSON.stringify(nextData),
          user: creator
        });

        return nextData;
      });

      return snap;
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to update Fixed Deposit: ${err.message}`);
    }
  },

  renewFixedDeposit: async (fdId, renewalData) => {
    const creator = auth.currentUser?.displayName || "Administrator";

    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const fds = getLocalData(LOCAL_FDS_KEY);
          const idx = fds.findIndex(f => f.id === fdId);
          if (idx === -1) {
            reject(new Error("FD not found"));
            return;
          }

          const newFdNumber = renewalData.fdNumber.trim();
          const oldFd = fds[idx];
          const parentNumber = oldFd.fdNumber;
          oldFd.status = "Renewed";
          oldFd.childFdNumber = newFdNumber;

          const newFd = {
            id: `local-fd-${Date.now()}`,
            fdNumber: newFdNumber,
            bankName: renewalData.bankName.trim(),
            branch: renewalData.branch.trim(),
            principalAmount: parseFloat(renewalData.principalAmount),
            interestRate: parseFloat(renewalData.interestRate),
            depositDate: renewalData.depositDate,
            maturityDate: renewalData.maturityDate,
            maturityAmount: parseFloat(renewalData.maturityAmount),
            remarks: renewalData.remarks ? renewalData.remarks.trim() : "",
            status: "Active",
            parentFdNumber: parentNumber,
            childFdNumber: null,
            createdBy: creator,
            createdAt: new Date().toISOString()
          };

          fds.push(newFd);
          localStorage.setItem(LOCAL_FD_COUNTER_KEY, nextVal.toString());
          saveLocalData(LOCAL_FDS_KEY, fds);

          const events = getLocalData(LOCAL_FD_EV_KEY);
          events.push({
            id: `local-ev-1-${Date.now()}`,
            fdId: oldFd.id,
            timestamp: new Date().toISOString(),
            type: "FD Renewed",
            description: `FD renewed into ${newFdNumber} by ${creator}`
          });
          events.push({
            id: `local-ev-2-${Date.now()}`,
            fdId: newFd.id,
            timestamp: new Date().toISOString(),
            type: "FD Created",
            description: `FD created via renewal from parent ${parentNumber} by ${creator}`
          });
          saveLocalData(LOCAL_FD_EV_KEY, events);

          const txs = getLocalData(LOCAL_FD_TX_KEY);
          txs.push({
            id: `local-tx-1-${Date.now()}`,
            fdId: oldFd.id,
            date: renewalData.depositDate,
            type: "Renewal",
            description: `Renewed balance transferred to child account ${newFdNumber}`,
            amount: parseFloat(oldFd.maturityAmount),
            referenceNumber: "AUTO",
            createdBy: creator
          });
          txs.push({
            id: `local-tx-2-${Date.now()}`,
            fdId: newFd.id,
            date: renewalData.depositDate,
            type: "Renewal",
            description: `Balance transferred from parent account ${parentNumber}`,
            amount: parseFloat(renewalData.principalAmount),
            referenceNumber: "AUTO",
            createdBy: creator
          });
          saveLocalData(LOCAL_FD_TX_KEY, txs);

          const audits = getLocalData(LOCAL_FD_AUDIT_KEY);
          audits.push({
            id: `local-aud-1-${Date.now()}`,
            fdId: oldFd.id,
            timestamp: new Date().toISOString(),
            actionType: "Renew",
            oldValue: JSON.stringify(oldFd),
            newValue: JSON.stringify(oldFd),
            user: creator
          });
          audits.push({
            id: `local-aud-2-${Date.now()}`,
            fdId: newFd.id,
            timestamp: new Date().toISOString(),
            actionType: "Create",
            oldValue: null,
            newValue: JSON.stringify(newFd),
            user: creator
          });
          saveLocalData(LOCAL_FD_AUDIT_KEY, audits);

          notifyFdListeners();
          resolve(newFd);
        }, 500);
      });
    }

    try {
      const result = await runTransaction(db, async (transaction) => {
        const newFdNumber = renewalData.fdNumber.trim();
        const parentRef = doc(db, "fixedDeposits", fdId);
        const parentSnap = await transaction.get(parentRef);
        if (!parentSnap.exists()) {
          throw new Error("Parent Fixed Deposit does not exist.");
        }

        const parentData = parentSnap.data();
        const parentNumber = parentData.fdNumber;

        transaction.update(parentRef, {
          status: "Renewed",
          childFdNumber: newFdNumber
        });

        const newFdRef = doc(collection(db, "fixedDeposits"));
        const newFdData = {
          fdNumber: newFdNumber,
          bankName: renewalData.bankName.trim(),
          branch: renewalData.branch.trim(),
          principalAmount: parseFloat(renewalData.principalAmount),
          interestRate: parseFloat(renewalData.interestRate),
          depositDate: renewalData.depositDate,
          maturityDate: renewalData.maturityDate,
          maturityAmount: parseFloat(renewalData.maturityAmount),
          remarks: renewalData.remarks ? renewalData.remarks.trim() : "",
          status: "Active",
          parentFdNumber: parentNumber,
          childFdNumber: null,
          createdBy: creator,
          createdAt: new Date().toISOString()
        };

        transaction.set(newFdRef, newFdData);

        const evParentRef = doc(collection(db, "fdEvents"));
        transaction.set(evParentRef, {
          fdId,
          timestamp: new Date().toISOString(),
          type: "FD Renewed",
          description: `FD renewed into ${newFdNumber} by ${creator}`
        });

        const evChildRef = doc(collection(db, "fdEvents"));
        transaction.set(evChildRef, {
          fdId: newFdRef.id,
          timestamp: new Date().toISOString(),
          type: "FD Created",
          description: `FD created via renewal from parent ${parentNumber} by ${creator}`
        });

        const txParentRef = doc(collection(db, "fdTransactions"));
        transaction.set(txParentRef, {
          fdId,
          date: renewalData.depositDate,
          type: "Renewal",
          description: `Renewed balance transferred to child account ${newFdNumber}`,
          amount: parseFloat(parentData.maturityAmount),
          referenceNumber: "AUTO",
          createdBy: creator
        });

        const txChildRef = doc(collection(db, "fdTransactions"));
        transaction.set(txChildRef, {
          fdId: newFdRef.id,
          date: renewalData.depositDate,
          type: "Renewal",
          description: `Balance transferred from parent account ${parentNumber}`,
          amount: parseFloat(renewalData.principalAmount),
          referenceNumber: "AUTO",
          createdBy: creator
        });

        const auditParentRef = doc(collection(db, "fdAuditLogs"));
        transaction.set(auditParentRef, {
          fdId,
          timestamp: new Date().toISOString(),
          actionType: "Renew",
          oldValue: JSON.stringify(parentData),
          newValue: JSON.stringify({ ...parentData, status: "Renewed", childFdNumber: newFdNumber }),
          user: creator
        });

        const auditChildRef = doc(collection(db, "fdAuditLogs"));
        transaction.set(auditChildRef, {
          fdId: newFdRef.id,
          timestamp: new Date().toISOString(),
          actionType: "Create",
          oldValue: null,
          newValue: JSON.stringify(newFdData),
          user: creator
        });

        return { id: newFdRef.id, ...newFdData };
      });

      return result;
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to renew Fixed Deposit: ${err.message}`);
    }
  },

  closeFixedDeposit: async (fdId, closureData) => {
    const creator = auth.currentUser?.displayName || "Administrator";

    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const fds = getLocalData(LOCAL_FDS_KEY);
          const idx = fds.findIndex(f => f.id === fdId);
          if (idx === -1) {
            reject(new Error("FD not found"));
            return;
          }

          const oldFd = fds[idx];
          const oldVal = { ...oldFd };
          oldFd.status = "Closed";

          saveLocalData(LOCAL_FDS_KEY, fds);

          const events = getLocalData(LOCAL_FD_EV_KEY);
          events.push({
            id: `local-ev-${Date.now()}`,
            fdId,
            timestamp: new Date().toISOString(),
            type: "FD Closed",
            description: `FD closed. Remarks: ${closureData.remarks || "none"}`
          });
          saveLocalData(LOCAL_FD_EV_KEY, events);

          const txs = getLocalData(LOCAL_FD_TX_KEY);
          txs.push({
            id: `local-tx-${Date.now()}`,
            fdId,
            date: closureData.closureDate,
            type: "Closure",
            description: `Closure amount credited to savings account. Remarks: ${closureData.remarks || ""}`,
            amount: parseFloat(closureData.finalAmountReceived),
            referenceNumber: "AUTO",
            createdBy: creator
          });
          saveLocalData(LOCAL_FD_TX_KEY, txs);

          const audits = getLocalData(LOCAL_FD_AUDIT_KEY);
          audits.push({
            id: `local-aud-${Date.now()}`,
            fdId,
            timestamp: new Date().toISOString(),
            actionType: "Close",
            oldValue: JSON.stringify(oldVal),
            newValue: JSON.stringify(oldFd),
            user: creator
          });
          saveLocalData(LOCAL_FD_AUDIT_KEY, audits);

          notifyFdListeners();
          resolve(oldFd);
        }, 500);
      });
    }

    try {
      const ref = doc(db, "fixedDeposits", fdId);
      const snap = await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(ref);
        if (!docSnap.exists()) {
          throw new Error("Fixed Deposit does not exist.");
        }

        const oldData = docSnap.data();
        const nextData = {
          ...oldData,
          status: "Closed"
        };

        transaction.update(ref, { status: "Closed" });

        const evRef = doc(collection(db, "fdEvents"));
        transaction.set(evRef, {
          fdId,
          timestamp: new Date().toISOString(),
          type: "FD Closed",
          description: `FD closed. Remarks: ${closureData.remarks || "none"}`
        });

        const txRef = doc(collection(db, "fdTransactions"));
        transaction.set(txRef, {
          fdId,
          date: closureData.closureDate,
          type: "Closure",
          description: `Closure amount credited to savings account. Remarks: ${closureData.remarks || ""}`,
          amount: parseFloat(closureData.finalAmountReceived),
          referenceNumber: "AUTO",
          createdBy: creator
        });

        const auditRef = doc(collection(db, "fdAuditLogs"));
        transaction.set(auditRef, {
          fdId,
          timestamp: new Date().toISOString(),
          actionType: "Close",
          oldValue: JSON.stringify(oldData),
          newValue: JSON.stringify(nextData),
          user: creator
        });

        return nextData;
      });

      return snap;
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to close Fixed Deposit: ${err.message}`);
    }
  },

  addFdTransaction: async (fdId, txData) => {
    const creator = auth.currentUser?.displayName || "Administrator";

    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const list = getLocalData(LOCAL_FD_TX_KEY);
          const item = {
            id: `local-tx-${Date.now()}`,
            fdId,
            date: txData.date,
            type: txData.type,
            description: txData.description.trim(),
            amount: parseFloat(txData.amount),
            referenceNumber: txData.referenceNumber ? txData.referenceNumber.trim() : "N/A",
            createdBy: creator
          };
          list.push(item);
          saveLocalData(LOCAL_FD_TX_KEY, list);

          const audits = getLocalData(LOCAL_FD_AUDIT_KEY);
          audits.push({
            id: `local-aud-${Date.now()}`,
            fdId,
            timestamp: new Date().toISOString(),
            actionType: "Add Transaction",
            oldValue: null,
            newValue: JSON.stringify(item),
            user: creator
          });
          saveLocalData(LOCAL_FD_AUDIT_KEY, audits);

          const subs = txSubscribers.get(fdId);
          if (subs) {
            const filtered = list.filter(t => t.fdId === fdId);
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            subs.forEach(cb => cb(filtered));
          }
          resolve(item);
        }, 500);
      });
    }

    try {
      const txCollection = collection(db, "fdTransactions");
      const ref = doc(txCollection);
      const data = {
        fdId,
        date: txData.date,
        type: txData.type,
        description: txData.description.trim(),
        amount: parseFloat(txData.amount),
        referenceNumber: txData.referenceNumber ? txData.referenceNumber.trim() : "N/A",
        createdBy: creator
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(ref, data);
        const auditRef = doc(collection(db, "fdAuditLogs"));
        transaction.set(auditRef, {
          fdId,
          timestamp: new Date().toISOString(),
          actionType: "Add Transaction",
          oldValue: null,
          newValue: JSON.stringify(data),
          user: creator
        });
      });

      return { id: ref.id, ...data };
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to add transaction: ${err.message}`);
    }
  },

  addFdEvent: async (fdId, evData) => {
    const creator = auth.currentUser?.displayName || "Administrator";

    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const list = getLocalData(LOCAL_FD_EV_KEY);
          const item = {
            id: `local-ev-${Date.now()}`,
            fdId,
            timestamp: new Date().toISOString(),
            type: evData.type,
            description: evData.description.trim()
          };
          list.push(item);
          saveLocalData(LOCAL_FD_EV_KEY, list);

          const subs = evSubscribers.get(fdId);
          if (subs) {
            const filtered = list.filter(e => e.fdId === fdId);
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            subs.forEach(cb => cb(filtered));
          }
          resolve(item);
        }, 300);
      });
    }

    try {
      const col = collection(db, "fdEvents");
      const ref = doc(col);
      const data = {
        fdId,
        timestamp: new Date().toISOString(),
        type: evData.type,
        description: evData.description.trim()
      };
      await runTransaction(db, async (transaction) => {
        transaction.set(ref, data);
      });
      return { id: ref.id, ...data };
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to record event: ${err.message}`);
    }
  },

  addFdNote: async (fdId, noteContent) => {
    const creator = auth.currentUser?.displayName || "Administrator";

    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const list = getLocalData(LOCAL_FD_NT_KEY);
          const item = {
            id: `local-nt-${Date.now()}`,
            fdId,
            timestamp: new Date().toISOString(),
            user: creator,
            content: noteContent.trim()
          };
          list.push(item);
          saveLocalData(LOCAL_FD_NT_KEY, list);

          const events = getLocalData(LOCAL_FD_EV_KEY);
          events.push({
            id: `local-ev-${Date.now()}`,
            fdId,
            timestamp: new Date().toISOString(),
            type: "Remarks Added",
            description: `A new administrative note was recorded by ${creator}`
          });
          saveLocalData(LOCAL_FD_EV_KEY, events);

          const subs = ntSubscribers.get(fdId);
          if (subs) {
            const filtered = list.filter(n => n.fdId === fdId);
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            subs.forEach(cb => cb(filtered));
          }
          resolve(item);
        }, 500);
      });
    }

    try {
      const ref = doc(collection(db, "fdNotes"));
      const data = {
        fdId,
        timestamp: new Date().toISOString(),
        user: creator,
        content: noteContent.trim()
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(ref, data);
        const evRef = doc(collection(db, "fdEvents"));
        transaction.set(evRef, {
          fdId,
          timestamp: new Date().toISOString(),
          type: "Remarks Added",
          description: `A new administrative note was recorded by ${creator}`
        });
      });

      return { id: ref.id, ...data };
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to save note: ${err.message}`);
    }
  },

  uploadFdDocument: async (fdId, docData) => {
    const creator = auth.currentUser?.displayName || "Administrator";

    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const list = getLocalData(LOCAL_FD_DOC_KEY);
          const item = {
            id: `local-doc-${Date.now()}`,
            fdId,
            name: docData.name.trim(),
            type: docData.type,
            url: docData.url || "https://placeholder.com/file",
            uploadedAt: new Date().toISOString(),
            uploadedBy: creator
          };
          list.push(item);
          saveLocalData(LOCAL_FD_DOC_KEY, list);

          const events = getLocalData(LOCAL_FD_EV_KEY);
          events.push({
            id: `local-ev-${Date.now()}`,
            fdId,
            timestamp: new Date().toISOString(),
            type: "Document Uploaded",
            description: `Document "${docData.name}" uploaded by ${creator}`
          });
          saveLocalData(LOCAL_FD_EV_KEY, events);

          const subs = docSubscribers.get(fdId);
          if (subs) {
            const filtered = list.filter(d => d.fdId === fdId);
            filtered.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            subs.forEach(cb => cb(filtered));
          }
          resolve(item);
        }, 500);
      });
    }

    try {
      const ref = doc(collection(db, "fdDocuments"));
      const data = {
        fdId,
        name: docData.name.trim(),
        type: docData.type,
        url: docData.url || "https://placeholder.com/file",
        uploadedAt: new Date().toISOString(),
        uploadedBy: creator
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(ref, data);
        const evRef = doc(collection(db, "fdEvents"));
        transaction.set(evRef, {
          fdId,
          timestamp: new Date().toISOString(),
          type: "Document Uploaded",
          description: `Document "${docData.name}" uploaded by ${creator}`
        });
      });

      return { id: ref.id, ...data };
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to upload document: ${err.message}`);
    }
  }
};
