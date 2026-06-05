import { useState, useEffect, useMemo } from "react";
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import { financeService } from "../services/financeService";
import styles from "./CashBook.module.css";

const ITEMS_PER_PAGE = 15;

const CashBook = () => {
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const unsubReceipts = financeService.subscribeReceipts((data) => {
      setReceipts(data);
    });
    const unsubPayments = financeService.subscribePayments((data) => {
      setPayments(data);
      setLoading(false);
    });

    return () => {
      unsubReceipts();
      unsubPayments();
    };
  }, []);

  const chronologicalLedger = useMemo(() => {
    const combined = [
      ...receipts.map(r => ({
        id: r.id,
        date: r.date,
        type: r.category,
        referenceNumber: r.receiptNumber,
        particulars: r.description,
        receiptAmount: r.amount,
        paymentAmount: 0,
        sourceModule: "Receipts",
        remarks: r.remarks,
        createdAt: r.createdAt
      })),
      ...payments.map(p => ({
        id: p.id,
        date: p.date,
        type: p.category,
        referenceNumber: p.paymentNumber,
        particulars: p.description,
        receiptAmount: 0,
        paymentAmount: p.amount,
        sourceModule: "Payments",
        remarks: p.remarks,
        createdAt: p.createdAt
      }))
    ];

    combined.sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    let currentBalance = 0;
    return combined.map(tx => {
      currentBalance += tx.receiptAmount - tx.paymentAmount;
      return {
        ...tx,
        runningBalance: currentBalance
      };
    });
  }, [receipts, payments]);

  const filteredLedger = useMemo(() => {
    return chronologicalLedger.filter(tx => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        tx.particulars?.toLowerCase().includes(q) ||
        tx.referenceNumber?.toLowerCase().includes(q) ||
        tx.type?.toLowerCase().includes(q) ||
        tx.remarks?.toLowerCase().includes(q);

      const matchesModule = moduleFilter === "All" || tx.sourceModule === moduleFilter;

      let matchesRange = true;
      if (startDate) {
        matchesRange = matchesRange && tx.date >= startDate;
      }
      if (endDate) {
        matchesRange = matchesRange && tx.date <= endDate;
      }

      return matchesSearch && matchesModule && matchesRange;
    });
  }, [chronologicalLedger, searchQuery, moduleFilter, startDate, endDate]);

  const sortedDisplayLedger = useMemo(() => {
    return [...filteredLedger].reverse();
  }, [filteredLedger]);

  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedDisplayLedger.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedDisplayLedger, currentPage]);

  const totalPages = Math.ceil(sortedDisplayLedger.length / ITEMS_PER_PAGE) || 1;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setModuleFilter("All");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Compiling cash register book...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Chronological Cash Book</h2>
          <p className={styles.subtitle}>
            Continuous journal registry of receipts and payments with real-time audit balance tracking.
          </p>
        </div>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search particulars, voucher reference..."
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
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by Source Module"
          >
            <option value="All">All Transactions</option>
            <option value="Receipts">Receipts Inflows</option>
            <option value="Payments">Payments Outflows</option>
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

          <button onClick={handleResetFilters} className={styles.resetBtn} title="Reset Filters">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Module</th>
                <th className={styles.th}>Voucher No.</th>
                <th className={styles.th}>Type</th>
                <th className={styles.th}>Particulars</th>
                <th className={`${styles.th} ${styles.thAmount}`}>Receipt (In)</th>
                <th className={`${styles.th} ${styles.thAmount}`}>Payment (Out)</th>
                <th className={`${styles.th} ${styles.thAmount}`}>Running Balance</th>
                <th className={styles.th}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLedger.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.emptyCell}>
                    No chronological transactions found matching the filters.
                  </td>
                </tr>
              ) : (
                paginatedLedger.map((tx) => (
                  <tr key={tx.id} className={styles.tr}>
                    <td className={styles.dateCell}>{tx.date}</td>
                    <td>
                      <span className={`${styles.moduleBadge} ${tx.sourceModule === "Receipts" ? styles.badgeIn : styles.badgeOut}`}>
                        {tx.sourceModule === "Receipts" ? "Receipt" : "Payment"}
                      </span>
                    </td>
                    <td className={styles.refCell}>{tx.referenceNumber}</td>
                    <td>{tx.type}</td>
                    <td className={styles.particularsCell}>{tx.particulars}</td>
                    <td className={`${styles.amountCell} ${styles.receiptText}`}>
                      {tx.receiptAmount > 0 ? formatCurrency(tx.receiptAmount) : "—"}
                    </td>
                    <td className={`${styles.amountCell} ${styles.paymentText}`}>
                      {tx.paymentAmount > 0 ? formatCurrency(tx.paymentAmount) : "—"}
                    </td>
                    <td className={`${styles.amountCell} ${styles.balanceCell}`}>
                      {formatCurrency(tx.runningBalance)}
                    </td>
                    <td className={styles.remarksCell} title={tx.remarks}>
                      {tx.remarks || "—"}
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
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, sortedDisplayLedger.length)}</strong> of{" "}
              <strong>{sortedDisplayLedger.length}</strong> journal postings
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
    </div>
  );
};

export default CashBook;
