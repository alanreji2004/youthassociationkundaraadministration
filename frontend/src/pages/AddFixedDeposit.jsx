import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { fdService } from "../services/fdService";
import { useToast } from "../components/Toast";
import styles from "./AddFixedDeposit.module.css";

const AddFixedDeposit = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    fdNumber: "",
    bankName: "",
    branch: "",
    principalAmount: "",
    interestRate: "",
    depositDate: "",
    maturityDate: "",
    maturityAmount: ""
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fdNumber.trim()) errors.fdNumber = "FD Number is required";
    if (!formData.bankName.trim()) errors.bankName = "Bank name is required";
    if (!formData.branch.trim()) errors.branch = "Branch is required";
    
    const principal = parseFloat(formData.principalAmount);
    if (isNaN(principal) || principal <= 0) {
      errors.principalAmount = "Principal must be a positive number";
    }

    const rate = parseFloat(formData.interestRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      errors.interestRate = "Interest rate must be between 0 and 100";
    }

    if (!formData.depositDate) errors.depositDate = "Deposit date is required";
    if (!formData.maturityDate) errors.maturityDate = "Maturity date is required";

    if (formData.depositDate && formData.maturityDate) {
      const dep = new Date(formData.depositDate);
      const mat = new Date(formData.maturityDate);
      if (mat <= dep) {
        errors.maturityDate = "Maturity date must be after deposit date";
      }
    }

    const maturityAmt = parseFloat(formData.maturityAmount);
    if (isNaN(maturityAmt) || maturityAmt <= 0) {
      errors.maturityAmount = "Maturity amount must be a positive number";
    } else if (principal && maturityAmt <= principal) {
      errors.maturityAmount = "Maturity amount should be greater than principal amount";
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please correct the form validation errors.");
      return;
    }
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    setIsSubmitting(true);
    try {
      await fdService.addFixedDeposit(formData);
      toast.success("Fixed Deposit added successfully!");
      setShowConfirmModal(false);
      navigate("/financial-accounts/fixed-deposits");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create Fixed Deposit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(parseFloat(val) || 0);
  };

  return (
    <div>
      <div className={styles.header}>
        <Link to="/financial-accounts/fixed-deposits" className={styles.backBtn} aria-label="Go back">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className={styles.title}>New Fixed Deposit</h1>
          <p className={styles.subtitle}>Register a new organizational investment receipt</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.sectionsContainer}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Certificate Details</h2>
          <p className={styles.cardSubtitle}>Basic deposit information and bank location</p>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="fdNumber" className={styles.label}>FD Number *</label>
              <input
                type="text"
                id="fdNumber"
                name="fdNumber"
                className={`${styles.input} ${formErrors.fdNumber ? styles.inputError : ""}`}
                placeholder="e.g. FD-2026-001"
                value={formData.fdNumber}
                onChange={handleChange}
              />
              {formErrors.fdNumber && <span className={styles.errorText}>{formErrors.fdNumber}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bankName" className={styles.label}>Bank Name *</label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                className={`${styles.input} ${formErrors.bankName ? styles.inputError : ""}`}
                placeholder="e.g. Federal Bank"
                value={formData.bankName}
                onChange={handleChange}
              />
              {formErrors.bankName && <span className={styles.errorText}>{formErrors.bankName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="branch" className={styles.label}>Branch *</label>
              <input
                type="text"
                id="branch"
                name="branch"
                className={`${styles.input} ${formErrors.branch ? styles.inputError : ""}`}
                placeholder="e.g. Kundara"
                value={formData.branch}
                onChange={handleChange}
              />
              {formErrors.branch && <span className={styles.errorText}>{formErrors.branch}</span>}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Financial Terms</h2>
          <p className={styles.cardSubtitle}>Principal, rates, dates, and maturity projections</p>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="principalAmount" className={styles.label}>Principal Amount (₹) *</label>
              <input
                type="number"
                step="any"
                id="principalAmount"
                name="principalAmount"
                className={`${styles.input} ${formErrors.principalAmount ? styles.inputError : ""}`}
                placeholder="0.00"
                value={formData.principalAmount}
                onChange={handleChange}
              />
              {formErrors.principalAmount && <span className={styles.errorText}>{formErrors.principalAmount}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="interestRate" className={styles.label}>Interest Rate (% p.a.) *</label>
              <input
                type="number"
                step="0.01"
                id="interestRate"
                name="interestRate"
                className={`${styles.input} ${formErrors.interestRate ? styles.inputError : ""}`}
                placeholder="0.00"
                value={formData.interestRate}
                onChange={handleChange}
              />
              {formErrors.interestRate && <span className={styles.errorText}>{formErrors.interestRate}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="maturityAmount" className={styles.label}>Maturity Amount (₹) *</label>
              <input
                type="number"
                step="any"
                id="maturityAmount"
                name="maturityAmount"
                className={`${styles.input} ${formErrors.maturityAmount ? styles.inputError : ""}`}
                placeholder="0.00"
                value={formData.maturityAmount}
                onChange={handleChange}
              />
              {formErrors.maturityAmount && <span className={styles.errorText}>{formErrors.maturityAmount}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="depositDate" className={styles.label}>Deposit Date *</label>
              <input
                type="date"
                id="depositDate"
                name="depositDate"
                className={`${styles.input} ${formErrors.depositDate ? styles.inputError : ""}`}
                value={formData.depositDate}
                onChange={handleChange}
              />
              {formErrors.depositDate && <span className={styles.errorText}>{formErrors.depositDate}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="maturityDate" className={styles.label}>Maturity Date *</label>
              <input
                type="date"
                id="maturityDate"
                name="maturityDate"
                className={`${styles.input} ${formErrors.maturityDate ? styles.inputError : ""}`}
                value={formData.maturityDate}
                onChange={handleChange}
              />
              {formErrors.maturityDate && <span className={styles.errorText}>{formErrors.maturityDate}</span>}
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <Link to="/financial-accounts/fixed-deposits" className={`${styles.btn} ${styles.btnSecondary}`}>
            Cancel
          </Link>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            Save Fixed Deposit
          </button>
        </div>
      </form>

      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirm Fixed Deposit Creation</h3>
              <button type="button" onClick={() => setShowConfirmModal(false)} className={styles.modalCloseBtn}>
                <FiX size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmIntro}>Please verify the entered investment parameters before saving to database registries:</p>
              <table className={styles.confirmTable}>
                <tbody>
                  <tr>
                    <th>FD Number</th>
                    <td>{formData.fdNumber}</td>
                  </tr>
                  <tr>
                    <th>Bank & Branch</th>
                    <td>{formData.bankName} ({formData.branch})</td>
                  </tr>
                  <tr>
                    <th>Principal Amount</th>
                    <td>{formatCurrency(formData.principalAmount)}</td>
                  </tr>
                  <tr>
                    <th>Interest Rate</th>
                    <td>{formData.interestRate}% p.a.</td>
                  </tr>
                  <tr>
                    <th>Maturity Amount</th>
                    <td>{formatCurrency(formData.maturityAmount)}</td>
                  </tr>
                  <tr>
                    <th>Deposit Date</th>
                    <td>{formData.depositDate}</td>
                  </tr>
                  <tr>
                    <th>Maturity Date</th>
                    <td>{formData.maturityDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setShowConfirmModal(false)} className={styles.modalCancelBtn}>
                Cancel & Edit
              </button>
              <button type="button" onClick={executeSave} className={styles.modalConfirmBtn} disabled={isSubmitting}>
                {isSubmitting ? <span className={styles.spinner} /> : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddFixedDeposit;
