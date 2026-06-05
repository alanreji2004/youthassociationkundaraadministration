import {
  collection,
  doc,
  runTransaction,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { db, auth } from "./firebase";

const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

const LOCAL_RECEIPTS_KEY = "smya_finance_receipts";
const LOCAL_PAYMENTS_KEY = "smya_finance_payments";
const LOCAL_EVENTS_KEY = "smya_finance_events";
const LOCAL_EVENT_DOC_KEY = "smya_finance_event_docs";
const LOCAL_EVENT_NOTE_KEY = "smya_finance_event_notes";
const LOCAL_FINANCE_AUDIT_KEY = "smya_finance_audit_logs";

const receiptsSubscribers = new Set();
const paymentsSubscribers = new Set();
const eventsSubscribers = new Set();
const docSubscribers = new Map();
const noteSubscribers = new Map();
const eventAuditSubscribers = new Map();
const globalAuditSubscribers = new Set();

const getLocalData = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const notifyReceiptsListeners = () => {
  const data = getLocalData(LOCAL_RECEIPTS_KEY).filter(r => !r.isDeleted);
  receiptsSubscribers.forEach((cb) => cb(data));
};

const notifyPaymentsListeners = () => {
  const data = getLocalData(LOCAL_PAYMENTS_KEY).filter(p => !p.isDeleted);
  paymentsSubscribers.forEach((cb) => cb(data));
};

const notifyEventsListeners = () => {
  const data = getLocalData(LOCAL_EVENTS_KEY).filter(e => !e.isDeleted);
  eventsSubscribers.forEach((cb) => cb(data));
};

const notifyGlobalAuditListeners = () => {
  const data = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
  globalAuditSubscribers.forEach((cb) => cb(data));
};

export const financeService = {
  subscribeReceipts: (onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      receiptsSubscribers.add(onUpdate);
      const data = getLocalData(LOCAL_RECEIPTS_KEY).filter(r => !r.isDeleted);
      onUpdate(data);
      return () => {
        receiptsSubscribers.delete(onUpdate);
      };
    }

    const q = query(collection(db, "financeReceipts"), orderBy("date", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (!item.isDeleted) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribePayments: (onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      paymentsSubscribers.add(onUpdate);
      const data = getLocalData(LOCAL_PAYMENTS_KEY).filter(p => !p.isDeleted);
      onUpdate(data);
      return () => {
        paymentsSubscribers.delete(onUpdate);
      };
    }

    const q = query(collection(db, "financePayments"), orderBy("date", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (!item.isDeleted) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeEvents: (onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      eventsSubscribers.add(onUpdate);
      const data = getLocalData(LOCAL_EVENTS_KEY).filter(e => !e.isDeleted);
      onUpdate(data);
      return () => {
        eventsSubscribers.delete(onUpdate);
      };
    }

    const q = query(collection(db, "financeEvents"), orderBy("startDate", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (!item.isDeleted) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeEventDocuments: (eventId, onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      if (!docSubscribers.has(eventId)) {
        docSubscribers.set(eventId, new Set());
      }
      docSubscribers.get(eventId).add(onUpdate);
      const list = getLocalData(LOCAL_EVENT_DOC_KEY).filter(d => d.eventId === eventId && !d.isDeleted);
      list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      onUpdate(list);
      return () => {
        const subs = docSubscribers.get(eventId);
        if (subs) {
          subs.delete(onUpdate);
          if (subs.size === 0) docSubscribers.delete(eventId);
        }
      };
    }

    const q = query(collection(db, "financeEventDocuments"), orderBy("uploadedAt", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.eventId === eventId && !item.isDeleted) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeEventNotes: (eventId, onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      if (!noteSubscribers.has(eventId)) {
        noteSubscribers.set(eventId, new Set());
      }
      noteSubscribers.get(eventId).add(onUpdate);
      const list = getLocalData(LOCAL_EVENT_NOTE_KEY).filter(n => n.eventId === eventId && !n.isDeleted);
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      onUpdate(list);
      return () => {
        const subs = noteSubscribers.get(eventId);
        if (subs) {
          subs.delete(onUpdate);
          if (subs.size === 0) noteSubscribers.delete(eventId);
        }
      };
    }

    const q = query(collection(db, "financeEventNotes"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.eventId === eventId && !item.isDeleted) {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeEventAuditLogs: (eventId, onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      if (!eventAuditSubscribers.has(eventId)) {
        eventAuditSubscribers.set(eventId, new Set());
      }
      eventAuditSubscribers.get(eventId).add(onUpdate);
      const list = getLocalData(LOCAL_FINANCE_AUDIT_KEY).filter(a => a.targetId === eventId && a.targetType === "Event");
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      onUpdate(list);
      return () => {
        const subs = eventAuditSubscribers.get(eventId);
        if (subs) {
          subs.delete(onUpdate);
          if (subs.size === 0) eventAuditSubscribers.delete(eventId);
        }
      };
    }

    const q = query(collection(db, "financeAuditLogs"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.targetId === eventId && item.targetType === "Event") {
          list.push(item);
        }
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  subscribeFinanceAuditLogs: (onUpdate, onError) => {
    if (!isFirebaseConfigured) {
      globalAuditSubscribers.add(onUpdate);
      const data = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      onUpdate(data);
      return () => {
        globalAuditSubscribers.delete(onUpdate);
      };
    }

    const q = query(collection(db, "financeAuditLogs"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      onUpdate(list);
    }, (err) => {
      console.error(err);
      if (onError) onError(err);
    });
  },

  addReceipt: async (receiptData) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const receipts = getLocalData(LOCAL_RECEIPTS_KEY);
          const newReceipt = {
            id: `receipt-${Date.now()}`,
            receiptNumber: receiptData.receiptNumber.trim(),
            date: receiptData.date,
            category: receiptData.category,
            source: receiptData.source.trim(),
            description: receiptData.description.trim(),
            amount: parseFloat(receiptData.amount),
            remarks: receiptData.remarks ? receiptData.remarks.trim() : "",
            eventId: receiptData.eventId || null,
            createdBy: creator,
            createdAt: new Date().toISOString(),
            isDeleted: false
          };
          receipts.push(newReceipt);
          saveLocalData(LOCAL_RECEIPTS_KEY, receipts);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: newReceipt.id,
            targetType: "Receipt",
            action: "Create",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: null,
            updatedValue: JSON.stringify(newReceipt)
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyReceiptsListeners();
          notifyGlobalAuditListeners();
          resolve(newReceipt);
        }, 300);
      });
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const ref = doc(collection(db, "financeReceipts"));
        const newReceipt = {
          receiptNumber: receiptData.receiptNumber.trim(),
          date: receiptData.date,
          category: receiptData.category,
          source: receiptData.source.trim(),
          description: receiptData.description.trim(),
          amount: parseFloat(receiptData.amount),
          remarks: receiptData.remarks ? receiptData.remarks.trim() : "",
          eventId: receiptData.eventId || null,
          createdBy: creator,
          createdAt: new Date().toISOString(),
          isDeleted: false
        };
        transaction.set(ref, newReceipt);

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: ref.id,
          targetType: "Receipt",
          action: "Create",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: null,
          updatedValue: JSON.stringify(newReceipt)
        });

        return { id: ref.id, ...newReceipt };
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to add receipt: ${err.message}`, { cause: err });
    }
  },

  updateReceipt: async (id, updatedFields) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const receipts = getLocalData(LOCAL_RECEIPTS_KEY);
          const idx = receipts.findIndex(r => r.id === id);
          if (idx === -1) {
            reject(new Error("Receipt not found"));
            return;
          }
          const oldVal = { ...receipts[idx] };
          receipts[idx] = {
            ...receipts[idx],
            date: updatedFields.date,
            category: updatedFields.category,
            source: updatedFields.source.trim(),
            description: updatedFields.description.trim(),
            amount: parseFloat(updatedFields.amount),
            remarks: updatedFields.remarks ? updatedFields.remarks.trim() : "",
            eventId: updatedFields.eventId || null
          };
          saveLocalData(LOCAL_RECEIPTS_KEY, receipts);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: id,
            targetType: "Receipt",
            action: "Edit",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: JSON.stringify(oldVal),
            updatedValue: JSON.stringify(receipts[idx])
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyReceiptsListeners();
          notifyGlobalAuditListeners();
          resolve(receipts[idx]);
        }, 300);
      });
    }

    try {
      const ref = doc(db, "financeReceipts", id);
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) {
          throw new Error("Receipt does not exist");
        }
        const oldVal = snap.data();
        const newVal = {
          ...oldVal,
          date: updatedFields.date,
          category: updatedFields.category,
          source: updatedFields.source.trim(),
          description: updatedFields.description.trim(),
          amount: parseFloat(updatedFields.amount),
          remarks: updatedFields.remarks ? updatedFields.remarks.trim() : "",
          eventId: updatedFields.eventId || null
        };
        transaction.update(ref, newVal);

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: id,
          targetType: "Receipt",
          action: "Edit",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: JSON.stringify({ id, ...oldVal }),
          updatedValue: JSON.stringify({ id, ...newVal })
        });

        return { id, ...newVal };
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to update receipt: ${err.message}`, { cause: err });
    }
  },

  deleteReceipt: async (id) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const receipts = getLocalData(LOCAL_RECEIPTS_KEY);
          const idx = receipts.findIndex(r => r.id === id);
          if (idx === -1) {
            reject(new Error("Receipt not found"));
            return;
          }
          const oldVal = { ...receipts[idx] };
          receipts[idx].isDeleted = true;
          saveLocalData(LOCAL_RECEIPTS_KEY, receipts);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: id,
            targetType: "Receipt",
            action: "Delete",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: JSON.stringify(oldVal),
            updatedValue: JSON.stringify(receipts[idx])
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyReceiptsListeners();
          notifyGlobalAuditListeners();
          resolve(receipts[idx]);
        }, 300);
      });
    }

    try {
      const ref = doc(db, "financeReceipts", id);
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) {
          throw new Error("Receipt does not exist");
        }
        const oldVal = snap.data();
        transaction.update(ref, { isDeleted: true });

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: id,
          targetType: "Receipt",
          action: "Delete",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: JSON.stringify({ id, ...oldVal }),
          updatedValue: JSON.stringify({ id, ...oldVal, isDeleted: true })
        });
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to delete receipt: ${err.message}`, { cause: err });
    }
  },

  addPayment: async (paymentData) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const payments = getLocalData(LOCAL_PAYMENTS_KEY);
          const newPayment = {
            id: `payment-${Date.now()}`,
            paymentNumber: paymentData.paymentNumber.trim(),
            date: paymentData.date,
            category: paymentData.category,
            paidTo: paymentData.paidTo.trim(),
            description: paymentData.description.trim(),
            amount: parseFloat(paymentData.amount),
            remarks: paymentData.remarks ? paymentData.remarks.trim() : "",
            eventId: paymentData.eventId || null,
            createdBy: creator,
            createdAt: new Date().toISOString(),
            isDeleted: false
          };
          payments.push(newPayment);
          saveLocalData(LOCAL_PAYMENTS_KEY, payments);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: newPayment.id,
            targetType: "Payment",
            action: "Create",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: null,
            updatedValue: JSON.stringify(newPayment)
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyPaymentsListeners();
          notifyGlobalAuditListeners();
          resolve(newPayment);
        }, 300);
      });
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const ref = doc(collection(db, "financePayments"));
        const newPayment = {
          paymentNumber: paymentData.paymentNumber.trim(),
          date: paymentData.date,
          category: paymentData.category,
          paidTo: paymentData.paidTo.trim(),
          description: paymentData.description.trim(),
          amount: parseFloat(paymentData.amount),
          remarks: paymentData.remarks ? paymentData.remarks.trim() : "",
          eventId: paymentData.eventId || null,
          createdBy: creator,
          createdAt: new Date().toISOString(),
          isDeleted: false
        };
        transaction.set(ref, newPayment);

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: ref.id,
          targetType: "Payment",
          action: "Create",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: null,
          updatedValue: JSON.stringify(newPayment)
        });

        return { id: ref.id, ...newPayment };
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to add payment: ${err.message}`, { cause: err });
    }
  },

  updatePayment: async (id, updatedFields) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const payments = getLocalData(LOCAL_PAYMENTS_KEY);
          const idx = payments.findIndex(p => p.id === id);
          if (idx === -1) {
            reject(new Error("Payment not found"));
            return;
          }
          const oldVal = { ...payments[idx] };
          payments[idx] = {
            ...payments[idx],
            date: updatedFields.date,
            category: updatedFields.category,
            paidTo: updatedFields.paidTo.trim(),
            description: updatedFields.description.trim(),
            amount: parseFloat(updatedFields.amount),
            remarks: updatedFields.remarks ? updatedFields.remarks.trim() : "",
            eventId: updatedFields.eventId || null
          };
          saveLocalData(LOCAL_PAYMENTS_KEY, payments);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: id,
            targetType: "Payment",
            action: "Edit",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: JSON.stringify(oldVal),
            updatedValue: JSON.stringify(payments[idx])
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyPaymentsListeners();
          notifyGlobalAuditListeners();
          resolve(payments[idx]);
        }, 300);
      });
    }

    try {
      const ref = doc(db, "financePayments", id);
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) {
          throw new Error("Payment does not exist");
        }
        const oldVal = snap.data();
        const newVal = {
          ...oldVal,
          date: updatedFields.date,
          category: updatedFields.category,
          paidTo: updatedFields.paidTo.trim(),
          description: updatedFields.description.trim(),
          amount: parseFloat(updatedFields.amount),
          remarks: updatedFields.remarks ? updatedFields.remarks.trim() : "",
          eventId: updatedFields.eventId || null
        };
        transaction.update(ref, newVal);

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: id,
          targetType: "Payment",
          action: "Edit",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: JSON.stringify({ id, ...oldVal }),
          updatedValue: JSON.stringify({ id, ...newVal })
        });

        return { id, ...newVal };
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to update payment: ${err.message}`, { cause: err });
    }
  },

  deletePayment: async (id) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const payments = getLocalData(LOCAL_PAYMENTS_KEY);
          const idx = payments.findIndex(p => p.id === id);
          if (idx === -1) {
            reject(new Error("Payment not found"));
            return;
          }
          const oldVal = { ...payments[idx] };
          payments[idx].isDeleted = true;
          saveLocalData(LOCAL_PAYMENTS_KEY, payments);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: id,
            targetType: "Payment",
            action: "Delete",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: JSON.stringify(oldVal),
            updatedValue: JSON.stringify(payments[idx])
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyPaymentsListeners();
          notifyGlobalAuditListeners();
          resolve(payments[idx]);
        }, 300);
      });
    }

    try {
      const ref = doc(db, "financePayments", id);
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) {
          throw new Error("Payment does not exist");
        }
        const oldVal = snap.data();
        transaction.update(ref, { isDeleted: true });

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: id,
          targetType: "Payment",
          action: "Delete",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: JSON.stringify({ id, ...oldVal }),
          updatedValue: JSON.stringify({ id, ...oldVal, isDeleted: true })
        });
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to delete payment: ${err.message}`, { cause: err });
    }
  },

  addEvent: async (eventData) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const events = getLocalData(LOCAL_EVENTS_KEY);
          const newEvent = {
            id: `event-${Date.now()}`,
            name: eventData.name.trim(),
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            description: eventData.description.trim(),
            status: eventData.status || "Active",
            remarks: eventData.remarks ? eventData.remarks.trim() : "",
            createdBy: creator,
            createdAt: new Date().toISOString(),
            isDeleted: false
          };
          events.push(newEvent);
          saveLocalData(LOCAL_EVENTS_KEY, events);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: newEvent.id,
            targetType: "Event",
            action: "Create",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: null,
            updatedValue: JSON.stringify(newEvent)
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyEventsListeners();
          notifyGlobalAuditListeners();
          resolve(newEvent);
        }, 300);
      });
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const ref = doc(collection(db, "financeEvents"));
        const newEvent = {
          name: eventData.name.trim(),
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          description: eventData.description.trim(),
          status: eventData.status || "Active",
          remarks: eventData.remarks ? eventData.remarks.trim() : "",
          createdBy: creator,
          createdAt: new Date().toISOString(),
          isDeleted: false
        };
        transaction.set(ref, newEvent);

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: ref.id,
          targetType: "Event",
          action: "Create",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: null,
          updatedValue: JSON.stringify(newEvent)
        });

        return { id: ref.id, ...newEvent };
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to add event: ${err.message}`, { cause: err });
    }
  },

  updateEvent: async (id, updatedFields) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const events = getLocalData(LOCAL_EVENTS_KEY);
          const idx = events.findIndex(e => e.id === id);
          if (idx === -1) {
            reject(new Error("Event not found"));
            return;
          }
          const oldVal = { ...events[idx] };
          events[idx] = {
            ...events[idx],
            name: updatedFields.name.trim(),
            startDate: updatedFields.startDate,
            endDate: updatedFields.endDate,
            description: updatedFields.description.trim(),
            status: updatedFields.status,
            remarks: updatedFields.remarks ? updatedFields.remarks.trim() : ""
          };
          saveLocalData(LOCAL_EVENTS_KEY, events);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: id,
            targetType: "Event",
            action: "Edit",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: JSON.stringify(oldVal),
            updatedValue: JSON.stringify(events[idx])
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyEventsListeners();
          notifyGlobalAuditListeners();
          
          const evSubs = eventAuditSubscribers.get(id);
          if (evSubs) {
            const list = audits.filter(a => a.targetId === id && a.targetType === "Event");
            list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            evSubs.forEach(cb => cb(list));
          }

          resolve(events[idx]);
        }, 300);
      });
    }

    try {
      const ref = doc(db, "financeEvents", id);
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) {
          throw new Error("Event does not exist");
        }
        const oldVal = snap.data();
        const newVal = {
          ...oldVal,
          name: updatedFields.name.trim(),
          startDate: updatedFields.startDate,
          endDate: updatedFields.endDate,
          description: updatedFields.description.trim(),
          status: updatedFields.status,
          remarks: updatedFields.remarks ? updatedFields.remarks.trim() : ""
        };
        transaction.update(ref, newVal);

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: id,
          targetType: "Event",
          action: "Edit",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: JSON.stringify({ id, ...oldVal }),
          updatedValue: JSON.stringify({ id, ...newVal })
        });

        return { id, ...newVal };
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to update event: ${err.message}`, { cause: err });
    }
  },

  deleteEvent: async (id) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const events = getLocalData(LOCAL_EVENTS_KEY);
          const idx = events.findIndex(e => e.id === id);
          if (idx === -1) {
            reject(new Error("Event not found"));
            return;
          }
          const oldVal = { ...events[idx] };
          events[idx].isDeleted = true;
          saveLocalData(LOCAL_EVENTS_KEY, events);

          const audits = getLocalData(LOCAL_FINANCE_AUDIT_KEY);
          audits.push({
            id: `audit-${Date.now()}`,
            targetId: id,
            targetType: "Event",
            action: "Delete",
            user: creator,
            timestamp: new Date().toISOString(),
            previousValue: JSON.stringify(oldVal),
            updatedValue: JSON.stringify(events[idx])
          });
          saveLocalData(LOCAL_FINANCE_AUDIT_KEY, audits);

          notifyEventsListeners();
          notifyGlobalAuditListeners();
          resolve(events[idx]);
        }, 300);
      });
    }

    try {
      const ref = doc(db, "financeEvents", id);
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) {
          throw new Error("Event does not exist");
        }
        const oldVal = snap.data();
        transaction.update(ref, { isDeleted: true });

        const auditRef = doc(collection(db, "financeAuditLogs"));
        transaction.set(auditRef, {
          targetId: id,
          targetType: "Event",
          action: "Delete",
          user: creator,
          timestamp: new Date().toISOString(),
          previousValue: JSON.stringify({ id, ...oldVal }),
          updatedValue: JSON.stringify({ id, ...oldVal, isDeleted: true })
        });
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to delete event: ${err.message}`, { cause: err });
    }
  },

  addEventDocument: async (eventId, docData) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const docs = getLocalData(LOCAL_EVENT_DOC_KEY);
          const newDoc = {
            id: `doc-${Date.now()}`,
            eventId,
            name: docData.name.trim(),
            type: docData.type,
            url: docData.url || "https://placeholder.com/event-file",
            uploadedAt: new Date().toISOString(),
            uploadedBy: creator,
            isDeleted: false
          };
          docs.push(newDoc);
          saveLocalData(LOCAL_EVENT_DOC_KEY, docs);

          const subs = docSubscribers.get(eventId);
          if (subs) {
            const list = docs.filter(d => d.eventId === eventId && !d.isDeleted);
            list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            subs.forEach(cb => cb(list));
          }
          resolve(newDoc);
        }, 300);
      });
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const ref = doc(collection(db, "financeEventDocuments"));
        const newDoc = {
          eventId,
          name: docData.name.trim(),
          type: docData.type,
          url: docData.url || "https://placeholder.com/event-file",
          uploadedAt: new Date().toISOString(),
          uploadedBy: creator,
          isDeleted: false
        };
        transaction.set(ref, newDoc);
        return { id: ref.id, ...newDoc };
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to upload document: ${err.message}`, { cause: err });
    }
  },

  deleteEventDocument: async (docId) => {
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const docs = getLocalData(LOCAL_EVENT_DOC_KEY);
          const idx = docs.findIndex(d => d.id === docId);
          if (idx === -1) {
            reject(new Error("Document not found"));
            return;
          }
          docs[idx].isDeleted = true;
          saveLocalData(LOCAL_EVENT_DOC_KEY, docs);

          const eventId = docs[idx].eventId;
          const subs = docSubscribers.get(eventId);
          if (subs) {
            const list = docs.filter(d => d.eventId === eventId && !d.isDeleted);
            list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            subs.forEach(cb => cb(list));
          }
          resolve(docs[idx]);
        }, 300);
      });
    }

    try {
      const ref = doc(db, "financeEventDocuments", docId);
      await runTransaction(db, async (transaction) => {
        transaction.update(ref, { isDeleted: true });
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to delete document: ${err.message}`, { cause: err });
    }
  },

  addEventNote: async (eventId, noteContent) => {
    const creator = auth.currentUser?.displayName || "Administrator";
    if (!isFirebaseConfigured) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const notes = getLocalData(LOCAL_EVENT_NOTE_KEY);
          const newNote = {
            id: `note-${Date.now()}`,
            eventId,
            user: creator,
            timestamp: new Date().toISOString(),
            content: noteContent.trim(),
            isDeleted: false
          };
          notes.push(newNote);
          saveLocalData(LOCAL_EVENT_NOTE_KEY, notes);

          const subs = noteSubscribers.get(eventId);
          if (subs) {
            const list = notes.filter(n => n.eventId === eventId && !n.isDeleted);
            list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            subs.forEach(cb => cb(list));
          }
          resolve(newNote);
        }, 300);
      });
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const ref = doc(collection(db, "financeEventNotes"));
        const newNote = {
          eventId,
          user: creator,
          timestamp: new Date().toISOString(),
          content: noteContent.trim(),
          isDeleted: false
        };
        transaction.set(ref, newNote);
        return { id: ref.id, ...newNote };
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to add note: ${err.message}`, { cause: err });
    }
  },

  deleteEventNote: async (noteId) => {
    if (!isFirebaseConfigured) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const notes = getLocalData(LOCAL_EVENT_NOTE_KEY);
          const idx = notes.findIndex(n => n.id === noteId);
          if (idx === -1) {
            reject(new Error("Note not found"));
            return;
          }
          notes[idx].isDeleted = true;
          saveLocalData(LOCAL_EVENT_NOTE_KEY, notes);

          const eventId = notes[idx].eventId;
          const subs = noteSubscribers.get(eventId);
          if (subs) {
            const list = notes.filter(n => n.eventId === eventId && !n.isDeleted);
            list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            subs.forEach(cb => cb(list));
          }
          resolve(notes[idx]);
        }, 300);
      });
    }

    try {
      const ref = doc(db, "financeEventNotes", noteId);
      await runTransaction(db, async (transaction) => {
        transaction.update(ref, { isDeleted: true });
      });
    } catch (err) {
      console.error(err);
      throw new Error(`Failed to delete note: ${err.message}`, { cause: err });
    }
  }
};
