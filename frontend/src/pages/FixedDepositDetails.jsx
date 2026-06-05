import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, 
  FiAlertCircle, 
  FiFileText, 
  FiDownload, 
  FiPrinter, 
  FiX, 
  FiPlus,
  FiEdit3,
  FiCornerRightDown,
  FiMaximize2
} from "react-icons/fi";
import { fdService } from "../services/fdService";
import { useToast } from "../components/Toast";
import styles from "./FixedDepositDetails.module.css";

const FixedDepositDetails = () => {
  const { fdId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [fds, setFds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("transactions");
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef(null);

  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);

  const [txForm, setTxForm] = useState({ date: "", type: "Interest Credit", amount: "", description: "", referenceNumber: "" });
  const [noteForm, setNoteForm] = useState({ content: "" });
  const [renewForm, setRenewForm] = useState({ fdNumber: "", bankName: "", branch: "", principalAmount: "", interestRate: "", depositDate: "", maturityDate: "", maturityAmount: "", remarks: "" });
  const [closeForm, setCloseForm] = useState({ closureDate: "", finalAmountReceived: "", remarks: "" });
  const [editForm, setEditForm] = useState({ bankName: "", branch: "", principalAmount: "", interestRate: "", depositDate: "", maturityDate: "", maturityAmount: "", remarks: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setLoading(true);
    });
    const unsubFds = fdService.subscribeFds((data) => {
      setFds(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    const unsubTxs = fdService.subscribeFdTransactions(fdId, (data) => setTransactions(data));
    const unsubEvs = fdService.subscribeFdEvents(fdId, (data) => setEvents(data));
    const unsubNts = fdService.subscribeFdNotes(fdId, (data) => setNotes(data));
    const unsubDocs = fdService.subscribeFdDocuments(fdId, (data) => setDocuments(data));
    const unsubAudits = fdService.subscribeFdAuditLogs(fdId, (data) => setAuditLogs(data));

    return () => {
      unsubFds();
      unsubTxs();
      unsubEvs();
      unsubNts();
      unsubDocs();
      unsubAudits();
    };
  }, [fdId]);

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

  const fd = useMemo(() => {
    return fds.find((f) => f.id === fdId);
  }, [fds, fdId]);

  const parentFd = useMemo(() => {
    if (!fd || !fd.parentFdNumber) return null;
    return fds.find((f) => f.fdNumber === fd.parentFdNumber);
  }, [fds, fd]);

  const childFd = useMemo(() => {
    if (!fd || !fd.childFdNumber) return null;
    return fds.find((f) => f.fdNumber === fd.childFdNumber);
  }, [fds, fd]);

  const daysRemaining = useMemo(() => {
    if (!fd) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maturity = new Date(fd.maturityDate);
    maturity.setHours(0, 0, 0, 0);
    const diffTime = maturity.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [fd]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const getStatusBadgeClass = (status) => {
    if (status === "Closed") return styles.statusClosed;
    if (status === "Renewed") return styles.statusRenewed;
    if (status === "Matured") return styles.statusMatured;
    if (status === "Active") {
      if (daysRemaining <= 30 && daysRemaining > 0) return styles.statusMaturing;
      return styles.statusActive;
    }
    return styles.statusActive;
  };

  const getStatusLabelText = (status) => {
    if (status === "Active" && daysRemaining <= 30 && daysRemaining > 0) {
      return "Maturing Soon";
    }
    return status;
  };

  const handleOpenEditModal = () => {
    if (!fd) return;
    setEditForm({
      bankName: fd.bankName,
      branch: fd.branch,
      principalAmount: fd.principalAmount,
      interestRate: fd.interestRate,
      depositDate: fd.depositDate,
      maturityDate: fd.maturityDate,
      maturityAmount: fd.maturityAmount,
      remarks: fd.remarks || ""
    });
    setShowEditModal(true);
    setShowActionsMenu(false);
  };

  const handleOpenRenewModal = () => {
    if (!fd) return;
    setRenewForm({
      fdNumber: "",
      bankName: fd.bankName,
      branch: fd.branch,
      principalAmount: fd.maturityAmount,
      interestRate: fd.interestRate,
      depositDate: fd.maturityDate,
      maturityDate: "",
      maturityAmount: "",
      remarks: ""
    });
    setShowRenewModal(true);
    setShowActionsMenu(false);
  };

  const handleOpenCloseModal = () => {
    if (!fd) return;
    setCloseForm({
      closureDate: new Date().toISOString().split("T")[0],
      finalAmountReceived: fd.maturityAmount,
      remarks: ""
    });
    setShowCloseModal(true);
    setShowActionsMenu(false);
  };

  const handleOpenAddTxModal = () => {
    setTxForm({
      date: new Date().toISOString().split("T")[0],
      type: "Interest Credit",
      amount: "",
      description: "",
      referenceNumber: ""
    });
    setShowAddTxModal(true);
    setShowActionsMenu(false);
  };



  const handleOpenAddNoteModal = () => {
    setNoteForm({ content: "" });
    setShowAddNoteModal(true);
    setShowActionsMenu(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.bankName.trim() || !editForm.branch.trim() || parseFloat(editForm.principalAmount) <= 0 || parseFloat(editForm.interestRate) < 0 || !editForm.depositDate || !editForm.maturityDate || parseFloat(editForm.maturityAmount) <= 0) {
      toast.error("Please fill all fields correctly.");
      return;
    }
    setIsSubmitting(true);
    try {
      await fdService.updateFixedDeposit(fdId, editForm);
      toast.success("Fixed Deposit details updated.");
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewForm.fdNumber.trim() || !renewForm.bankName.trim() || !renewForm.branch.trim() || parseFloat(renewForm.principalAmount) <= 0 || parseFloat(renewForm.interestRate) < 0 || !renewForm.depositDate || !renewForm.maturityDate || parseFloat(renewForm.maturityAmount) <= 0) {
      toast.error("Please fill all fields correctly.");
      return;
    }
    setIsSubmitting(true);
    try {
      const child = await fdService.renewFixedDeposit(fdId, renewForm);
      toast.success(`FD renewed. New certificate ${child.fdNumber} created.`);
      setShowRenewModal(false);
      navigate(`/financial-accounts/fixed-deposits/${child.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSubmit = (e) => {
    e.preventDefault();
    if (!closeForm.closureDate || parseFloat(closeForm.finalAmountReceived) <= 0) {
      toast.error("Please provide valid closure date and final receipt amount.");
      return;
    }
    setShowCloseConfirmModal(true);
  };

  const executeClose = async () => {
    setIsSubmitting(true);
    try {
      await fdService.closeFixedDeposit(fdId, closeForm);
      toast.success("Fixed Deposit marked as Closed.");
      setShowCloseConfirmModal(false);
      setShowCloseModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTxSubmit = async (e) => {
    e.preventDefault();
    if (!txForm.date || !txForm.type || parseFloat(txForm.amount) <= 0 || !txForm.description.trim()) {
      toast.error("Please provide valid transaction information.");
      return;
    }
    setIsSubmitting(true);
    try {
      await fdService.addFdTransaction(fdId, txForm);
      toast.success("Transaction added to ledger.");
      setShowAddTxModal(false);
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
      await fdService.addFdNote(fdId, noteForm.content);
      toast.success("Administrative note appended.");
      setShowAddNoteModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };



  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.info("No transaction history to export.");
      return;
    }
    const headers = ["Date", "Type", "Description", "Amount", "Reference Number", "Created By"];
    const rows = transactions.map((t) => [
      t.date,
      t.type,
      t.description,
      t.amount,
      t.referenceNumber || "N/A",
      t.createdBy
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fd.fdNumber}_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Statement downloaded.");
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <span className={styles.largeSpinner} />
        <span className={styles.loadingText}>Fetching investment profile...</span>
      </div>
    );
  }

  if (!fd) {
    return (
      <div className={styles.emptyState}>
        <FiAlertCircle size={40} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Fixed Deposit Not Found</h2>
        <p className={styles.emptyText}>The record you are attempting to review does not exist or has been removed.</p>
        <Link to="/financial-accounts/fixed-deposits" className={styles.backLink}>
          Back to Register
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.detailsContainer}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link to="/financial-accounts/fixed-deposits" className={styles.backBtn} aria-label="Go back">
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <div className={styles.titleRow}>
              <h1 className={styles.fdNumberTitle}>{fd.fdNumber}</h1>
              <span className={`${styles.statusBadge} ${getStatusBadgeClass(fd.status)}`}>
                <span className={styles.statusDot} />
                <span>{getStatusLabelText(fd.status)}</span>
              </span>
            </div>
            <p className={styles.bankSubText}>{fd.bankName} &bull; {fd.branch} Branch</p>
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
                  <span>Edit FD Terms</span>
                </button>
                <button 
                  type="button" 
                  onClick={handleOpenRenewModal} 
                  className={styles.dropdownItem}
                  disabled={fd.status !== "Matured"}
                  title={fd.status !== "Matured" ? "Renew is only active when the Fixed Deposit is matured" : ""}
                >
                  <FiCornerRightDown className={styles.itemIcon} />
                  <span>Renew FD</span>
                </button>
                <button 
                  type="button" 
                  onClick={handleOpenCloseModal} 
                  className={styles.dropdownItem}
                  disabled={fd.status === "Closed" || fd.status === "Renewed"}
                  title={fd.status === "Closed" || fd.status === "Renewed" ? "This Fixed Deposit is already closed or renewed" : ""}
                >
                  <FiX 
                    className={styles.itemIcon} 
                    style={{ color: fd.status === "Closed" || fd.status === "Renewed" ? "var(--text-muted)" : "var(--color-error)" }} 
                  />
                  <span style={{ color: fd.status === "Closed" || fd.status === "Renewed" ? "var(--text-muted)" : "var(--color-error)" }}>Close FD</span>
                </button>
                <div className={styles.menuDivider} />
                <button type="button" onClick={handleOpenAddTxModal} className={styles.dropdownItem}>
                  <FiPlus className={styles.itemIcon} />
                  <span>Add Transaction</span>
                </button>
                <button type="button" onClick={handleOpenAddNoteModal} className={styles.dropdownItem}>
                  <FiFileText className={styles.itemIcon} />
                  <span>Add Note</span>
                </button>
                <div className={styles.menuDivider} />
                <button type="button" onClick={handlePrint} className={styles.dropdownItem}>
                  <FiPrinter className={styles.itemIcon} />
                  <span>Print FD Summary</span>
                </button>
                <button type="button" onClick={handleExportCSV} className={styles.dropdownItem}>
                  <FiDownload className={styles.itemIcon} />
                  <span>Export FD History</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.printHeader}>
        <h2>St. Mary's Youth Association, Kundara</h2>
        <h3>Fixed Deposit Statement &bull; {fd.fdNumber}</h3>
        <hr className={styles.printDivider} />
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.mainSummaryCard}>
          <div className={styles.summaryValuesGrid}>
            <div className={styles.summaryValueBlock}>
              <span className={styles.valLabel}>Principal Investment</span>
              <span className={styles.valAmount}>{formatCurrency(fd.principalAmount)}</span>
            </div>
            <div className={styles.summaryValueBlock}>
              <span className={styles.valLabel}>Maturity Value</span>
              <span className={styles.valAmount}>{formatCurrency(fd.maturityAmount)}</span>
            </div>
            <div className={styles.summaryValueBlock}>
              <span className={styles.valLabel}>Interest Rate</span>
              <span className={styles.valPercentage}>{fd.interestRate}% <span className={styles.pax}>p.a.</span></span>
            </div>
          </div>

          <div className={styles.metadataGrid}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Deposit Date:</span>
              <span className={styles.metaValue}>{fd.depositDate}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Maturity Date:</span>
              <span className={styles.metaValue}>{fd.maturityDate}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Term Duration:</span>
              <span className={styles.metaValue}>
                {fd.status === "Closed" || fd.status === "Renewed" ? (
                  <span>Liquidated / Terminated</span>
                ) : daysRemaining < 0 ? (
                  <span className={styles.alertText}>Matured</span>
                ) : daysRemaining === 0 ? (
                  <span className={styles.warningText}>Matures Today</span>
                ) : (
                  <span>{daysRemaining} days remaining</span>
                )}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Created By:</span>
              <span className={styles.metaValue}>{fd.createdBy || "System"}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Created Date:</span>
              <span className={styles.metaValue}>{fd.createdAt ? new Date(fd.createdAt).toLocaleDateString() : "—"}</span>
            </div>
            {fd.remarks && (
              <div className={styles.metaRowFull}>
                <span className={styles.metaLabel}>Opening Remarks:</span>
                <p className={styles.remarksText}>{fd.remarks}</p>
              </div>
            )}
          </div>

          {parentFd && (
            <div className={styles.linkageNotice}>
              <FiCornerRightDown className={styles.linkIcon} />
              <span>Renewed from parent deposit: </span>
              <Link to={`/financial-accounts/fixed-deposits/${parentFd.id}`} className={styles.linkValue}>
                {parentFd.fdNumber}
              </Link>
            </div>
          )}

          {childFd && (
            <div className={styles.linkageNotice}>
              <FiCornerRightDown className={styles.linkIcon} style={{ transform: "rotate(-90deg)" }} />
              <span>Renewed and rolled over to: </span>
              <Link to={`/financial-accounts/fixed-deposits/${childFd.id}`} className={styles.linkValue}>
                {childFd.fdNumber}
              </Link>
            </div>
          )}
        </div>

        <div className={styles.timelineCard}>
          <h2 className={styles.sideTitle}>Activity Timeline</h2>
          <div className={styles.timelineScroll}>
            {events.length === 0 ? (
              <div className={styles.emptyTimeline}>No logged operations.</div>
            ) : (
              <div className={styles.timelineTrack}>
                {events.map((ev) => (
                  <div key={ev.id} className={styles.timelineItem}>
                    <div className={styles.timelineNode}>
                      <span className={styles.nodeIcon} />
                    </div>
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineTime}>
                        {new Date(ev.timestamp).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      <span className={styles.timelineType}>{ev.type}</span>
                      <p className={styles.timelineDesc}>{ev.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabsHeader}>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`${styles.tabBtn} ${activeTab === "transactions" ? styles.tabBtnActive : ""}`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`${styles.tabBtn} ${activeTab === "events" ? styles.tabBtnActive : ""}`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`${styles.tabBtn} ${activeTab === "notes" ? styles.tabBtnActive : ""}`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`${styles.tabBtn} ${activeTab === "documents" ? styles.tabBtnActive : ""}`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab("audits")}
            className={`${styles.tabBtn} ${activeTab === "audits" ? styles.tabBtnActive : ""}`}
          >
            Audit Logs
          </button>
        </div>

        <div className={styles.tabsContent}>
          {activeTab === "transactions" && (
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Transaction Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Reference Number</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)" }}>
                        No transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{tx.date}</td>
                        <td>
                          <span className={styles.txBadge}>{tx.type}</span>
                        </td>
                        <td>{tx.description}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(tx.amount)}</td>
                        <td>
                          <code className={styles.reference}>{tx.referenceNumber || "—"}</code>
                        </td>
                        <td>{tx.createdBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "events" && (
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)" }}>
                        No events logged.
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr key={ev.id}>
                        <td>{new Date(ev.timestamp).toLocaleString()}</td>
                        <td>
                          <strong className={styles.eventTitle}>{ev.type}</strong>
                        </td>
                        <td>{ev.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "notes" && (
            <div className={styles.notesSection}>
              {notes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)" }}>
                  No administrative notes or remarks attached to this record.
                </div>
              ) : (
                <div className={styles.notesGrid}>
                  {notes.map((n) => (
                    <div key={n.id} className={styles.noteItem}>
                      <div className={styles.noteItemHeader}>
                        <strong className={styles.noteUser}>{n.user}</strong>
                        <span className={styles.noteTime}>
                          {new Date(n.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className={styles.noteText}>{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className={styles.documentsSection}>
              {documents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)" }}>
                  No files uploaded.
                </div>
              ) : (
                <div className={styles.docsGrid}>
                  {documents.map((d) => (
                    <div key={d.id} className={styles.docCard}>
                      <FiFileText className={styles.docCardIcon} />
                      <div className={styles.docCardInfo}>
                        <h4 className={styles.docCardName}>{d.name}</h4>
                        <span className={styles.docCardType}>{d.type}</span>
                        <span className={styles.docCardDate}>
                          Uploaded: {new Date(d.uploadedAt).toLocaleDateString()} by {d.uploadedBy}
                        </span>
                      </div>
                      <div className={styles.docCardActions}>
                        <a
                          href={d.url}
                          download={d.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.docViewBtn}
                          title="Open Document"
                        >
                          <FiMaximize2 size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "audits" && (
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>State Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)" }}>
                        No audit trail recorded.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>
                          <span className={styles.auditAction}>{log.actionType}</span>
                        </td>
                        <td>{log.user}</td>
                        <td>
                          <div className={styles.progressDetail}>
                            {log.oldValue && (
                              <div className={styles.oldValBlock}>
                                <span className={styles.valPrefix}>OLD:</span>
                                <code>{log.oldValue}</code>
                              </div>
                            )}
                            <div className={styles.newValBlock}>
                              <span className={styles.valPrefix}>NEW:</span>
                              <code>{log.newValue}</code>
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
              <h3>Edit Fixed Deposit Terms</h3>
              <button onClick={() => setShowEditModal(false)} className={styles.modalCloseBtn}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={styles.fg}>
                  <label>Bank Name</label>
                  <input
                    type="text"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Branch</label>
                  <input
                    type="text"
                    value={editForm.branch}
                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Principal Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.principalAmount}
                    onChange={(e) => setEditForm({ ...editForm, principalAmount: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.interestRate}
                    onChange={(e) => setEditForm({ ...editForm, interestRate: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Deposit Date</label>
                  <input
                    type="date"
                    value={editForm.depositDate}
                    onChange={(e) => setEditForm({ ...editForm, depositDate: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Maturity Date</label>
                  <input
                    type="date"
                    value={editForm.maturityDate}
                    onChange={(e) => setEditForm({ ...editForm, maturityDate: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Maturity Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.maturityAmount}
                    onChange={(e) => setEditForm({ ...editForm, maturityAmount: e.target.value })}
                    required
                  />
                </div>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Remarks</label>
                  <textarea
                    rows="2"
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.modalCancelBtn}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? <span className={styles.spinner} /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRenewModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Renew Fixed Deposit</h3>
              <button onClick={() => setShowRenewModal(false)} className={styles.modalCloseBtn}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleRenewSubmit} className={styles.modalForm}>
              <p className={styles.warningNotice}>
                <strong>Rollover Workflow:</strong> This will flag the current deposit as <em>Renewed</em>, and initialize a new <em>Active</em> child certificate linked to it.
              </p>
              <div className={styles.modalGrid}>
                <div className={styles.fg}>
                  <label>New FD Number *</label>
                  <input
                    type="text"
                    value={renewForm.fdNumber}
                    onChange={(e) => setRenewForm({ ...renewForm, fdNumber: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Bank Name</label>
                  <input
                    type="text"
                    value={renewForm.bankName}
                    onChange={(e) => setRenewForm({ ...renewForm, bankName: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Branch</label>
                  <input
                    type="text"
                    value={renewForm.branch}
                    onChange={(e) => setRenewForm({ ...renewForm, branch: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>New Principal Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    value={renewForm.principalAmount}
                    onChange={(e) => setRenewForm({ ...renewForm, principalAmount: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Interest Rate (% p.a.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={renewForm.interestRate}
                    onChange={(e) => setRenewForm({ ...renewForm, interestRate: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Deposit / Rollover Date *</label>
                  <input
                    type="date"
                    value={renewForm.depositDate}
                    onChange={(e) => setRenewForm({ ...renewForm, depositDate: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Maturity Date *</label>
                  <input
                    type="date"
                    value={renewForm.maturityDate}
                    onChange={(e) => setRenewForm({ ...renewForm, maturityDate: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Maturity Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    value={renewForm.maturityAmount}
                    onChange={(e) => setRenewForm({ ...renewForm, maturityAmount: e.target.value })}
                    required
                  />
                </div>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Remarks</label>
                  <textarea
                    rows="2"
                    value={renewForm.remarks}
                    onChange={(e) => setRenewForm({ ...renewForm, remarks: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowRenewModal(false)} className={styles.modalCancelBtn}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? <span className={styles.spinner} /> : "Execute Renewal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Close Fixed Deposit (Liquidation)</h3>
              <button onClick={() => setShowCloseModal(false)} className={styles.modalCloseBtn}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleCloseSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={styles.fg}>
                  <label>Closure Date</label>
                  <input
                    type="date"
                    value={closeForm.closureDate}
                    onChange={(e) => setCloseForm({ ...closeForm, closureDate: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Final Amount Received (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={closeForm.finalAmountReceived}
                    onChange={(e) => setCloseForm({ ...closeForm, finalAmountReceived: e.target.value })}
                    required
                  />
                </div>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Closure Remarks</label>
                  <textarea
                    rows="3"
                    placeholder="Enter details of receipt bank account or penalty deductions..."
                    value={closeForm.remarks}
                    onChange={(e) => setCloseForm({ ...closeForm, remarks: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCloseModal(false)} className={styles.modalCancelBtn}>
                  Cancel
                </button>
                <button type="submit" className={`${styles.modalConfirmBtn} ${styles.modalDangerBtn}`} disabled={isSubmitting}>
                  Liquidate Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseConfirmModal && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirm Liquidation</h3>
              <button type="button" onClick={() => setShowCloseConfirmModal(false)} className={styles.modalCloseBtn}>
                <FiX size={20} />
              </button>
            </div>
            <div className={styles.modalBody} style={{ padding: "24px" }}>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                Are you sure you want to close this Fixed Deposit certificate? The status will be set to <strong>Closed</strong> and a final liquidation transaction for <strong>{formatCurrency(closeForm.finalAmountReceived)}</strong> will be credited on <strong>{closeForm.closureDate}</strong>. This action is irreversible.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setShowCloseConfirmModal(false)} className={styles.modalCancelBtn}>
                Cancel
              </button>
              <button type="button" onClick={executeClose} className={`${styles.modalConfirmBtn} ${styles.modalDangerBtn}`} disabled={isSubmitting}>
                {isSubmitting ? <span className={styles.spinner} /> : "Confirm & Liquidate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddTxModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Ledger Transaction</h3>
              <button onClick={() => setShowAddTxModal(false)} className={styles.modalCloseBtn}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTxSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={styles.fg}>
                  <label>Transaction Date</label>
                  <input
                    type="date"
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Transaction Type</label>
                  <select
                    value={txForm.type}
                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                    required
                  >
                    <option value="Deposit">Deposit</option>
                    <option value="Interest Credit">Interest Credit</option>
                    <option value="Penalty">Penalty</option>
                    <option value="Renewal">Renewal</option>
                    <option value="Closure">Closure</option>
                    <option value="Adjustment">Adjustment</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </div>
                <div className={styles.fg}>
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.fg}>
                  <label>Reference / Voucher Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-109288"
                    value={txForm.referenceNumber}
                    onChange={(e) => setTxForm({ ...txForm, referenceNumber: e.target.value })}
                  />
                </div>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Description</label>
                  <textarea
                    rows="2"
                    placeholder="Write details of the ledger posting..."
                    value={txForm.description}
                    onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddTxModal(false)} className={styles.modalCancelBtn}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? <span className={styles.spinner} /> : "Record Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddNoteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Administrative Note</h3>
              <button onClick={() => setShowAddNoteModal(false)} className={styles.modalCloseBtn}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddNoteSubmit} className={styles.modalForm}>
              <div className={styles.modalGrid}>
                <div className={`${styles.fg} ${styles.fgFull}`}>
                  <label>Content</label>
                  <textarea
                    rows="4"
                    placeholder="Write detailed observation, auditor notes, or comments..."
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddNoteModal(false)} className={styles.modalCancelBtn}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalConfirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? <span className={styles.spinner} /> : "Append Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default FixedDepositDetails;
