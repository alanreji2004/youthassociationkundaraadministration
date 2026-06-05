import { useState, useEffect, useMemo } from "react";
import { 
  FiFileText, 
  FiPrinter, 
  FiDownload, 
  FiShare2, 
  FiRefreshCw
} from "react-icons/fi";
import { financeService } from "../services/financeService";
import { useToast } from "../components/Toast";
import { 
  exportCashBookToExcel, 
  exportReceiptsToExcel, 
  exportPaymentsToExcel, 
  exportAnnualReportToExcel 
} from "../utils/financialExcelUtils";
import styles from "./ReportsModule.module.css";

const ReportsModule = () => {
  const toast = useToast();
  
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeReport, setActiveReport] = useState("annual");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [rangeGenerated, setRangeGenerated] = useState(false);
  const [eventSortConfig, setEventSortConfig] = useState({ key: "name", direction: "asc" });

  useEffect(() => {
    const unsubReceipts = financeService.subscribeReceipts((data) => {
      setReceipts(data);
    });
    const unsubPayments = financeService.subscribePayments((data) => {
      setPayments(data);
      setLoading(false);
    });
    const unsubEvents = financeService.subscribeEvents((data) => {
      setEvents(data);
    });

    return () => {
      unsubReceipts();
      unsubPayments();
      unsubEvents();
    };
  }, []);

  const reportData = useMemo(() => {
    if (!rangeGenerated) return null;

    const openingReceipts = receipts.filter(r => r.date < startDate).reduce((sum, r) => sum + r.amount, 0);
    const openingPayments = payments.filter(p => p.date < startDate).reduce((sum, p) => sum + p.amount, 0);
    const openingBalance = openingReceipts - openingPayments;

    const rangeReceipts = receipts.filter(r => r.date >= startDate && r.date <= endDate);
    const rangePayments = payments.filter(p => p.date >= startDate && p.date <= endDate);

    const totalRec = rangeReceipts.reduce((sum, r) => sum + r.amount, 0);
    const totalPay = rangePayments.reduce((sum, p) => sum + p.amount, 0);
    const closingBalance = openingBalance + totalRec - totalPay;

    const recBreakdown = {
      donations: rangeReceipts.filter(r => r.category === "Donation").reduce((sum, r) => sum + r.amount, 0),
      sponsorships: rangeReceipts.filter(r => r.category === "Sponsorship").reduce((sum, r) => sum + r.amount, 0),
      eventCollections: rangeReceipts.filter(r => r.category === "Event Collection").reduce((sum, r) => sum + r.amount, 0),
      fundraising: rangeReceipts.filter(r => r.category === "Fundraising").reduce((sum, r) => sum + r.amount, 0),
      otherIncome: rangeReceipts.filter(r => r.category === "Other Income").reduce((sum, r) => sum + r.amount, 0)
    };

    const payBreakdown = {
      food: rangePayments.filter(p => p.category === "Food Expenses").reduce((sum, p) => sum + p.amount, 0),
      travel: rangePayments.filter(p => p.category === "Travel Expenses").reduce((sum, p) => sum + p.amount, 0),
      program: rangePayments.filter(p => p.category === "Program Expenses").reduce((sum, p) => sum + p.amount, 0),
      printing: rangePayments.filter(p => p.category === "Printing").reduce((sum, p) => sum + p.amount, 0),
      equipment: rangePayments.filter(p => p.category === "Equipment").reduce((sum, p) => sum + p.amount, 0),
      charity: rangePayments.filter(p => p.category === "Charity Activities").reduce((sum, p) => sum + p.amount, 0),
      utility: rangePayments.filter(p => p.category === "Utility Payments").reduce((sum, p) => sum + p.amount, 0),
      miscellaneous: rangePayments.filter(p => p.category === "Miscellaneous Expenses").reduce((sum, p) => sum + p.amount, 0)
    };

    const eventCont = events.map(ev => {
      const evRecs = receipts.filter(r => r.eventId === ev.id && r.date >= startDate && r.date <= endDate);
      const evPays = payments.filter(p => p.eventId === ev.id && p.date >= startDate && p.date <= endDate);

      const income = evRecs.reduce((sum, r) => sum + r.amount, 0);
      const expenses = evPays.reduce((sum, p) => sum + p.amount, 0);
      const balance = income - expenses;

      return {
        id: ev.id,
        name: ev.name,
        income,
        expenses,
        balance,
        status: ev.status
      };
    }).filter(e => e.income > 0 || e.expenses > 0);

    return {
      openingBalance,
      totalReceipts: totalRec,
      totalPayments: totalPay,
      closingBalance,
      receiptsBreakdown: recBreakdown,
      paymentsBreakdown: payBreakdown,
      eventContributions: eventCont,
      rangeReceipts,
      rangePayments
    };
  }, [receipts, payments, events, startDate, endDate, rangeGenerated]);

  const monthlySummaries = useMemo(() => {
    if (!rangeGenerated || !reportData) return [];
    
    const monthlyMap = {};
    let start = new Date(startDate);
    const end = new Date(endDate);

    while (start <= end) {
      const key = start.toISOString().substring(0, 7);
      monthlyMap[key] = { receipts: 0, payments: 0 };
      start.setMonth(start.getMonth() + 1);
    }

    reportData.rangeReceipts.forEach(r => {
      const key = r.date.substring(0, 7);
      if (monthlyMap[key]) {
        monthlyMap[key].receipts += r.amount;
      }
    });

    reportData.rangePayments.forEach(p => {
      const key = p.date.substring(0, 7);
      if (monthlyMap[key]) {
        monthlyMap[key].payments += p.amount;
      }
    });

    return Object.keys(monthlyMap).map(key => {
      const [year, month] = key.split("-");
      const monthName = new Date(year, parseInt(month) - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
      const r = monthlyMap[key].receipts;
      const p = monthlyMap[key].payments;
      return {
        key,
        month: monthName,
        receipts: r,
        payments: p,
        balance: r - p
      };
    }).sort((a, b) => a.key.localeCompare(b.key));
  }, [reportData, startDate, endDate, rangeGenerated]);

  const maxMonthValue = useMemo(() => {
    if (monthlySummaries.length === 0) return 1;
    return Math.max(
      ...monthlySummaries.map(m => Math.max(m.receipts, m.payments)),
      1
    );
  }, [monthlySummaries]);

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates.");
      return;
    }
    if (startDate > endDate) {
      toast.error("Start date cannot be after end date.");
      return;
    }
    setRangeGenerated(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareSummary = () => {
    if (!reportData) return;
    const summaryText = `St. Mary's Youth Association, Kundara
Financial Summary Statement
Period: ${startDate} to ${endDate}

Opening Balance: INR ${reportData.openingBalance.toFixed(2)}
Total Receipts: INR ${reportData.totalReceipts.toFixed(2)}
Total Payments: INR ${reportData.totalPayments.toFixed(2)}
Closing Balance: INR ${reportData.closingBalance.toFixed(2)}

Receipts Breakdown:
- Donations: INR ${reportData.receiptsBreakdown.donations.toFixed(2)}
- Sponsorships: INR ${reportData.receiptsBreakdown.sponsorships.toFixed(2)}
- Event Collections: INR ${reportData.receiptsBreakdown.eventCollections.toFixed(2)}
- Fundraising: INR ${reportData.receiptsBreakdown.fundraising.toFixed(2)}
- Other Income: INR ${reportData.receiptsBreakdown.otherIncome.toFixed(2)}

Generated on: ${new Date().toLocaleString()}
Generated by: Administrator`;

    navigator.clipboard.writeText(summaryText)
      .then(() => {
        toast.success("Shareable summary statement copied to clipboard.");
      })
      .catch(() => {
        toast.error("Failed to copy summary to clipboard.");
      });
  };

  const handleExcelExport = () => {
    if (activeReport === "cashbook") {
      const sorted = [...receipts.map(r => ({
        date: r.date,
        sourceModule: "Receipts",
        referenceNumber: r.receiptNumber,
        type: r.category,
        particulars: r.description,
        receiptAmount: r.amount,
        paymentAmount: 0,
        remarks: r.remarks,
        createdAt: r.createdAt
      })), ...payments.map(p => ({
        date: p.date,
        sourceModule: "Payments",
        referenceNumber: p.paymentNumber,
        type: p.category,
        particulars: p.description,
        receiptAmount: 0,
        paymentAmount: p.amount,
        remarks: p.remarks,
        createdAt: p.createdAt
      }))].sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.createdAt) - new Date(b.createdAt));

      let bal = 0;
      const ledger = sorted.map(tx => {
        bal += tx.receiptAmount - tx.paymentAmount;
        return { ...tx, runningBalance: bal };
      });
      exportCashBookToExcel(ledger);
      toast.success("Cash Book ledger spreadsheet exported.");
    } else if (activeReport === "receipts") {
      exportReceiptsToExcel(receipts);
      toast.success("Receipts registry spreadsheet exported.");
    } else if (activeReport === "payments") {
      exportPaymentsToExcel(payments);
      toast.success("Payments registry spreadsheet exported.");
    } else if (activeReport === "annual" && reportData) {
      exportAnnualReportToExcel({
        startDate,
        endDate,
        openingBalance: reportData.openingBalance,
        totalReceipts: reportData.totalReceipts,
        totalPayments: reportData.totalPayments,
        closingBalance: reportData.closingBalance,
        receiptsBreakdown: reportData.receiptsBreakdown,
        paymentsBreakdown: reportData.paymentsBreakdown,
        eventContributions: reportData.eventContributions,
        monthlySummaries
      });
      toast.success("Consolidated annual financial report spreadsheet exported.");
    }
  };

  const sortedEvents = useMemo(() => {
    if (!reportData) return [];
    const list = [...reportData.eventContributions];
    if (eventSortConfig.key) {
      list.sort((a, b) => {
        let valA = a[eventSortConfig.key];
        let valB = b[eventSortConfig.key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return eventSortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return eventSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [reportData, eventSortConfig]);

  const handleEventSort = (key) => {
    let direction = "asc";
    if (eventSortConfig.key === key && eventSortConfig.direction === "asc") {
      direction = "desc";
    }
    setEventSortConfig({ key, direction });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading reports engine...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.sidebarLayout}>
        <aside className={styles.reportNav}>
          <h3 className={styles.navTitle}>Available Reports</h3>
          <button 
            onClick={() => { setActiveReport("annual"); setRangeGenerated(false); }} 
            className={`${styles.navItem} ${activeReport === "annual" ? styles.navItemActive : ""}`}
          >
            <FiFileText />
            <span>Annual Financial Statement</span>
          </button>
          <button 
            onClick={() => { setActiveReport("cashbook"); handleExcelExport(); }} 
            className={`${styles.navItem} ${activeReport === "cashbook" ? styles.navItemActive : ""}`}
          >
            <FiDownload />
            <span>Download Full Cash Book</span>
          </button>
          <button 
            onClick={() => { setActiveReport("receipts"); handleExcelExport(); }} 
            className={`${styles.navItem} ${activeReport === "receipts" ? styles.navItemActive : ""}`}
          >
            <FiDownload />
            <span>Download Receipts Log</span>
          </button>
          <button 
            onClick={() => { setActiveReport("payments"); handleExcelExport(); }} 
            className={`${styles.navItem} ${activeReport === "payments" ? styles.navItemActive : ""}`}
          >
            <FiDownload />
            <span>Download Payments Log</span>
          </button>
        </aside>

        <div className={styles.reportWorkplace}>
          {activeReport === "annual" && (
            <div className={styles.statementCreator}>
              <div className={styles.criteriaCard}>
                <h3 className={styles.criteriaTitle}>Configure Report Date Parameters</h3>
                <div className={styles.criteriaGrid}>
                  <div className={styles.fg}>
                    <label>Start Period Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => { setStartDate(e.target.value); setRangeGenerated(false); }} 
                    />
                  </div>
                  <div className={styles.fg}>
                    <label>End Period Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => { setEndDate(e.target.value); setRangeGenerated(false); }} 
                    />
                  </div>
                  <button onClick={handleGenerate} className={styles.generateBtn}>
                    <FiRefreshCw />
                    <span>Generate Statement</span>
                  </button>
                </div>
              </div>

              {rangeGenerated && reportData && (
                <div className={styles.reportOutput}>
                  <div className={styles.statementActionsBar}>
                    <button onClick={handlePrint} className={styles.actionBtn}>
                      <FiPrinter />
                      <span>Print Sheet</span>
                    </button>
                    <button onClick={handleExcelExport} className={styles.actionBtn}>
                      <FiDownload />
                      <span>Export Excel</span>
                    </button>
                    <button onClick={handleShareSummary} className={styles.actionBtn}>
                      <FiShare2 />
                      <span>Copy Summary</span>
                    </button>
                  </div>

                  <div className={styles.printHeader}>
                    <h2>St. Mary's Youth Association, Kundara</h2>
                    <h3>Consolidated Financial Accounts Statement</h3>
                    <p className={styles.printSubText}>Report Period: {startDate} to {endDate}</p>
                    <hr className={styles.printDivider} />
                  </div>

                  <div className={styles.kpiRow}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Opening Balance</span>
                      <span className={styles.kpiVal}>{formatCurrency(reportData.openingBalance)}</span>
                      <span className={styles.kpiSub}>Cash position before {startDate}</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Total Receipts Inflows (+)</span>
                      <span className={`${styles.kpiVal} ${styles.successText}`}>{formatCurrency(reportData.totalReceipts)}</span>
                      <span className={styles.kpiSub}>Revenue within range</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Total Payments Outflows (-)</span>
                      <span className={`${styles.kpiVal} ${styles.errorText}`}>{formatCurrency(reportData.totalPayments)}</span>
                      <span className={styles.kpiSub}>Expenditure within range</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Closing Balance (=)</span>
                      <span className={styles.kpiVal}>{formatCurrency(reportData.closingBalance)}</span>
                      <span className={styles.kpiSub}>Net cash as of {endDate}</span>
                    </div>
                  </div>

                  <div className={styles.breakdownGrid}>
                    <div className={styles.breakdownCard}>
                      <h4 className={styles.breakdownTitle}>Inbound Receipts Breakdown</h4>
                      <table className={styles.breakdownTable}>
                        <tbody>
                          <tr>
                            <th>Donations</th>
                            <td>{formatCurrency(reportData.receiptsBreakdown.donations)}</td>
                          </tr>
                          <tr>
                            <th>Sponsorships</th>
                            <td>{formatCurrency(reportData.receiptsBreakdown.sponsorships)}</td>
                          </tr>
                          <tr>
                            <th>Event Collections</th>
                            <td>{formatCurrency(reportData.receiptsBreakdown.eventCollections)}</td>
                          </tr>
                          <tr>
                            <th>Fundraising Collections</th>
                            <td>{formatCurrency(reportData.receiptsBreakdown.fundraising)}</td>
                          </tr>
                          <tr>
                            <th>Other Income</th>
                            <td>{formatCurrency(reportData.receiptsBreakdown.otherIncome)}</td>
                          </tr>
                          <tr className={styles.totalRow}>
                            <th>Total Receipts</th>
                            <td>{formatCurrency(reportData.totalReceipts)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.breakdownCard}>
                      <h4 className={styles.breakdownTitle}>Outbound Payments Breakdown</h4>
                      <table className={styles.breakdownTable}>
                        <tbody>
                          <tr>
                            <th>Food Expenses</th>
                            <td>{formatCurrency(reportData.paymentsBreakdown.food)}</td>
                          </tr>
                          <tr>
                            <th>Travel Expenses</th>
                            <td>{formatCurrency(reportData.paymentsBreakdown.travel)}</td>
                          </tr>
                          <tr>
                            <th>Program Expenses</th>
                            <td>{formatCurrency(reportData.paymentsBreakdown.program)}</td>
                          </tr>
                          <tr>
                            <th>Printing</th>
                            <td>{formatCurrency(reportData.paymentsBreakdown.printing)}</td>
                          </tr>
                          <tr>
                            <th>Equipment</th>
                            <td>{formatCurrency(reportData.paymentsBreakdown.equipment)}</td>
                          </tr>
                          <tr>
                            <th>Charity Activities</th>
                            <td>{formatCurrency(reportData.paymentsBreakdown.charity)}</td>
                          </tr>
                          <tr>
                            <th>Utility Payments</th>
                            <td>{formatCurrency(reportData.paymentsBreakdown.utility)}</td>
                          </tr>
                          <tr>
                            <th>Miscellaneous Expenses</th>
                            <td>{formatCurrency(reportData.paymentsBreakdown.miscellaneous)}</td>
                          </tr>
                          <tr className={styles.totalRow}>
                            <th>Total Payments</th>
                            <td>{formatCurrency(reportData.totalPayments)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className={styles.sectionBlock}>
                    <h4 className={styles.blockTitle}>Event Contribution Summary</h4>
                    {sortedEvents.length === 0 ? (
                      <div className={styles.emptyBlockText}>No events had cash postings inside this date range.</div>
                    ) : (
                      <div className={styles.tableResponsive}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th onClick={() => handleEventSort("name")} style={{ cursor: "pointer" }}>Event Name</th>
                              <th onClick={() => handleEventSort("income")} style={{ cursor: "pointer", textAlign: "right" }}>Income</th>
                              <th onClick={() => handleEventSort("expenses")} style={{ cursor: "pointer", textAlign: "right" }}>Expenses</th>
                              <th onClick={() => handleEventSort("balance")} style={{ cursor: "pointer", textAlign: "right" }}>Net Contribution</th>
                              <th onClick={() => handleEventSort("status")} style={{ cursor: "pointer" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedEvents.map(ev => (
                              <tr key={ev.id}>
                                <td className={styles.boldText}>{ev.name}</td>
                                <td style={{ textAlign: "right", color: "var(--color-success)" }} className={styles.mono}>{formatCurrency(ev.income)}</td>
                                <td style={{ textAlign: "right", color: "var(--color-error)" }} className={styles.mono}>{formatCurrency(ev.expenses)}</td>
                                <td style={{ textAlign: "right", fontWeight: 600 }} className={`${styles.mono} ${ev.balance >= 0 ? styles.successText : styles.errorText}`}>{formatCurrency(ev.balance)}</td>
                                <td><span className={styles.badge}>{ev.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className={styles.sectionBlock}>
                    <h4 className={styles.blockTitle}>Monthly Inflow/Outflow Trends</h4>
                    {monthlySummaries.length === 0 ? (
                      <div className={styles.emptyBlockText}>No data available.</div>
                    ) : (
                      <div className={styles.monthlyLayout}>
                        <div className={styles.tableResponsive} style={{ flex: 1 }}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th style={{ textAlign: "right" }}>Receipts (In)</th>
                                <th style={{ textAlign: "right" }}>Payments (Out)</th>
                                <th style={{ textAlign: "right" }}>Net Activity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlySummaries.map(m => (
                                <tr key={m.key}>
                                  <td className={styles.boldText}>{m.month}</td>
                                  <td style={{ textAlign: "right", color: "var(--color-success)" }} className={styles.mono}>{formatCurrency(m.receipts)}</td>
                                  <td style={{ textAlign: "right", color: "var(--color-error)" }} className={styles.mono}>{formatCurrency(m.payments)}</td>
                                  <td style={{ textAlign: "right", fontWeight: 600 }} className={`${styles.mono} ${m.balance >= 0 ? styles.successText : styles.errorText}`}>{formatCurrency(m.balance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className={styles.chartPanel}>
                          {monthlySummaries.map(m => (
                            <div key={m.key} className={styles.chartMonthRow}>
                              <span className={styles.chartMonthLabel}>{m.month}</span>
                              <div className={styles.chartBarsContainer}>
                                <div className={styles.chartBarWrapper}>
                                  <div 
                                    className={`${styles.chartBar} ${styles.chartBarIn}`} 
                                    style={{ width: `${(m.receipts / maxMonthValue) * 100}%` }}
                                    title={`Receipts: ${formatCurrency(m.receipts)}`}
                                  />
                                </div>
                                <div className={styles.chartBarWrapper}>
                                  <div 
                                    className={`${styles.chartBar} ${styles.chartBarOut}`} 
                                    style={{ width: `${(m.payments / maxMonthValue) * 100}%` }}
                                    title={`Payments: ${formatCurrency(m.payments)}`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.printFooter}>
                    <p>Generated by: Administrator</p>
                    <p>Generated on: {new Date().toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;
