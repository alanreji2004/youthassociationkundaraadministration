import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiArrowDownLeft, 
  FiArrowUpRight, 
  FiTrendingUp, 
  FiActivity, 
  FiCalendar 
} from "react-icons/fi";
import { financeService } from "../services/financeService";
import styles from "./FinancialDashboard.module.css";

const FinancialDashboard = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubReceipts = financeService.subscribeReceipts((data) => {
      setReceipts(data);
    });
    const unsubPayments = financeService.subscribePayments((data) => {
      setPayments(data);
    });
    const unsubEvents = financeService.subscribeEvents((data) => {
      setEvents(data);
      setLoading(false);
    });

    return () => {
      unsubReceipts();
      unsubPayments();
      unsubEvents();
    };
  }, []);

  const stats = useMemo(() => {
    const totalRec = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalPay = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = totalRec - totalPay;

    const donations = receipts
      .filter(r => r.category === "Donation")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const eventCol = receipts
      .filter(r => r.category === "Event Collection")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const sponsorships = receipts
      .filter(r => r.category === "Sponsorship")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const fundraising = receipts
      .filter(r => r.category === "Fundraising")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const otherIncome = receipts
      .filter(r => r.category === "Other Income")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      totalReceipts: totalRec,
      totalPayments: totalPay,
      netBalance: balance,
      donations,
      eventCollections: eventCol,
      sponsorships,
      fundraising,
      otherIncome
    };
  }, [receipts, payments]);

  const recentTransactions = useMemo(() => {
    const combined = [
      ...receipts.map(r => ({ ...r, txType: "Receipt" })),
      ...payments.map(p => ({ ...p, txType: "Payment" }))
    ];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt));
    return combined.slice(0, 5);
  }, [receipts, payments]);

  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return events
      .filter(e => e.status === "Active" && e.startDate >= todayStr)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 3);
  }, [events]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const getMaxCategoryVal = useMemo(() => {
    return Math.max(
      stats.donations,
      stats.sponsorships,
      stats.eventCollections,
      stats.fundraising,
      stats.otherIncome,
      1
    );
  }, [stats]);

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading financial dashboard...</span>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.summaryGrid}>
        <div className={`${styles.kpiCard} ${styles.balanceCard}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Current Net Balance</span>
            <FiTrendingUp className={styles.balanceIcon} />
          </div>
          <span className={styles.kpiVal}>{formatCurrency(stats.netBalance)}</span>
          <span className={styles.kpiSub}>Liquid organizational cash</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Receipts</span>
            <FiArrowDownLeft className={styles.receiptIcon} />
          </div>
          <span className={styles.kpiVal}>{formatCurrency(stats.totalReceipts)}</span>
          <span className={styles.kpiSub}>All cash inflows</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Payments</span>
            <FiArrowUpRight className={styles.paymentIcon} />
          </div>
          <span className={styles.kpiVal}>{formatCurrency(stats.totalPayments)}</span>
          <span className={styles.kpiSub}>All cash outflows</span>
        </div>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.cardTitle}>Inflow Breakdown</h3>
          <div className={styles.barList}>
            <div className={styles.barRow}>
              <div className={styles.barInfo}>
                <span className={styles.barLabel}>Donations</span>
                <span className={styles.barVal}>{formatCurrency(stats.donations)}</span>
              </div>
              <div className={styles.barTrack}>
                <div 
                  className={`${styles.barFill} ${styles.fillDonation}`} 
                  style={{ width: `${(stats.donations / getMaxCategoryVal) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.barRow}>
              <div className={styles.barInfo}>
                <span className={styles.barLabel}>Sponsorships</span>
                <span className={styles.barVal}>{formatCurrency(stats.sponsorships)}</span>
              </div>
              <div className={styles.barTrack}>
                <div 
                  className={`${styles.barFill} ${styles.fillSponsorship}`} 
                  style={{ width: `${(stats.sponsorships / getMaxCategoryVal) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.barRow}>
              <div className={styles.barInfo}>
                <span className={styles.barLabel}>Event Collections</span>
                <span className={styles.barVal}>{formatCurrency(stats.eventCollections)}</span>
              </div>
              <div className={styles.barTrack}>
                <div 
                  className={`${styles.barFill} ${styles.fillEvent}`} 
                  style={{ width: `${(stats.eventCollections / getMaxCategoryVal) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.barRow}>
              <div className={styles.barInfo}>
                <span className={styles.barLabel}>Fundraising</span>
                <span className={styles.barVal}>{formatCurrency(stats.fundraising)}</span>
              </div>
              <div className={styles.barTrack}>
                <div 
                  className={`${styles.barFill} ${styles.fillFundraising}`} 
                  style={{ width: `${(stats.fundraising / getMaxCategoryVal) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.barRow}>
              <div className={styles.barInfo}>
                <span className={styles.barLabel}>Other Income</span>
                <span className={styles.barVal}>{formatCurrency(stats.otherIncome)}</span>
              </div>
              <div className={styles.barTrack}>
                <div 
                  className={`${styles.barFill} ${styles.fillOther}`} 
                  style={{ width: `${(stats.otherIncome / getMaxCategoryVal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.historyCard}>
          <div className={styles.cardHeaderFlex}>
            <h3 className={styles.cardTitle}>Recent Ledger Activity</h3>
            <Link to="../cash-book" className={styles.viewAllLink}>View Cash Book</Link>
          </div>
          
          <div className={styles.transactionList}>
            {recentTransactions.length === 0 ? (
              <div className={styles.emptyHistory}>
                <FiActivity size={24} />
                <span>No transactions registered yet.</span>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className={styles.txItem}>
                  <div className={styles.txLeft}>
                    <div className={`${styles.iconCircle} ${tx.txType === "Receipt" ? styles.circleIn : styles.circleOut}`}>
                      {tx.txType === "Receipt" ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                    </div>
                    <div className={styles.txInfo}>
                      <span className={styles.txDesc}>{tx.description}</span>
                      <span className={styles.txDate}>{tx.date} &bull; {tx.category}</span>
                    </div>
                  </div>
                  <div className={styles.txRight}>
                    <span className={`${styles.txAmount} ${tx.txType === "Receipt" ? styles.amountIn : styles.amountOut}`}>
                      {tx.txType === "Receipt" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                    <span className={styles.txRef}>{tx.receiptNumber || tx.paymentNumber || "—"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.eventsCard}>
        <div className={styles.cardHeaderFlex}>
          <h3 className={styles.cardTitle}>Upcoming Events Financial Tracks</h3>
          <Link to="../events" className={styles.viewAllLink}>Manage Events</Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className={styles.emptyEvents}>
            <FiCalendar size={24} />
            <span>No upcoming active events scheduled.</span>
          </div>
        ) : (
          <div className={styles.eventsGrid}>
            {upcomingEvents.map((ev) => (
              <div key={ev.id} className={styles.eventCardItem} onClick={() => navigate(`../events/${ev.id}`)}>
                <div className={styles.eventCardHeader}>
                  <span className={styles.eventDateBadge}>{ev.startDate}</span>
                  <span className={styles.activeLabel}>Active</span>
                </div>
                <h4 className={styles.eventItemName}>{ev.name}</h4>
                <p className={styles.eventItemDesc}>{ev.description}</p>
                <div className={styles.eventFooterLink}>
                  <span>Open details &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboard;
