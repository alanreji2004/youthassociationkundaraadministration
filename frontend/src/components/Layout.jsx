import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { 
  FiMenu, 
  FiUsers, 
  FiLogOut, 
  FiLayout, 
  FiDatabase, 
  FiAlertTriangle, 
  FiX 
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import ConfirmationModal from "./ConfirmationModal";
import styles from "./Layout.module.css";

const Layout = () => {
  const { user, logout, isFallback } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLogoutModalOpen(false);
    try {
      await logout();
      toast.success("Successfully logged out.");
      navigate("/login");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const handleLogoutCancel = () => {
    setIsLogoutModalOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      
      {isFallback && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        >
          <div className={styles.fallbackBanner}>
            <FiAlertTriangle />
            <span>
              Running in Local Mock Mode. Add Firebase keys in <code>.env</code> and restart to connect to Firestore.
            </span>
          </div>
        </div>
      )}

      
      <div 
        className={styles.wrapper} 
        style={{ 
          width: "100%", 
          paddingTop: isFallback ? "36px" : "0" 
        }}
      >
        
        <div 
          className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.sidebarOverlayOpen : ""}`} 
          onClick={closeSidebar}
        />

        
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.logo}>
              <span>SMYA Kundara</span>
            </div>
            {isSidebarOpen && (
              <button 
                className={styles.menuToggle} 
                onClick={toggleSidebar}
                style={{ marginLeft: "auto", display: "flex" }}
                aria-label="Close sidebar"
              >
                <FiX />
              </button>
            )}
          </div>
          
          <nav className={styles.sidebarNav}>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => 
                isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
              }
              onClick={closeSidebar}
            >
              <FiLayout size={18} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink 
              to="/membership" 
              className={({ isActive }) => 
                isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
              }
              onClick={closeSidebar}
            >
              <FiUsers size={18} />
              <span>Membership</span>
            </NavLink>
            <NavLink 
              to="/financial-accounts" 
              className={({ isActive }) => 
                isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
              }
              onClick={closeSidebar}
            >
              <FiDatabase size={18} />
              <span>Accounts</span>
            </NavLink>
            <div className={`${styles.navItem} ${styles.navItemDisabled}`} title="Coming soon">
              <FiUsers size={18} style={{ opacity: 0.5 }} />
              <span>Events (Soon)</span>
            </div>
          </nav>

          <div className={styles.sidebarFooter}>
            <div>v1.0.0 &copy; 2026</div>
          </div>
        </aside>

        
        <div className={styles.mainArea}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button 
                className={styles.menuToggle} 
                onClick={toggleSidebar}
                aria-label="Toggle sidebar menu"
              >
                <FiMenu />
              </button>
              <span className={styles.orgName}>
                St. Mary's Youth Association, Kundara
              </span>
            </div>

            <div className={styles.headerRight}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user?.displayName || "Administrator"}
                </span>
                <span className={styles.userRole}>Super Admin</span>
              </div>
              
              <button 
                className={styles.btnLogout} 
                onClick={handleLogoutClick}
                aria-label="Log out"
              >
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          </header>

          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>

      
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out of the administration portal? You will need to log in again to manage records."
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        confirmText="Log Out"
        cancelText="Stay logged in"
        isDanger={true}
      />
    </div>
  );
};

export default Layout;
