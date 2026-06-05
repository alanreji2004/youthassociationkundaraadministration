import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, 
  FiAlertCircle, 
  FiFileText, 
  FiDownload, 
  FiX, 
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiFile
} from "react-icons/fi";
import { financeService } from "../services/financeService";
import { useToast } from "../components/Toast";
import styles from "./EventDetails.module.css";

const INCOME_CATEGORIES = ["Event Collection", "Sponsorship", "Donation", "Fundraising", "Other Income"];
const EXPENSE_CATEGORIES = [
  "Program Expenses",
  "Food Expenses",
  "Travel Expenses",
  "Printing",
  "Equipment",
  "Charity Activities",
  "Utility Payments",
  "Miscellaneous Expenses"
];

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("summary");
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  const [eventForm, setEventForm] = useState({ name: "", startDate: "", endDate: "", description: "", remarks: "", status: "Active" });
  const [incomeForm, setIncomeForm] = useState({ receiptNumber: "", date: "", category: "Event Collection", source: "", description: "", amount: "", remarks: "" });
  const [expenseForm, setExpenseForm] = useState({ paymentNumber: "", date: "", category: "Program Expenses", paidTo: "", description: "", amount: "", remarks: "" });
  const [noteForm, setNoteForm] = useState({ content: "" });
  const [docForm, setDocForm] = useState({ name: "", type: "Invoice", url: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const unsubDocs = financeService.subscribeEventDocuments(eventId, (data) => setDocuments(data));
    const unsubNotes = financeService.subscribeEventNotes(eventId, (data) => setNotes(data));
    const unsubAudits = financeService.subscribeEventAuditLogs(eventId, (data) => setAuditLogs(data));

    return () => {
      unsubEvents();
      unsubReceipts();
      unsubPayments();
      unsubDocs();
      unsubNotes();
      unsubAudits();
    };
  }, [eventId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const eventItem = useMemo(() => {
    return events.find(e => e.id === eventId);
  }, [events, eventId]);

  const eventReceipts = useMemo(() => {
    return receipts.filter(r => r.eventId === eventId);
  }, [receipts, eventId]);

  const eventPayments = useMemo(() => {
    return payments.filter(p => p.eventId === eventId);
  }, [payments, eventId]);

  const financialSummary = useMemo(() => {
    const totalCollected = eventReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpenses = eventPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = totalCollected - totalExpenses;
    return {
      totalCollected,
      totalExpenses,
      balance,
      surplusOrDeficit: balance >= 0 ? "Surplus" : "Deficit"
    };
  }, [eventReceipts, eventPayments]);

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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const handleOpenEditModal = () => {
    if (!eventItem) return;
    setEventForm({
      name: eventItem.name,
      startDate: eventItem.startDate,
      endDate: eventItem.endDate,
      description: eventItem.description,
      remarks: eventItem.remarks || "",
      status: eventItem.status
    });
    setShowEditModal(true);
    setShowActionsMenu(false);
  };

  const handleOpenAddIncomeModal = () => {
    setIncomeForm({
      receiptNumber: nextReceiptNumber,
      date: new Date().toISOString().split("T")[0],
      category: "Event Collection",
      source: "",
      description: `Collection for ${eventItem?.name}`,
      amount: "",
      remarks: ""
    });
    setShowAddIncomeModal(true);
    setShowActionsMenu(false);
  };

  const handleOpenAddExpenseModal = () => {
    setExpenseForm({
      paymentNumber: nextPaymentNumber,
      date: new Date().toISOString().split("T")[0],
      category: "Program Expenses",
      paidTo: "",
      description: `Expense for ${eventItem?.name}`,
      amount: "",
      remarks: ""
    });
    setShowAddExpenseModal(true);
    setShowActionsMenu(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!eventForm.name.trim() || !eventForm.startDate || !eventForm.endDate || !eventForm.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.updateEvent(eventId, eventForm);
      toast.success("Event details updated.");
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddIncomeSubmit = async (e) => {
    e.preventDefault();
    if (!incomeForm.receiptNumber.trim() || !incomeForm.date || !incomeForm.source.trim() || !incomeForm.description.trim() || parseFloat(incomeForm.amount) <= 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.addReceipt({ ...incomeForm, eventId });
      toast.success("Income entry registered successfully.");
      setShowAddIncomeModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.paymentNumber.trim() || !expenseForm.date || !expenseForm.paidTo.trim() || !expenseForm.description.trim() || parseFloat(expenseForm.amount) <= 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.addPayment({ ...expenseForm, eventId });
      toast.success("Expense entry registered successfully.");
      setShowAddExpenseModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteForm.content.trim()) {
      toast.error("Note content cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.addEventNote(eventId, noteForm.content);
      toast.success("Note added successfully.");
      setShowAddNoteModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDocSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.name.trim()) {
      toast.error("Document name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.addEventDocument(eventId, docForm);
      toast.success("Document linked successfully.");
      setShowAddDocModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    setIsSubmitting(true);
    try {
      await financeService.deleteEvent(eventId);
      toast.success("Event worksheet successfully deleted.");
      setShowDeleteModal(false);
      navigate("../events");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Fetching event profile worksheets...</span>
      </div>
    );
  }

  if (!eventItem) {
    return (
      <div className={styles.emptyState}>
        <FiAlertCircle size={40} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Event Worksheet Not Found</h2>
        <p className={styles.emptyText}>The record you are attempting to review does not exist or has been removed.</p>
        <Link to="../events" className={styles.backLink}>
          Back to Events Register
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link to="../events" className={styles.backBtn} aria-label="Go back">
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <div className={styles.titleRow}>
              <h2 className={styles.eventName}>{eventItem.name}</h2>
              <span className={`${styles.statusBadge} ${eventItem.status === "Active" ? styles.statusActive : styles.statusCompleted}`}>
                {eventItem.status}
              </span>
            </div>
            <p className={styles.dateSubText}>{eventItem.startDate} to {eventItem.endDate}</p>
          </div>
        </div>

        <div className={styles.topRight}>
          <div ref={actionsMenuRef} className={styles.actionsDropdownWrapper}>
            <button
              type="button"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className={styles.actionsBtn}
            >
              <span>Actions</span>
              <span className={styles.caret} />
            </button>
            {showActionsMenu && (
              <div className={styles.dropdownMenu}>
                <button type="button" onClick={handleOpenEditModal} className={styles.dropdownItem}>
                  <FiEdit3 className={styles.itemIcon} />
                  <span>Edit Details</span>
                </button>
                <button type="button" onClick={handleOpenAddIncomeModal} className={styles.dropdownItem}>
                  <FiPlus className={styles.itemIcon} />
                  <span>Add Income Posting</span>
                </button>
                <button type="button" onClick={handleOpenAddExpenseModal} className={styles.dropdownItem}>
                  <FiPlus className={styles.itemIcon} />
                  <span>Add Expense Posting</span>
                </button>
                <div className={styles.menuDivider} />
                <button type="button" onClick={() => { setShowAddNoteModal(true); setNoteForm({ content: "" }); setShowActionsMenu(false); }} className={styles.dropdownItem}>
                  <FiFileText className={styles.itemIcon} />
                  <span>Add Note</span>
                </button>
                <button type="button" onClick={() => { setShowAddDocModal(true); setDocForm({ name: "", type: "Invoice", url: "" }); setShowActionsMenu(false); }} className={styles.dropdownItem}>
                  <FiFile className={styles.itemIcon} />
                  <span>Link Document</span>
                </button>
                <div className={styles.menuDivider} />
                <button type="button" onClick={handlePrint} className={styles.dropdownItem}>
                  <FiFileText className={styles.itemIcon} />
                  <span>Print Summary Sheet</span>
                </button>
                <button type="button" onClick={() => { setShowDeleteModal(true); setShowActionsMenu(false); }} className={`${styles.dropdownItem} ${styles.dangerItem}`}>
                  <FiTrash2 className={styles.itemIcon} />
                  <span>Delete Worksheet</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.mainSummaryCard}>
          <div className={styles.summaryValuesGrid}>
            <div className={styles.summaryValueBlock}>
              <span className={styles.valLabel}>Total Collected</span>
              <span className={`${styles.valAmount} ${styles.collectedText}`}>{formatCurrency(financialSummary.totalCollected)}</span>
            </div>
            <div className={styles.summaryValueBlock}>
              <span className={styles.valLabel}>Total Expenses</span>
              <span className={`${styles.valAmount} ${styles.expensesText}`}>{formatCurrency(financialSummary.totalExpenses)}</span>
            </div>
            <div className={styles.summaryValueBlock}>
              <span className={styles.valLabel}>Net Balance</span>
              <div className={styles.balanceCol}>
                <span className={`${styles.valAmount} ${financialSummary.balance >= 0 ? styles.collectedText : styles.expensesText}`}>
                  {formatCurrency(financialSummary.balance)}
                </span>
                <span className={`${styles.surplusBadge} ${financialSummary.balance >= 0 ? styles.badgeSurplus : styles.badgeDeficit}`}>
                  {financialSummary.surplusOrDeficit}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.metadataGrid}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Description:</span>
              <span className={styles.metaValue}>{eventItem.description}</span>
            </div>
            {eventItem.remarks && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Remarks:</span>
                <span className={styles.metaValue}>{eventItem.remarks}</span>
              </div>
            )}
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Created By:</span>
              <span className={styles.metaValue}>{eventItem.createdBy || "System"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabsHeader}>
          <button
            onClick={() => setActiveTab("summary")}
            className={`${styles.tabBtn} ${activeTab === "summary" ? styles.tabBtnActive : ""}`}
          >
            Financial Summary
          </button>
          <button
            onClick={() => setActiveTab("incomes")}
            className={`${styles.tabBtn} ${activeTab === "incomes" ? styles.tabBtnActive : ""}`}
          >
            Incomes ({eventReceipts.length})
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`${styles.tabBtn} ${activeTab === "expenses" ? styles.tabBtnActive : ""}`}
          >
            Expenses ({eventPayments.length})
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`${styles.tabBtn} ${activeTab === "documents" ? styles.tabBtnActive : ""}`}
          >
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`${styles.tabBtn} ${activeTab === "notes" ? styles.tabBtnActive : ""}`}
          >
            Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab("audits")}
            className={`${styles.tabBtn} ${activeTab === "audits" ? styles.tabBtnActive : ""}`}
          >
            Worksheet Audits
          </button>
        </div>

        <div className={styles.tabsContent}>
          {activeTab === "summary" && (
            <div className={styles.summaryTabContent}>
              <h3 className={styles.subSectionTitle}>Dynamic Contribution Balance Analysis</h3>
              <div className={styles.summaryDetailGrid}>
                <div className={styles.summaryDetailsCard}>
                  <h4 className={styles.cardDetailTitle}>Receipts Collections Breakdown</h4>
                  <table className={styles.detailsTable}>
                    <tbody>
                      {INCOME_CATEGORIES.map(cat => {
                        const sum = eventReceipts.filter(r => r.category === cat).reduce((s, r) => s + r.amount, 0);
                        return (
                          <tr key={cat}>
                            <th>{cat}</th>
                            <td className={styles.amountText}>{formatCurrency(sum)}</td>
                          </tr>
                        );
                      })}
                      <tr className={styles.totalRow}>
                        <th>Total Collected Inflows</th>
                        <td className={styles.amountText}>{formatCurrency(financialSummary.totalCollected)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className={styles.summaryDetailsCard}>
                  <h4 className={styles.cardDetailTitle}>Payments Expense Breakdown</h4>
                  <table className={styles.detailsTable}>
                    <tbody>
                      {EXPENSE_CATEGORIES.map(cat => {
                        const sum = eventPayments.filter(p => p.category === cat).reduce((s, p) => s + p.amount, 0);
                        return (
                          <tr key={cat}>
                            <th>{cat}</th>
                            <td className={styles.amountText}>{formatCurrency(sum)}</td>
                          </tr>
                        );
                      })}
                      <tr className={styles.totalRow}>
                        <th>Total Expense Outflows</th>
                        <td className={styles.amountText}>{formatCurrency(financialSummary.totalExpenses)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "incomes" && (
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr>
                    <th>Voucher Number</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Depositor Source</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {eventReceipts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={styles.emptyTableText}>No receipts registered for this event.</td>
                    </tr>
                  ) : (
                    eventReceipts.map(r => (
                      <tr key={r.id} className={styles.tr}>
                        <td className={styles.refCell}>{r.receiptNumber}</td>
                        <td className={styles.dateCell}>{r.date}</td>
                        <td><span className={styles.badge}>{r.category}</span></td>
                        <td className={styles.boldText}>{r.source}</td>
                        <td>{r.description}</td>
                        <td className={`${styles.amountCell} ${styles.collectedText}`}>{formatCurrency(r.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "expenses" && (
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr>
                    <th>Voucher Number</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Paid To Vendor</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {eventPayments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={styles.emptyTableText}>No payments registered for this event.</td>
                    </tr>
                  ) : (
                    eventPayments.map(p => (
                      <tr key={p.id} className={styles.tr}>
                        <td className={styles.refCell}>{p.paymentNumber}</td>
                        <td className={styles.dateCell}>{p.date}</td>
                        <td><span className={styles.badge}>{p.category}</span></td>
                        <td className={styles.boldText}>{p.paidTo}</td>
                        <td>{p.description}</td>
                        <td className={`${styles.amountCell} ${styles.expensesText}`}>{formatCurrency(p.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "documents" && (
            <div className={styles.docsTab}>
              {documents.length === 0 ? (
                <div className={styles.emptyTableText}>No documents linked to this event worksheet.</div>
              ) : (
                <div className={styles.docsGrid}>
                  {documents.map(d => (
                    <div key={d.id} className={styles.docCard}>
                      <FiFile size={24} className={styles.docIcon} />
                      <div className={styles.docInfo}>
                        <h4 className={styles.docName}>{d.name}</h4>
                        <span className={styles.docMeta}>{d.type} &bull; Uploaded: {new Date(d.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      <div className={styles.docActions}>
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className={styles.docBtn} title="Open Document"><FiDownload size={14} /></a>
                        <button onClick={async () => { try { await financeService.deleteEventDocument(d.id); toast.success("Document deleted."); } catch(err) { toast.error(err.message); } }} className={`${styles.docBtn} ${styles.deleteBtn}`} title="Delete"><FiTrash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className={styles.notesTab}>
              {notes.length === 0 ? (
                <div className={styles.emptyTableText}>No administrative notes posted on this event worksheet.</div>
              ) : (
                <div className={styles.notesGrid}>
                  {notes.map(n => (
                    <div key={n.id} className={styles.noteCard}>
                      <div className={styles.noteHeader}>
                        <span className={styles.noteUser}>{n.user}</span>
                        <div className={styles.noteRight}>
                          <span className={styles.noteTime}>{new Date(n.timestamp).toLocaleString()}</span>
                          <button onClick={async () => { try { await financeService.deleteEventNote(n.id); toast.success("Note removed."); } catch(err) { toast.error(err.message); } }} className={styles.noteDelete} title="Remove Note"><FiTrash2 size={12} /></button>
                        </div>
                      </div>
                      <p className={styles.noteContent}>{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "audits" && (
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>State progression</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className={styles.emptyTableText}>No change logs recorded.</td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className={styles.tr}>
                        <td className={styles.dateCell}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td className={styles.boldText}>{log.user}</td>
                        <td><span className={styles.auditBadge}>{log.action}</span></td>
                        <td>
                          <div className={styles.progressionDetails}>
                            {log.previousValue && (
                              <div className={styles.oldBlock}>
                                <span className={styles.blockPrefix}>OLD:</span>
                                <code>{log.previousValue}</code>
                              </div>
                            )}
                            <div className={styles.newBlock}>
                              <span className={styles.blockPrefix}>NEW:</span>
                              <code>{log.updatedValue}</code>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Edit Event Worksheet</h3>
              <button onClick={() => setShowEditModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Event Name *</label>
                  <input
                    type="text"
                    value={eventForm.name}
                    onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={eventForm.endDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Status *</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Description *</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    required
                    rows={2}
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Worksheet Internal Remarks</label>
                  <textarea
                    value={eventForm.remarks}
                    onChange={(e) => setEventForm({ ...eventForm, remarks: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddIncomeModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Event Income Posting</h3>
              <button onClick={() => setShowAddIncomeModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddIncomeSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={styles.fg}>
                  <label>Receipt Number *</label>
                  <input
                    type="text"
                    value={incomeForm.receiptNumber}
                    onChange={(e) => setIncomeForm({ ...incomeForm, receiptNumber: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Date *</label>
                  <input
                    type="date"
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Category *</label>
                  <select
                    value={incomeForm.category}
                    onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                    required
                  >
                    {INCOME_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fg}>
                  <label>Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Source / Depositor *</label>
                  <input
                    type="text"
                    placeholder="e.g. Registrant name, Sponsor"
                    value={incomeForm.source}
                    onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })}
                    required
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Description *</label>
                  <textarea
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                    required
                    rows={2}
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Remarks</label>
                  <textarea
                    value={incomeForm.remarks}
                    onChange={(e) => setIncomeForm({ ...incomeForm, remarks: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddIncomeModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Posting..." : "Post Income"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpenseModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Event Expense Posting</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddExpenseSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={styles.fg}>
                  <label>Payment Number *</label>
                  <input
                    type="text"
                    value={expenseForm.paymentNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentNumber: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Date *</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentNumber: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    required
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fg}>
                  <label>Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Paid To / Vendor *</label>
                  <input
                    type="text"
                    placeholder="e.g. Vendor name, Member reimbursed"
                    value={expenseForm.paidTo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                    required
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Description *</label>
                  <textarea
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    required
                    rows={2}
                  />
                </div>

                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Remarks</label>
                  <textarea
                    value={expenseForm.remarks}
                    onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddExpenseModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Posting..." : "Post Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddNoteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: "450px" }}>
            <div className={styles.modalHeader}>
              <h3>Add Administrative Note</h3>
              <button onClick={() => setShowAddNoteModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddNoteSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Note Content *</label>
                  <textarea
                    placeholder="Type administrative note or comment here..."
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    required
                    rows={4}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddNoteModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddDocModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: "450px" }}>
            <div className={styles.modalHeader}>
              <h3>Link Document Attachment</h3>
              <button onClick={() => setShowAddDocModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddDocSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Document Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Catering Invoice, Event Permit"
                    value={docForm.name}
                    onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fg}>
                  <label>Type *</label>
                  <select
                    value={docForm.type}
                    onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
                    required
                  >
                    <option value="Invoice">Invoice</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Permit">Permit</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className={styles.fg}>
                  <label>Document Link URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/file.pdf"
                    value={docForm.url}
                    onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddDocModal(false)} className={styles.modalCancelBtn} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Linking..." : "Link Document"}
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
              <h3>Delete Event Worksheet</h3>
              <button onClick={() => setShowDeleteModal(false)} className={styles.modalCloseBtn} disabled={isSubmitting}>
                <FiX size={20} />
              </button>
            </div>
            <div className={styles.confirmWrapper}>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Are you sure you want to delete this event worksheet? This will perform a soft-delete, hiding it from listings, but all historical audit trails remain preserved.
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
                  onClick={handleDeleteEvent} 
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

export default EventDetails;
