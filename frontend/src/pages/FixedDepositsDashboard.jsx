import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiPlus, 
  FiSearch, 
  FiFolder, 
  FiTrendingUp, 
  FiCalendar, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiChevronLeft, 
  FiChevronRight, 
  FiArrowUp, 
  FiArrowDown,
  FiSlash
} from "react-icons/fi";
import { fdService } from "../services/fdService";
import styles from "./FixedDepositsDashboard.module.css";

const ITEMS_PER_PAGE = 10;

const FixedDepositsDashboard = () => {
  const navigate = useNavigate();
  const [fds, setFds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active_Matured");
  const [bankFilter, setBankFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [sortConfig, setSortConfig] = useState({
    key: "maturityDate",
    direction: "asc"
  });

  const [currentPage, setCurrentPage] = useState(1);

  const [showClosed, setShowClosed] = useState(false);
  const [showRenewed, setShowRenewed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const unsubscribe = fdService.subscribeFds(
      (data) => {
        setFds(data);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const fdsWithDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return fds.map((fd) => {
      const maturity = new Date(fd.maturityDate);
      maturity.setHours(0, 0, 0, 0);
      const diffTime = maturity.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...fd,
        daysRemaining
      };
    });
  }, [fds]);

  const stats = useMemo(() => {
    let totalInvestment = 0;
    let activeCount = 0;
    let maturing30Count = 0;
    let maturedCount = 0;
    let closedCount = 0;
    let totalInterest = 0;
    let totalMaturity = 0;

    fdsWithDays.forEach((fd) => {
      const p = fd.principalAmount || 0;
      const m = fd.maturityAmount || 0;
      const interest = Math.max(0, m - p);

      if (fd.status === "Active") {
        totalInvestment += p;
        activeCount++;
        totalInterest += interest;
        totalMaturity += m;
        if (fd.daysRemaining <= 30 && fd.daysRemaining > 0) {
          maturing30Count++;
        }
      } else if (fd.status === "Matured") {
        totalInvestment += p;
        maturedCount++;
        totalInterest += interest;
        totalMaturity += m;
      } else if (fd.status === "Closed") {
        closedCount++;
      }
    });

    return {
      totalInvestment,
      activeCount,
      maturing30Count,
      maturedCount,
      closedCount,
      totalInterest,
      totalMaturity
    };
  }, [fdsWithDays]);

  const uniqueBanks = useMemo(() => {
    const set = new Set();
    fds.forEach(fd => {
      if (fd.bankName) set.add(fd.bankName.trim());
    });
    return Array.from(set).sort();
  }, [fds]);

  const uniqueYears = useMemo(() => {
    const set = new Set();
    fds.forEach(fd => {
      if (fd.depositDate) {
        const y = new Date(fd.depositDate).getFullYear();
        if (!isNaN(y)) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [fds]);

  const filteredFds = useMemo(() => {
    return fdsWithDays.filter((fd) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query ||
        fd.fdNumber?.toLowerCase().includes(query) ||
        fd.bankName?.toLowerCase().includes(query) ||
        fd.branch?.toLowerCase().includes(query) ||
        fd.remarks?.toLowerCase().includes(query);

      let matchesStatus = true;
      if (showAll) {
        matchesStatus = true;
      } else if (statusFilter === "Active_Matured") {
        matchesStatus = fd.status === "Active" || fd.status === "Matured";
        if (fd.status === "Closed" && showClosed) matchesStatus = true;
        if (fd.status === "Renewed" && showRenewed) matchesStatus = true;
      } else {
        matchesStatus = fd.status === statusFilter;
      }

      const matchesBank = !bankFilter || fd.bankName === bankFilter;

      let matchesYear = true;
      if (yearFilter) {
        const y = new Date(fd.depositDate).getFullYear();
        matchesYear = String(y) === yearFilter;
      }

      let matchesRange = true;
      if (startDate) {
        const dep = new Date(fd.depositDate);
        dep.setHours(0,0,0,0);
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        matchesRange = matchesRange && dep >= start;
      }
      if (endDate) {
        const dep = new Date(fd.depositDate);
        dep.setHours(0,0,0,0);
        const end = new Date(endDate);
        end.setHours(0,0,0,0);
        matchesRange = matchesRange && dep <= end;
      }

      return matchesSearch && matchesStatus && matchesBank && matchesYear && matchesRange;
    });
  }, [fdsWithDays, searchQuery, statusFilter, bankFilter, yearFilter, startDate, endDate, showClosed, showRenewed, showAll]);

  const sortedFds = useMemo(() => {
    const list = [...filteredFds];
    if (sortConfig.key) {
      list.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [filteredFds, sortConfig]);

  const paginatedFds = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedFds.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedFds, currentPage]);

  const totalPages = Math.ceil(sortedFds.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, bankFilter, yearFilter, startDate, endDate, showClosed, showRenewed, showAll]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return (
      <span className={styles.sortIconWrapper}>
        {sortConfig.direction === "asc" ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
      </span>
    );
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val);
  };

  const getStatusClass = (fd) => {
    if (fd.status === "Closed") return styles.statusClosed;
    if (fd.status === "Renewed") return styles.statusRenewed;
    if (fd.status === "Matured") return styles.statusMatured;
    if (fd.status === "Active") {
      if (fd.daysRemaining <= 30 && fd.daysRemaining > 0) {
        return styles.statusMaturing;
      }
      return styles.statusActive;
    }
    return styles.statusActive;
  };

  const getStatusLabel = (fd) => {
    if (fd.status === "Active" && fd.daysRemaining <= 30 && fd.daysRemaining > 0) {
      return "Maturing Soon";
    }
    return fd.status;
  };

  return (
    <div>
      <div className={styles.headerArea}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Fixed Deposit Register</h1>
          <p className={styles.subtitle}>
            Manage and track organizational fixed deposit certificates, renewals, and liquidations.
          </p>
        </div>
        <div className={styles.actionsArea}>
          <Link to="/financial-accounts/fixed-deposits/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            <FiPlus />
            <span>Add Fixed Deposit</span>
          </Link>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total FD Investment</span>
          <span className={styles.kpiVal}>{formatCurrency(stats.totalInvestment)}</span>
          <span className={styles.kpiSub}>Active & matured principal</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active FDs</span>
          <span className={styles.kpiVal}>{stats.activeCount}</span>
          <span className={styles.kpiSub}>Currently earning interest</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Maturing in 30 Days</span>
          <span className={styles.kpiVal} style={{ color: stats.maturing30Count > 0 ? "var(--color-warning)" : "inherit" }}>
            {stats.maturing30Count}
          </span>
          <span className={styles.kpiSub}>Action required soon</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Matured Awaiting Action</span>
          <span className={styles.kpiVal} style={{ color: stats.maturedCount > 0 ? "var(--color-error)" : "inherit" }}>
            {stats.maturedCount}
          </span>
          <span className={styles.kpiSub}>Awaiting renewal or closure</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Closed FDs</span>
          <span className={styles.kpiVal}>{stats.closedCount}</span>
          <span className={styles.kpiSub}>Liquidated accounts</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Interest Expected</span>
          <span className={styles.kpiVal}>{formatCurrency(stats.totalInterest)}</span>
          <span className={styles.kpiSub}>Earning over maturity period</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Maturity Value</span>
          <span className={styles.kpiVal}>{formatCurrency(stats.totalMaturity)}</span>
          <span className={styles.kpiSub}>Combined principal & interest</span>
        </div>
      </div>

      <div className={styles.controlsBar}>
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search FD number, bank, branch, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.selectFilter}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setShowAll(e.target.value === "All");
              }}
              aria-label="Filter by Status"
            >
              <option value="Active_Matured">Active & Matured</option>
              <option value="Active">Active Only</option>
              <option value="Matured">Matured Only</option>
              <option value="Closed">Closed Only</option>
              <option value="Renewed">Renewed Only</option>
              <option value="All">All Statuses</option>
            </select>

            <select
              className={styles.selectFilter}
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              aria-label="Filter by Bank"
            >
              <option value="">All Banks</option>
              {uniqueBanks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              className={styles.selectFilter}
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="Filter by Deposit Year"
            >
              <option value="">All Years</option>
              {uniqueYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <span className={styles.dateLabel}>From:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Deposit start date filter"
            />
            
            <span className={styles.dateLabel}>To:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Deposit end date filter"
            />
          </div>
        </div>
      </div>

      <div className={styles.toggleRow}>
        <span style={{ fontWeight: 600 }}>Toggles:</span>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            disabled={showAll || statusFilter !== "Active_Matured"}
          />
          <span>Show Closed</span>
        </label>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showRenewed}
            onChange={(e) => setShowRenewed(e.target.checked)}
            disabled={showAll || statusFilter !== "Active_Matured"}
          />
          <span>Show Renewed</span>
        </label>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => {
              setShowAll(e.target.checked);
              if (e.target.checked) setStatusFilter("All");
              else setStatusFilter("Active_Matured");
            }}
          />
          <span>Show All</span>
        </label>
      </div>

      <div className={styles.tableContainer} style={{ marginTop: "24px" }}>
        {loading ? (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>FD Number</th>
                  <th className={styles.th}>Bank Name</th>
                  <th className={`${styles.th} ${styles.thAmount}`}>Principal Amount</th>
                  <th className={styles.th}>Interest Rate</th>
                  <th className={styles.th}>Deposit Date</th>
                  <th className={styles.th}>Maturity Date</th>
                  <th className={`${styles.th} ${styles.thAmount}`}>Maturity Amount</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Remaining</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className={styles.tr}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className={styles.td}>
                        <span className="skeleton" style={{ height: "16px", width: j === 1 || j === 2 ? "120px" : "60px" }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sortedFds.length === 0 ? (
          <div className={styles.emptyState}>
            <FiSlash className={styles.emptyIcon} />
            <h3 className={styles.emptyStateTitle}>No Fixed Deposits Found</h3>
            <p className={styles.emptyStateDesc}>
              There are no deposits registered matching the current status and search filters.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr>
                    <th className={`${styles.th} ${styles.thSortable}`} onClick={() => handleSort("fdNumber")}>
                      FD Number {renderSortIcon("fdNumber")}
                    </th>
                    <th className={`${styles.th} ${styles.thSortable}`} onClick={() => handleSort("bankName")}>
                      Bank Name {renderSortIcon("bankName")}
                    </th>
                    <th className={`${styles.th} ${styles.thSortable} ${styles.thAmount}`} onClick={() => handleSort("principalAmount")}>
                      Principal Amount {renderSortIcon("principalAmount")}
                    </th>
                    <th className={styles.th}>Rate</th>
                    <th className={`${styles.th} ${styles.thSortable}`} onClick={() => handleSort("depositDate")}>
                      Deposit Date {renderSortIcon("depositDate")}
                    </th>
                    <th className={`${styles.th} ${styles.thSortable}`} onClick={() => handleSort("maturityDate")}>
                      Maturity Date {renderSortIcon("maturityDate")}
                    </th>
                    <th className={`${styles.th} ${styles.thSortable} ${styles.thAmount}`} onClick={() => handleSort("maturityAmount")}>
                      Maturity Amount {renderSortIcon("maturityAmount")}
                    </th>
                    <th className={`${styles.th} ${styles.thSortable}`} onClick={() => handleSort("status")}>
                      Status {renderSortIcon("status")}
                    </th>
                    <th className={styles.th}>Remaining</th>
                    <th className={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFds.map((fd) => (
                    <tr key={fd.id} className={styles.tr} onClick={() => navigate(`/financial-accounts/fixed-deposits/${fd.id}`)}>
                      <td className={`${styles.td} ${styles.fdNumCell}`}>
                        {fd.fdNumber}
                      </td>
                      <td className={styles.td}>
                        {fd.bankName}
                      </td>
                      <td className={`${styles.td} ${styles.amountCell}`}>
                        {formatCurrency(fd.principalAmount)}
                      </td>
                      <td className={`${styles.td} ${styles.rateCell}`}>
                        {fd.interestRate}%
                      </td>
                      <td className={styles.td}>
                        {fd.depositDate}
                      </td>
                      <td className={styles.td}>
                        {fd.maturityDate}
                      </td>
                      <td className={`${styles.td} ${styles.amountCell}`}>
                        {formatCurrency(fd.maturityAmount)}
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.statusBadge} ${getStatusClass(fd)}`}>
                          <span className={styles.statusDot} />
                          <span>{getStatusLabel(fd)}</span>
                        </span>
                      </td>
                      <td className={styles.td} style={{ fontSize: "13px" }}>
                        {fd.status === "Closed" || fd.status === "Renewed" ? (
                          <span style={{ color: "#d1d5db" }}>&mdash;</span>
                        ) : fd.daysRemaining < 0 ? (
                          <span style={{ color: "var(--color-error)", fontWeight: 600 }}>Matured</span>
                        ) : fd.daysRemaining === 0 ? (
                          <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>Today</span>
                        ) : (
                          <span>{fd.daysRemaining} days</span>
                        )}
                      </td>
                      <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                        <Link to={`/financial-accounts/fixed-deposits/${fd.id}`} className={styles.btnTableEdit}>
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                Showing <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * ITEMS_PER_PAGE, sortedFds.length)}</strong> of{" "}
                <strong>{sortedFds.length}</strong> records
              </span>

              <div className={styles.paginationBtns}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <FiChevronLeft size={16} style={{ display: "block" }} />
                </button>
                
                <span className={styles.pageBtn} style={{ cursor: "default", backgroundColor: "var(--bg-hover)" }}>
                  {currentPage} / {totalPages}
                </span>

                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <FiChevronRight size={16} style={{ display: "block" }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FixedDepositsDashboard;
