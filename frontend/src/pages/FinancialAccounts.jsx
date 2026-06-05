import React from "react";
import { Link } from "react-router-dom";
import { FiDatabase, FiLayers, FiTrendingUp, FiTrendingDown, FiFolder } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import styles from "./FinancialAccounts.module.css";

const FinancialAccounts = () => {
  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Financial Accounts</h1>
        <p className={styles.subtitle}>
          Treasury management system, sub-ledgers, and asset auditing tools.
        </p>
      </div>

      <div className={styles.grid}>
        <Link to="/financial-accounts/fixed-deposits" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Fixed Deposits</span>
            <FiDatabase className={styles.cardIcon} />
          </div>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              Track organizational deposit certificates, maturity dates, interest credits, renewals, and closures.
            </p>
            <span className={styles.cardStatus}>Active Module</span>
          </div>
        </Link>

        <div className={`${styles.card} ${styles.cardLocked}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>General Ledger</span>
            <FiLayers className={styles.cardIcon} />
          </div>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              Daily cash registers, banking operations, receipts, payments, and vouchers.
            </p>
            <span className={styles.badge}>Coming Soon</span>
          </div>
        </div>

        {/* <div className={`${styles.card} ${styles.cardLocked}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Budgeting & Treasury</span>
            <FaRupeeSign className={styles.cardIcon} />
          </div>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              Define annual budget targets, track allocation allowances, and monitor departmental expenditures.
            </p>
            <span className={styles.badge}>Coming Soon</span>
          </div>
        </div> */}

        <div className={`${styles.card} ${styles.cardLocked}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Audits & Reports</span>
            <FiTrendingUp className={styles.cardIcon} />
          </div>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              Generate balance sheets, trial balances, account ledgers, and comprehensive financial audit reports.
            </p>
            <span className={styles.badge}>Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAccounts;
