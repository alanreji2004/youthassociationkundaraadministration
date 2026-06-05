import { NavLink, Outlet, useLocation } from "react-router-dom";
import { 
  FiLayout, 
  FiBook, 
  FiArrowDownLeft, 
  FiArrowUpRight, 
  FiCalendar, 
  FiFileText, 
  FiDatabase 
} from "react-icons/fi";
import styles from "./FinancialAccounts.module.css";

const FinancialAccounts = () => {
  const location = useLocation();

  return (
    <div className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <div className={styles.titleSection}>
          <h1 className={styles.mainTitle}>Treasury & Accounts</h1>
          <p className={styles.subTitle}>
            ERP ledger records, cash registers, event tracking, and financial statements.
          </p>
        </div>
        
        <nav className={styles.subTabs}>
          <NavLink
            to="dashboard"
            className={({ isActive }) => 
              isActive ? `${styles.tabLink} ${styles.tabActive}` : styles.tabLink
            }
          >
            <FiLayout size={16} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink
            to="cash-book"
            className={({ isActive }) => 
              isActive ? `${styles.tabLink} ${styles.tabActive}` : styles.tabLink
            }
          >
            <FiBook size={16} />
            <span>Cash Book</span>
          </NavLink>
          
          <NavLink
            to="receipts"
            className={({ isActive }) => 
              isActive ? `${styles.tabLink} ${styles.tabActive}` : styles.tabLink
            }
          >
            <FiArrowDownLeft size={16} />
            <span>Receipts</span>
          </NavLink>
          
          <NavLink
            to="payments"
            className={({ isActive }) => 
              isActive ? `${styles.tabLink} ${styles.tabActive}` : styles.tabLink
            }
          >
            <FiArrowUpRight size={16} />
            <span>Payments</span>
          </NavLink>
          
          <NavLink
            to="events"
            className={({ isActive }) => 
              isActive || location.pathname.includes("/events/")
                ? `${styles.tabLink} ${styles.tabActive}` 
                : styles.tabLink
            }
          >
            <FiCalendar size={16} />
            <span>Events</span>
          </NavLink>
          
          <NavLink
            to="reports"
            className={({ isActive }) => 
              isActive ? `${styles.tabLink} ${styles.tabActive}` : styles.tabLink
            }
          >
            <FiFileText size={16} />
            <span>Reports</span>
          </NavLink>
          
          <NavLink
            to="fixed-deposits"
            className={({ isActive }) => 
              isActive || location.pathname.includes("/fixed-deposits/")
                ? `${styles.tabLink} ${styles.tabActive}` 
                : styles.tabLink
            }
          >
            <FiDatabase size={16} />
            <span>Fixed Deposits</span>
          </NavLink>
        </nav>
      </header>

      <div className={styles.workspaceContent}>
        <Outlet />
      </div>
    </div>
  );
};

export default FinancialAccounts;
