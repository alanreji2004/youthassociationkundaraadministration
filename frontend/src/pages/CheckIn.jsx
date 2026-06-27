import { useState, useEffect, useMemo } from "react";
import { 
  FiSearch, 
  FiEdit3, 
  FiX, 
  FiUsers, 
  FiCheckCircle, 
  FiClock, 
  FiSlash,
  FiDownload 
} from "react-icons/fi";
import { ordinationService } from "../services/ordinationService";
import { exportOrdinationsToExcel } from "../utils/excelUtils";
import { useToast } from "../components/Toast";
import styles from "./CheckIn.module.css";

const CheckIn = () => {
  const toast = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReg, setSelectedReg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({ checkInStatus: "Pending" });

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

  const paidList = useMemo(() => {
    return registrations.filter((r) => r.paid);
  }, [registrations]);

  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return paidList;
    return paidList.filter(
      (r) =>
        r.name?.toLowerCase().includes(query) ||
        r.phone?.toLowerCase().includes(query)
    );
  }, [paidList, searchQuery]);

  const stats = useMemo(() => {
    const total = paidList.length;
    const checkedIn = paidList.filter((r) => r.checkInStatus === "Checked In").length;
    const pending = paidList.filter((r) => r.checkInStatus === "Pending" || !r.checkInStatus).length;
    const cancelled = paidList.filter((r) => r.checkInStatus === "Cancelled").length;
    return {
      total,
      checkedIn,
      pending,
      cancelled
    };
  }, [paidList]);

  const handleOpenEditModal = (reg) => {
    setSelectedReg(reg);
    setEditForm({ checkInStatus: reg.checkInStatus || "Pending" });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ordinationService.updateRegistration(selectedReg.id, {
        name: selectedReg.name,
        phone: selectedReg.phone,
        paid: selectedReg.paid,
        checkInStatus: editForm.checkInStatus
      });
      toast.success("Check-in status updated successfully.");
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    if (paidList.length === 0) {
      toast.error("No paid registrations available to export.");
      return;
    }
    try {
      exportOrdinationsToExcel(paidList);
      toast.success("Excel file downloaded successfully.");
    } catch {
      toast.error("Failed to export Excel.");
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === "Checked In") return styles.badgeCheckedIn;
    if (status === "Cancelled") return styles.badgeCancelled;
    return styles.badgePending;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Event Check-In Terminal</h1>
        <p className={styles.subtitle}>
          Track event arrivals, check in attendees who completed payment, and manage guest passes.
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Total Paid</span>
            <FiUsers className={styles.statIcon} size={20} />
          </div>
          <p className={styles.statValue}>{stats.total}</p>
          <span className={styles.statLabel}>Registrations cleared</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Checked In</span>
            <FiCheckCircle className={styles.statIcon} size={20} style={{ color: "#10b981" }} />
          </div>
          <p className={styles.statValue}>{stats.checkedIn}</p>
          <span className={styles.statLabel}>Admitted to ordination</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Pending Check-In</span>
            <FiClock className={styles.statIcon} size={20} style={{ color: "#f59e0b" }} />
          </div>
          <p className={styles.statValue}>{stats.pending}</p>
          <span className={styles.statLabel}>Awaiting arrival</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Cancelled</span>
            <FiSlash className={styles.statIcon} size={20} style={{ color: "#ef4444" }} />
          </div>
          <p className={styles.statValue}>{stats.cancelled}</p>
          <span className={styles.statLabel}>Cancelled guest passes</span>
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
        <button onClick={handleExport} className={styles.exportBtn}>
          <FiDownload size={18} />
          <span>Export Excel</span>
        </button>
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className="skeleton" style={{ height: "200px", borderRadius: "8px" }} />
        ) : filteredList.length === 0 ? (
          <div className={styles.emptyBlockText}>No paid attendee registrations found.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Phone Number</th>
                <th className={styles.th}>Check-In Status</th>
                <th className={styles.th} style={{ width: "80px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((reg, index) => (
                <tr key={reg.id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                    {index + 1}
                  </td>
                  <td className={styles.td} style={{ fontWeight: 600 }}>{reg.name}</td>
                  <td className={`${styles.td} ${styles.phoneCell}`}>{reg.phone}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getStatusBadgeClass(reg.checkInStatus)}`}>
                      {reg.checkInStatus || "Pending"}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleOpenEditModal(reg)}
                      className={styles.editActionBtn}
                      aria-label="Edit check-in status"
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

      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Update Check-In Status</h3>
              <button onClick={() => setShowEditModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Attendee Name</span>
                <span className={styles.infoValue}>{selectedReg?.name}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Phone Number</span>
                <span className={styles.infoValue}>{selectedReg?.phone}</span>
              </div>

              <div className={styles.fg}>
                <label>Check-In Status</label>
                <select
                  value={editForm.checkInStatus}
                  onChange={(e) => setEditForm({ ...editForm, checkInStatus: e.target.value })}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Checked In">Checked In</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckIn;
