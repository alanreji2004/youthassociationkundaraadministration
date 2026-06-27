import { useState, useEffect, useMemo } from "react";
import { 
  FiPlus, 
  FiSearch, 
  FiEdit3, 
  FiX, 
  FiUsers, 
  FiCheckCircle, 
  FiClock, 
  FiCreditCard 
} from "react-icons/fi";
import { ordinationService } from "../services/ordinationService";
import { useToast } from "../components/Toast";
import ConfirmationModal from "../components/ConfirmationModal";
import styles from "./Ordination.module.css";

const Ordination = () => {
  const toast = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReg, setSelectedReg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addForm, setAddForm] = useState({ name: "", phone: "", paid: false });
  const [editForm, setEditForm] = useState({ name: "", phone: "", paid: false });

  useEffect(() => {
    const unsubscribe = ordinationService.subscribeOrdinations(
      (data) => {
        setRegistrations(data);
        setLoading(false);
      },
      () => {
        toast.error("Failed to load registrations.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);

  const filteredRegistrations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return registrations;
    return registrations.filter(
      (r) =>
        r.name?.toLowerCase().includes(query) ||
        r.phone?.toLowerCase().includes(query)
    );
  }, [registrations, searchQuery]);

  const stats = useMemo(() => {
    const total = registrations.length;
    const paid = registrations.filter((r) => r.paid).length;
    const unpaid = total - paid;
    return {
      total,
      paid,
      unpaid,
      collected: paid * 600,
      pending: unpaid * 600
    };
  }, [registrations]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0
    }).format(val);
  };

  const handleOpenAddModal = () => {
    setAddForm({ name: "", phone: "", paid: false });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      toast.error("Please fill in name and phone number.");
      return;
    }
    setIsSubmitting(true);
    try {
      await ordinationService.addRegistration(addForm);
      toast.success("Registration added successfully.");
      setShowAddModal(false);
    } catch (err) {
      toast.error(err.message || "Failed to add registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (reg) => {
    setSelectedReg(reg);
    setEditForm({ name: reg.name, phone: reg.phone, paid: reg.paid });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error("Please fill in name and phone number.");
      return;
    }
    setIsSubmitting(true);
    try {
      await ordinationService.updateRegistration(selectedReg.id, editForm);
      toast.success("Registration updated successfully.");
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.message || "Failed to update registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrigger = () => {
    setShowEditModal(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsSubmitting(true);
    try {
      await ordinationService.deleteRegistration(selectedReg.id);
      toast.success("Registration removed successfully.");
      setShowDeleteConfirm(false);
      setSelectedReg(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setShowEditModal(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ordination Attendee Register</h1>
        <p className={styles.subtitle}>
          Manage registrations, check payment statuses, and track collected funds for the ordination ceremony.
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Total Registered</span>
            <FiUsers className={styles.statIcon} size={20} />
          </div>
          <p className={styles.statValue}>{stats.total}</p>
          <span className={styles.statLabel}>Attendees willing to come</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Paid Registrations</span>
            <FiCheckCircle className={styles.statIcon} size={20} style={{ color: "#10b981" }} />
          </div>
          <p className={styles.statValue}>{stats.paid}</p>
          <span className={styles.statLabel}>Completed payments</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Total Collected</span>
            <FiCreditCard className={styles.statIcon} size={20} style={{ color: "#10b981" }} />
          </div>
          <p className={styles.statValue}>{formatCurrency(stats.collected)}</p>
          <span className={styles.statLabel}>At ₹600 per attendee</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Pending Balance</span>
            <FiClock className={styles.statIcon} size={20} style={{ color: "#ef4444" }} />
          </div>
          <p className={styles.statValue}>{formatCurrency(stats.pending)}</p>
          <span className={styles.statLabel}>Awaiting payment clearance</span>
        </div>
      </div>

      <div className={styles.actionsBar}>
        <div className={styles.searchWrapper}>
          <FiSearch className={styles.searchIcon} size={18} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button onClick={handleOpenAddModal} className={styles.addBtn}>
          <FiPlus size={18} />
          <span>Add Attendee</span>
        </button>
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className="skeleton" style={{ height: "200px", borderRadius: "8px" }} />
        ) : filteredRegistrations.length === 0 ? (
          <div className={styles.emptyBlockText}>No attendee registrations found.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Phone Number</th>
                <th className={styles.th}>Paid Status</th>
                <th className={styles.th} style={{ width: "80px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg, index) => (
                <tr key={reg.id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                    {index + 1}
                  </td>
                  <td className={styles.td} style={{ fontWeight: 600 }}>{reg.name}</td>
                  <td className={`${styles.td} ${styles.phoneCell}`}>{reg.phone}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${reg.paid ? styles.badgePaid : styles.badgeUnpaid}`}>
                      {reg.paid ? "Paid" : "Not Paid"}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleOpenEditModal(reg)}
                      className={styles.editActionBtn}
                      aria-label="Edit registration"
                    >
                      <FiEdit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Ordination Attendee</h3>
              <button onClick={() => setShowAddModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className={styles.modalForm}>
              <div className={styles.fg}>
                <label>Attendee Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.fg}>
                <label>Phone Number *</label>
                <input
                  type="text"
                  placeholder="Enter 10-digit number"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className={styles.fg} style={{ marginTop: "4px" }}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={addForm.paid}
                    onChange={(e) => setAddForm({ ...addForm, paid: e.target.checked })}
                  />
                  <span>Mark as Paid (₹600)</span>
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Add Attendee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Edit Attendee Details</h3>
              <button onClick={() => setShowEditModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.fg}>
                <label>Attendee Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.fg}>
                <label>Phone Number *</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className={styles.fg} style={{ marginTop: "4px" }}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={editForm.paid}
                    onChange={(e) => setEditForm({ ...editForm, paid: e.target.checked })}
                  />
                  <span>Mark as Paid (₹600)</span>
                </label>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleDeleteTrigger}
                  className={styles.modalDeleteBtn}
                  disabled={isSubmitting}
                >
                  Delete Record
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Attendee Registration"
        message={`Are you sure you want to delete the registration record for ${selectedReg?.name || "this attendee"}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        isDanger={true}
      />
    </div>
  );
};

export default Ordination;
