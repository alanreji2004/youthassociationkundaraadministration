import { useState, useEffect } from "react";
import { FiPlus, FiEdit3, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import { financeService } from "../services/financeService";
import { useToast } from "../components/Toast";
import ConfirmationModal from "../components/ConfirmationModal";
import styles from "./FinanceSettings.module.css";

const FinanceSettings = () => {
  const toast = useToast();
  const [receiptCats, setReceiptCats] = useState([]);
  const [paymentCats, setPaymentCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newReceiptName, setNewReceiptName] = useState("");
  const [newPaymentName, setNewPaymentName] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    type: ""
  });

  useEffect(() => {
    const unsubReceipt = financeService.subscribeReceiptCategories((data) => {
      setReceiptCats(data);
    });
    const unsubPayment = financeService.subscribePaymentCategories((data) => {
      setPaymentCats(data);
      setLoading(false);
    });
    return () => {
      unsubReceipt();
      unsubPayment();
    };
  }, []);

  const handleAddReceiptCat = async (e) => {
    e.preventDefault();
    if (!newReceiptName.trim()) return;
    const exists = receiptCats.some(c => c.name.toLowerCase() === newReceiptName.trim().toLowerCase());
    if (exists) {
      toast.error("Category name already exists.");
      return;
    }
    try {
      await financeService.addReceiptCategory(newReceiptName);
      setNewReceiptName("");
      toast.success("Receipt category added successfully.");
    } catch {
      toast.error("Failed to add receipt category.");
    }
  };

  const handleAddPaymentCat = async (e) => {
    e.preventDefault();
    if (!newPaymentName.trim()) return;
    const exists = paymentCats.some(c => c.name.toLowerCase() === newPaymentName.trim().toLowerCase());
    if (exists) {
      toast.error("Category name already exists.");
      return;
    }
    try {
      await financeService.addPaymentCategory(newPaymentName);
      setNewPaymentName("");
      toast.success("Payment category added successfully.");
    } catch {
      toast.error("Failed to add payment category.");
    }
  };

  const startEdit = (id, currentName) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (id, type) => {
    if (!editingName.trim()) return;
    const list = type === "receipt" ? receiptCats : paymentCats;
    const exists = list.some(c => c.id !== id && c.name.toLowerCase() === editingName.trim().toLowerCase());
    if (exists) {
      toast.error("Category name already exists.");
      return;
    }
    try {
      if (type === "receipt") {
        await financeService.updateReceiptCategory(id, editingName);
      } else {
        await financeService.updatePaymentCategory(id, editingName);
      }
      setEditingId(null);
      setEditingName("");
      toast.success("Category updated successfully.");
    } catch {
      toast.error("Failed to update category.");
    }
  };

  const triggerDelete = (id, type) => {
    setDeleteModal({
      isOpen: true,
      id,
      type
    });
  };

  const cancelDelete = () => {
    setDeleteModal({
      isOpen: false,
      id: null,
      type: ""
    });
  };

  const confirmDelete = async () => {
    const { id, type } = deleteModal;
    setDeleteModal({ isOpen: false, id: null, type: "" });
    try {
      if (type === "receipt") {
        await financeService.deleteReceiptCategory(id);
      } else {
        await financeService.deletePaymentCategory(id);
      }
      toast.success("Category deleted successfully.");
    } catch {
      toast.error("Failed to delete category.");
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Treasury Settings</h2>
        <p className={styles.subtitle}>Manage categories and ledger structures for Receipts and Payments modules.</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Receipt Inflow Categories</h3>
            <p className={styles.cardDescription}>Define categories for general organization revenues and receipts.</p>
          </div>
          <div className={styles.cardBody}>
            <form onSubmit={handleAddReceiptCat} className={styles.formInline}>
              <input
                type="text"
                placeholder="Enter new receipt category name..."
                value={newReceiptName}
                onChange={(e) => setNewReceiptName(e.target.value)}
                className={styles.input}
                required
              />
              <button type="submit" className={styles.addBtn}>
                <FiPlus />
                <span>Add Category</span>
              </button>
            </form>

            <div className={styles.listGroup}>
              {receiptCats.length === 0 ? (
                <div className={styles.emptyState}>No categories defined yet.</div>
              ) : (
                receiptCats.map((cat) => (
                  <div key={cat.id} className={styles.listItem}>
                    {editingId === cat.id ? (
                      <div className={styles.editWrapper}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className={styles.editInput}
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id, "receipt")}
                          className={styles.saveBtn}
                          aria-label="Save category"
                        >
                          <FiCheck />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className={styles.cancelBtn}
                          aria-label="Cancel editing"
                        >
                          <FiX />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={styles.itemLabel}>{cat.name}</span>
                        <div className={styles.itemActions}>
                          <button
                            type="button"
                            onClick={() => startEdit(cat.id, cat.name)}
                            className={styles.editBtn}
                            aria-label="Edit category"
                          >
                            <FiEdit3 />
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerDelete(cat.id, "receipt")}
                            className={styles.deleteBtn}
                            aria-label="Delete category"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Payment Outflow Categories</h3>
            <p className={styles.cardDescription}>Define categories for general organization expenditures and payments.</p>
          </div>
          <div className={styles.cardBody}>
            <form onSubmit={handleAddPaymentCat} className={styles.formInline}>
              <input
                type="text"
                placeholder="Enter new payment category name..."
                value={newPaymentName}
                onChange={(e) => setNewPaymentName(e.target.value)}
                className={styles.input}
                required
              />
              <button type="submit" className={styles.addBtn}>
                <FiPlus />
                <span>Add Category</span>
              </button>
            </form>

            <div className={styles.listGroup}>
              {paymentCats.length === 0 ? (
                <div className={styles.emptyState}>No categories defined yet.</div>
              ) : (
                paymentCats.map((cat) => (
                  <div key={cat.id} className={styles.listItem}>
                    {editingId === cat.id ? (
                      <div className={styles.editWrapper}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className={styles.editInput}
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id, "payment")}
                          className={styles.saveBtn}
                          aria-label="Save category"
                        >
                          <FiCheck />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className={styles.cancelBtn}
                          aria-label="Cancel editing"
                        >
                          <FiX />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={styles.itemLabel}>{cat.name}</span>
                        <div className={styles.itemActions}>
                          <button
                            type="button"
                            onClick={() => startEdit(cat.id, cat.name)}
                            className={styles.editBtn}
                            aria-label="Edit category"
                          >
                            <FiEdit3 />
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerDelete(cat.id, "payment")}
                            className={styles.deleteBtn}
                            aria-label="Delete category"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Confirm Category Deletion"
        message={`Are you sure you want to delete this category? Any transaction records using this category will remain, but this category will no longer appear in filters, breakdown views, or form dropdown selections.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        confirmText="Delete Category"
        cancelText="Cancel"
        isDanger={true}
      />
    </div>
  );
};

export default FinanceSettings;
