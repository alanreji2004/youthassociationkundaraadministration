import { useState, useEffect, useMemo } from "react";
import { FiPlus, FiSearch, FiEdit3, FiTrash2, FiX } from "react-icons/fi";
import { financeService } from "../services/financeService";
import { useToast } from "../components/Toast";
import styles from "./PaymentsModule.module.css";

const ITEMS_PER_PAGE = 10;
const CATEGORIES = [
  "Food Expenses",
  "Travel Expenses",
  "Program Expenses",
  "Printing",
  "Equipment",
  "Charity Activities",
  "Utility Payments",
  "Miscellaneous Expenses"
];

const PaymentsModule = () => {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmAdd, setShowConfirmAdd] = useState(false);

  const [form, setForm] = useState({
    paymentNumber: "",
    date: new Date().toISOString().split("T")[0],
    category: "Program Expenses",
    paidTo: "",
    description: "",
    amount: "",
    remarks: "",
    eventId: ""
  });
  
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubPayments = financeService.subscribePayments((data) => {
      setPayments(data);
      setLoading(false);
    });
    const unsubEvents = financeService.subscribeEvents((data) => {
      setEvents(data);
    });

    return () => {
      unsubPayments();
      unsubEvents();
    };
  }, []);

  const nextPaymentNumber = useMemo(() => {
    if (payments.length === 0) return "PAY-1001";
    const numbers = payments
      .map(p => {
        const match = p.paymentNumber?.match(/PAY-(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(n => n !== null);
    if (numbers.length === 0) return "PAY-1001";
    return `PAY-${Math.max(...numbers) + 1}`;
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        p.description?.toLowerCase().includes(q) ||
        p.paymentNumber?.toLowerCase().includes(q) ||
        p.paidTo?.toLowerCase().includes(q) ||
        p.remarks?.toLowerCase().includes(q);

      const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;

      let matchesRange = true;
      if (startDate) matchesRange = matchesRange && p.date >= startDate;
      if (endDate) matchesRange = matchesRange && p.date <= endDate;

      return matchesSearch && matchesCategory && matchesRange;
    });
  }, [payments, searchQuery, categoryFilter, startDate, endDate]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE) || 1;



  const handleOpenAddModal = () => {
    setForm({
      paymentNumber: nextPaymentNumber,
      date: new Date().toISOString().split("T")[0],
      category: "Program Expenses",
      paidTo: "",
      description: "",
      amount: "",
      remarks: "",
      eventId: ""
    });
    setShowConfirmAdd(false);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (p) => {
    setForm({
      paymentNumber: p.paymentNumber,
      date: p.date,
      category: p.category,
      paidTo: p.paidTo,
      description: p.description,
      amount: String(p.amount),
      remarks: p.remarks || "",
      eventId: p.eventId || ""
    });
    setEditingId(p.id);
    setShowEditModal(true);
  };

  const handleOpenDeleteModal = (id) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.paymentNumber.trim() || !form.date || !form.paidTo.trim() || !form.description.trim() || parseFloat(form.amount) <= 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    setShowConfirmAdd(true);
  };

  const executeAdd = async () => {
    setIsSubmitting(true);
    try {
      await financeService.addPayment(form);
      toast.success("Payment voucher successfully posted to ledger Cash Book.");
      setShowAddModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.paidTo.trim() || !form.description.trim() || parseFloat(form.amount) <= 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.updatePayment(editingId, form);
      toast.success("Payment voucher modifications successfully updated and audited.");
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    setIsSubmitting(true);
    try {
      await financeService.deletePayment(deletingId);
      toast.success("Payment entry successfully deleted (soft-deleted).");
      setShowDeleteModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const getEventName = (id) => {
    const ev = events.find(e => e.id === id);
    return ev ? ev.name : "N/A";
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading payments journal...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Payments Register</h2>
          <p className={styles.subtitle}>
            Record and review all cash disbursements, organizational expenses, utility payments, and charity flows.
          </p>
        </div>
        <button onClick={handleOpenAddModal} className={styles.addBtn}>
          <FiPlus />
          <span>New Payment</span>
        </button>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search voucher number, paid to, description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            className={styles.selectFilter}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by Category"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <span className={styles.dateLabel}>From:</span>
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter start date"
          />

          <span className={styles.dateLabel}>To:</span>
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter end date"
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Payment No.</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Category</th>
                <th className={styles.th}>Paid To</th>
                <th className={styles.th}>Description</th>
                <th className={styles.th}>Event Linkage</th>
                <th className={`${styles.th} ${styles.thAmount}`}>Amount</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.emptyCell}>
                    No payment postings recorded matching the filters.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id} className={styles.tr}>
                    <td className={styles.refCell}>{p.paymentNumber}</td>
                    <td className={styles.dateCell}>{p.date}</td>
                    <td>
                      <span className={styles.categoryBadge}>{p.category}</span>
                    </td>
                    <td className={styles.boldText}>{p.paidTo}</td>
                    <td>{p.description}</td>
                    <td className={styles.eventLink}>
                      {p.eventId ? getEventName(p.eventId) : "—"}
                    </td>
                    <td className={`${styles.amountCell} ${styles.paymentText}`}>
                      {formatCurrency(p.amount)}
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button onClick={() => handleOpenEditModal(p)} className={styles.editBtn} title="Edit Record">
                          <FiEdit3 size={14} />
                        </button>
                        <button onClick={() => handleOpenDeleteModal(p.id)} className={styles.deleteBtn} title="Soft Delete">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Showing <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> to{" "}
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)}</strong> of{" "}
              <strong>{filteredPayments.length}</strong> payment postings
            </span>

            <div className={styles.paginationBtns}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className={styles.pageIndicator}>
                {currentPage} of {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{showConfirmAdd ? "Confirm Payment Voucher Verification" : "Issue Outbound Payment Voucher"}</h3>
              <button onClick={() => setShowAddModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>

            {!showConfirmAdd ? (
              <form onSubmit={handleAddSubmit} className={styles.modalForm}>
                <div className={styles.modalGrid}>
                  <div className={styles.fg}>
                    <label>Payment Number *</label>
                    <input
                      type="text"
                      value={form.paymentNumber}
                      onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.fg}>
                    <label>Date *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.fg}>
                    <label>Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      required
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.fg}>
                    <label>Amount (INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.fg}>
                    <label>Paid To / Vendor *</label>
                    <input
                      type="text"
                      placeholder="e.g. Caterer, Utility provider, Member"
                      value={form.paidTo}
                      onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.fg}>
                    <label>Event Linkage (Optional)</label>
                    <select
                      value={form.eventId}
                      onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                    >
                      <option value="">No linked event</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={`${styles.fg} ${styles.fgFull}`}>
                    <label>Description *</label>
                    <textarea
                      placeholder="Expense particulars detail..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                      rows={2}
                    />
                  </div>

                  <div className={`${styles.fg} ${styles.fgFull}`}>
                    <label>Internal Audit Remarks</label>
                    <textarea
                      placeholder="Optional notes for auditors..."
                      value={form.remarks}
                      onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setShowAddModal(false)} className={styles.modalCancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.modalConfirmBtn}>
                    Verify Details
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.confirmWrapper}>
                <div className={styles.confirmWarning}>
                  Please review this payment entry. Once posted, it will immediately decrease the Net Balance and cannot be removed without an audit log.
                </div>
                
                <table className={styles.confirmTable}>
                  <tbody>
                    <tr>
                      <th>Voucher Number</th>
                      <td>{form.paymentNumber}</td>
                    </tr>
                    <tr>
                      <th>Post Date</th>
                      <td>{form.date}</td>
                    </tr>
                    <tr>
                      <th>Category</th>
                      <td>{form.category}</td>
                    </tr>
                    <tr>
                      <th>Amount</th>
                      <td className={styles.confirmAmount}>{formatCurrency(form.amount)}</td>
                    </tr>
                    <tr>
                      <th>Paid To / Vendor</th>
                      <td>{form.paidTo}</td>
                    </tr>
                    <tr>
                      <th>Event Association</th>
                      <td>{form.eventId ? getEventName(form.eventId) : "None"}</td>
                    </tr>
                    <tr>
                      <th>Particulars</th>
                      <td>{form.description}</td>
                    </tr>
                    <tr>
                      <th>Remarks</th>
                      <td>{form.remarks || "—"}</td>
                    </tr>
                  </tbody>
                </table>

                <div className={styles.modalActions} style={{ marginTop: "24px" }}>
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmAdd(false)} 
                    className={styles.modalCancelBtn}
                    disabled={isSubmitting}
                  >
                    Edit Form
                  </button>
                  <button 
                    type="button" 
                    onClick={executeAdd} 
                    className={`${styles.modalConfirmBtn} ${styles.saveBtn}`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Posting..." : "Confirm & Post Payment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Edit Outbound Payment Posting</h3>
              <button onClick={() => setShowEditModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={styles.fg}>
                  <label>Payment Number (Locked)</label>
                  <input type="text" value={form.paymentNumber} disabled />
                </div>

                <div className={styles.fg}>
                  <label>Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fg}>
                  <label>Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Paid To / Vendor *</label>
                  <input
                    type="text"
                    value={form.paidTo}
                    onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Event Linkage (Optional)</label>
                  <select
                    value={form.eventId}
                    onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                  >
                    <option value="">No linked event</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    rows={2}
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Internal Audit Remarks</label>
                  <textarea
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update & Log Audit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: "450px" }}>
            <div className={styles.modalHeader}>
              <h3>Delete Payment Entry</h3>
              <button onClick={() => setShowDeleteModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <div className={styles.confirmWrapper}>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Are you sure you want to delete this payment voucher? This action will perform a soft-delete, leaving a full history inside the audit logs.
              </p>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowDeleteModal(false)} 
                  className={styles.modalCancelBtn}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={executeDelete} 
                  className={`${styles.modalConfirmBtn} ${styles.deleteBtnDanger}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsModule;
