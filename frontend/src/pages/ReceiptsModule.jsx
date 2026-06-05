import { useState, useEffect, useMemo } from "react";
import { FiPlus, FiSearch, FiEdit3, FiTrash2, FiX } from "react-icons/fi";
import { financeService } from "../services/financeService";
import { useToast } from "../components/Toast";
import styles from "./ReceiptsModule.module.css";

const ITEMS_PER_PAGE = 10;
const CATEGORIES = ["Donation", "Sponsorship", "Event Collection", "Fundraising", "Other Income"];

const ReceiptsModule = () => {
  const toast = useToast();
  const [receipts, setReceipts] = useState([]);
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
    receiptNumber: "",
    date: new Date().toISOString().split("T")[0],
    category: "Donation",
    source: "",
    description: "",
    amount: "",
    remarks: "",
    eventId: ""
  });
  
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubReceipts = financeService.subscribeReceipts((data) => {
      setReceipts(data);
      setLoading(false);
    });
    const unsubEvents = financeService.subscribeEvents((data) => {
      setEvents(data);
    });

    return () => {
      unsubReceipts();
      unsubEvents();
    };
  }, []);

  const nextReceiptNumber = useMemo(() => {
    if (receipts.length === 0) return "REC-1001";
    const numbers = receipts
      .map(r => {
        const match = r.receiptNumber?.match(/REC-(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(n => n !== null);
    if (numbers.length === 0) return "REC-1001";
    return `REC-${Math.max(...numbers) + 1}`;
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        r.description?.toLowerCase().includes(q) ||
        r.receiptNumber?.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q);

      const matchesCategory = categoryFilter === "All" || r.category === categoryFilter;

      let matchesRange = true;
      if (startDate) matchesRange = matchesRange && r.date >= startDate;
      if (endDate) matchesRange = matchesRange && r.date <= endDate;

      return matchesSearch && matchesCategory && matchesRange;
    });
  }, [receipts, searchQuery, categoryFilter, startDate, endDate]);

  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReceipts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReceipts, currentPage]);

  const totalPages = Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE) || 1;



  const handleOpenAddModal = () => {
    setForm({
      receiptNumber: nextReceiptNumber,
      date: new Date().toISOString().split("T")[0],
      category: "Donation",
      source: "",
      description: "",
      amount: "",
      remarks: "",
      eventId: ""
    });
    setShowConfirmAdd(false);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (r) => {
    setForm({
      receiptNumber: r.receiptNumber,
      date: r.date,
      category: r.category,
      source: r.source,
      description: r.description,
      amount: String(r.amount),
      remarks: r.remarks || "",
      eventId: r.eventId || ""
    });
    setEditingId(r.id);
    setShowEditModal(true);
  };

  const handleOpenDeleteModal = (id) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.receiptNumber.trim() || !form.date || !form.source.trim() || !form.description.trim() || parseFloat(form.amount) <= 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    setShowConfirmAdd(true);
  };

  const executeAdd = async () => {
    setIsSubmitting(true);
    try {
      await financeService.addReceipt(form);
      toast.success("Receipt successfully registered and posted to Cash Book.");
      setShowAddModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.source.trim() || !form.description.trim() || parseFloat(form.amount) <= 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.updateReceipt(editingId, form);
      toast.success("Receipt modifications successfully updated and audited.");
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
      await financeService.deleteReceipt(deletingId);
      toast.success("Receipt successfully deleted (soft-deleted).");
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
        <span className={styles.loadingText}>Loading receipts journal...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Receipts Registry</h2>
          <p className={styles.subtitle}>
            Register and track all inbound capital, donations, sponsorships, and event collections.
          </p>
        </div>
        <button onClick={handleOpenAddModal} className={styles.addBtn}>
          <FiPlus />
          <span>New Receipt</span>
        </button>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search voucher number, source, description..."
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
                <th className={styles.th}>Receipt No.</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Category</th>
                <th className={styles.th}>Source</th>
                <th className={styles.th}>Description</th>
                <th className={styles.th}>Event Linkage</th>
                <th className={`${styles.th} ${styles.thAmount}`}>Amount</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReceipts.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.emptyCell}>
                    No receipts recorded matching the filters.
                  </td>
                </tr>
              ) : (
                paginatedReceipts.map((r) => (
                  <tr key={r.id} className={styles.tr}>
                    <td className={styles.refCell}>{r.receiptNumber}</td>
                    <td className={styles.dateCell}>{r.date}</td>
                    <td>
                      <span className={styles.categoryBadge}>{r.category}</span>
                    </td>
                    <td className={styles.boldText}>{r.source}</td>
                    <td>{r.description}</td>
                    <td className={styles.eventLink}>
                      {r.eventId ? getEventName(r.eventId) : "—"}
                    </td>
                    <td className={`${styles.amountCell} ${styles.receiptText}`}>
                      {formatCurrency(r.amount)}
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button onClick={() => handleOpenEditModal(r)} className={styles.editBtn} title="Edit Record">
                          <FiEdit3 size={14} />
                        </button>
                        <button onClick={() => handleOpenDeleteModal(r.id)} className={styles.deleteBtn} title="Soft Delete">
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
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredReceipts.length)}</strong> of{" "}
              <strong>{filteredReceipts.length}</strong> receipts
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
              <h3>{showConfirmAdd ? "Confirm Receipt Verification" : "Add Inbound Cash Receipt"}</h3>
              <button onClick={() => setShowAddModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>

            {!showConfirmAdd ? (
              <form onSubmit={handleAddSubmit} className={styles.modalForm}>
                <div className={styles.modalGrid}>
                  <div className={styles.fg}>
                    <label>Receipt Number *</label>
                    <input
                      type="text"
                      value={form.receiptNumber}
                      onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
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
                    <label>Source / Depositor *</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe, ABC Sponsor"
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
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
                      placeholder="Voucher narrative or particulars detail..."
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
                  Please review this entry. Financial entries cannot be deleted, only soft-deleted with full audit logging.
                </div>
                
                <table className={styles.confirmTable}>
                  <tbody>
                    <tr>
                      <th>Voucher Number</th>
                      <td>{form.receiptNumber}</td>
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
                      <th>Source / Depositor</th>
                      <td>{form.source}</td>
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
                    {isSubmitting ? "Posting..." : "Confirm & Post Ledger"}
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
              <h3>Edit Inbound Receipt Posting</h3>
              <button onClick={() => setShowEditModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={styles.fg}>
                  <label>Receipt Number (Locked)</label>
                  <input type="text" value={form.receiptNumber} disabled />
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
                  <label>Source / Depositor *</label>
                  <input
                    type="text"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
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
              <h3>Delete Receipt Entry</h3>
              <button onClick={() => setShowDeleteModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <div className={styles.confirmWrapper}>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Are you sure you want to delete this receipt? This action will perform a soft-delete, hiding it from tables and reports, but leaving a full history inside the audit logs.
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

export default ReceiptsModule;
