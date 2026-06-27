import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiPlus, FiCalendar, FiX, FiCheckSquare } from "react-icons/fi";
import { financeService } from "../services/financeService";
import { useToast } from "../components/Toast";
import styles from "./EventsModule.module.css";

const EventsModule = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    description: "",
    remarks: "",
    status: "Active",
    routePage: ""
  });

  useEffect(() => {
    const unsubEvents = financeService.subscribeEvents((data) => {
      setEvents(data);
      setLoading(false);
    });
    const unsubReceipts = financeService.subscribeReceipts((data) => {
      setReceipts(data);
    });
    const unsubPayments = financeService.subscribePayments((data) => {
      setPayments(data);
    });

    return () => {
      unsubEvents();
      unsubReceipts();
      unsubPayments();
    };
  }, []);

  const eventsWithStats = useMemo(() => {
    return events.map(ev => {
      const evReceipts = receipts.filter(r => r.eventId === ev.id);
      const evPayments = payments.filter(p => p.eventId === ev.id);

      const totalCollected = evReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalExpenses = evPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = totalCollected - totalExpenses;

      return {
        ...ev,
        totalCollected,
        totalExpenses,
        balance,
        surplusOrDeficit: balance >= 0 ? "Surplus" : "Deficit"
      };
    });
  }, [events, receipts, payments]);

  const filteredEvents = useMemo(() => {
    if (statusFilter === "All") return eventsWithStats;
    return eventsWithStats.filter(e => e.status === statusFilter);
  }, [eventsWithStats, statusFilter]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.endDate || !form.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const newEv = await financeService.addEvent(form);
      toast.success("Event created successfully.");
      setShowAddModal(false);
      navigate(`${newEv.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Fetching association events ledger...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Event Financial Registers</h2>
          <p className={styles.subtitle}>
            Independent balance tracking worksheets, registry surplus analyses, and audit logs for events.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link to="/ordination" className={styles.ordinationLinkBtn}>
            <FiCheckSquare size={16} />
            <span>Ordination Register</span>
          </Link>
          <button onClick={() => setShowAddModal(true)} className={styles.addBtn}>
            <FiPlus />
            <span>New Event</span>
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <button
            onClick={() => setStatusFilter("All")}
            className={`${styles.filterTab} ${statusFilter === "All" ? styles.filterTabActive : ""}`}
          >
            All Events ({eventsWithStats.length})
          </button>
          <button
            onClick={() => setStatusFilter("Active")}
            className={`${styles.filterTab} ${statusFilter === "Active" ? styles.filterTabActive : ""}`}
          >
            Active ({eventsWithStats.filter(e => e.status === "Active").length})
          </button>
          <button
            onClick={() => setStatusFilter("Completed")}
            className={`${styles.filterTab} ${statusFilter === "Completed" ? styles.filterTabActive : ""}`}
          >
            Completed ({eventsWithStats.filter(e => e.status === "Completed").length})
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className={styles.emptyState}>
          <FiCalendar size={36} />
          <h3>No Events Found</h3>
          <p>Create a new event profile to begin tracking independent event collections and expenditures.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredEvents.map((ev) => (
            <div key={ev.id} className={styles.card} onClick={() => navigate(`${ev.id}`)}>
              <div className={styles.cardHeader}>
                <span className={styles.dateRange}>{ev.startDate} to {ev.endDate}</span>
                <span className={`${styles.statusLabel} ${ev.status === "Active" ? styles.statusActive : styles.statusCompleted}`}>
                  {ev.status}
                </span>
              </div>
              <h3 className={styles.eventName}>{ev.name}</h3>
              <p className={styles.eventDesc}>{ev.description}</p>
              
              <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Collected</span>
                  <span className={styles.collectedVal}>{formatCurrency(ev.totalCollected)}</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Expenses</span>
                  <span className={styles.expensesVal}>{formatCurrency(ev.totalExpenses)}</span>
                </div>
                <div className={`${styles.statBox} ${styles.statBoxFull}`}>
                  <span className={styles.statLabel}>Net Balance</span>
                  <div className={styles.balanceRow}>
                    <span className={`${styles.balanceVal} ${ev.balance >= 0 ? styles.positiveBalance : styles.negativeBalance}`}>
                      {formatCurrency(ev.balance)}
                    </span>
                    <span className={`${styles.surplusBadge} ${ev.balance >= 0 ? styles.badgeSurplus : styles.badgeDeficit}`}>
                      {ev.surplusOrDeficit}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className={styles.cardFooter}>
                <span>Manage Worksheets &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Create Event Worksheet</h3>
              <button onClick={() => setShowAddModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Event Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Feast 2026, Charity Cricket League"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Description *</label>
                  <textarea
                    placeholder="Provide event details or scheduling summary..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    rows={2}
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Initial Opening Remarks</label>
                  <textarea
                    placeholder="Optional details or target goals..."
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Route Page</label>
                  <input
                    type="text"
                    placeholder="e.g. easter-2026 (leave blank for no route page)"
                    value={form.routePage || ""}
                    onChange={(e) => setForm({ ...form, routePage: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Worksheet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsModule;
