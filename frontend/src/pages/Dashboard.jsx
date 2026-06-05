import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FiUsers, 
  FiArrowRight, 
  FiCalendar 
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { memberService } from "../services/memberService";
import styles from "./Dashboard.module.css";

const Dashboard = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = memberService.subscribeMembers(
      (data) => {
        setMembers(data);
        setLoading(false);
      },
      (err) => {
        console.error("Dashboard failed to subscribe to members:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const totalMembers = members.length;
  const maleCount = members.filter((m) => m.gender === "Male").length;
  const femaleCount = members.filter((m) => m.gender === "Female").length;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Administration Dashboard</h1>
        <p className={styles.subtitle}>
          Welcome to St. Mary's Youth Association Administration Portal.
        </p>
      </div>

      <div className={styles.grid}>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Membership Management</span>
            <FiUsers className={styles.cardIcon} />
          </div>
          <div className={styles.cardBody}>
            {loading ? (
              <span className="skeleton" style={{ height: "32px", width: "80px" }} />
            ) : (
              <span className={styles.cardValue}>{totalMembers}</span>
            )}
            <span className={styles.cardDesc}>
              {loading ? (
                <span className="skeleton" style={{ height: "12px", width: "120px", marginTop: "4px" }} />
              ) : (
                `Registered members (${maleCount} M / ${femaleCount} F)`
              )}
            </span>
          </div>
          <Link to="/membership" className={styles.cardLink}>
            <span>Manage members</span>
            <FiArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Financial Accounts</span>
            <FaRupeeSign className={styles.cardIcon} />
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>Treasury</span>
            <span className={styles.cardDesc}>
              Fixed deposit certificates, interest profiles, and audit trails
            </span>
          </div>
          <Link to="/financial-accounts" className={styles.cardLink}>
            <span>Manage accounts</span>
            <FiArrowRight size={14} />
          </Link>
        </div>

        
        <div className={`${styles.card} ${styles.cardLocked}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Events & Activities</span>
            <FiCalendar className={styles.cardIcon} />
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>0</span>
            <span className={styles.cardDesc}>
              Upcoming parish & youth events scheduled
            </span>
          </div>
          <span className={styles.badge}>Coming Soon</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
