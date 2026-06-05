import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiLock, FiUser, FiAlertCircle, FiDatabase } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import styles from "./Login.module.css";

const Login = () => {
  const { user, login, isFallback, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  
  useEffect(() => {
    if (user && !authLoading) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    
    if (!loginId.trim()) {
      setError("Login ID is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      await login(loginId, password);
      toast.success("Welcome back! Successfully logged in.");
      
    } catch (err) {
      setError(err.message || "Authentication failed.");
      toast.error(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
            <span>SMYA Portal</span>
          </div>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>
            St. Mary's Youth Association, Kundara
          </p>
        </div>

        {isFallback && (
          <div className={`${styles.alert} ${styles.infoAlert}`}>
            <FiAlertCircle className={styles.alertIcon} size={16} />
            <div>
              <strong>Local Mock Mode:</strong> Use credentials <code>admin</code> / <code>jsoyaadmin</code>.
            </div>
          </div>
        )}

        {error && (
          <div className={`${styles.alert} ${styles.errorAlert}`} role="alert">
            <FiAlertCircle className={styles.alertIcon} size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="loginId" className={styles.label}>
              Login ID
            </label>
            <div className={styles.inputWrapper}>
              <FiUser className={styles.inputIcon} />
              <input
                id="loginId"
                type="text"
                className={styles.input}
                placeholder="Enter admin username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <FiLock className={styles.inputIcon} />
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
