import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiUploadCloud, FiX } from "react-icons/fi";
import { fdService } from "../services/fdService";
import { useToast } from "../components/Toast";
import styles from "./AddFixedDeposit.module.css";

const AddFixedDeposit = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    bankName: "",
    branch: "",
    principalAmount: "",
    interestRate: "",
    depositDate: "",
    maturityDate: "",
    maturityAmount: "",
    nominee: "",
    remarks: ""
  });

  const [uploadedFile, setUploadedFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(fileType)) {
      toast.error("Unsupported file type. Please upload PDF, JPG, or PNG.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedFile({
        name: file.name,
        type: file.type,
        url: reader.result
      });
      toast.success("Document attached successfully.");
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
  };

  const validateForm = () => {
    const errors = {};
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

    if (!formData.nominee.trim()) errors.nominee = "Nominee / Responsible person is required";

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please correct the form validation errors.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newFd = await fdService.addFixedDeposit(formData);
      if (uploadedFile) {
        let typeGroup = "Other Attachments";
        const extension = uploadedFile.name.split(".").pop().toLowerCase();
        if (extension === "pdf") {
          typeGroup = "Bank Letter";
        } else if (["jpg", "jpeg", "png"].includes(extension)) {
          typeGroup = "FD Receipt";
        }
        await fdService.uploadFdDocument(newFd.id, {
          name: uploadedFile.name,
          type: typeGroup,
          url: uploadedFile.url
        });
      }
      toast.success("Fixed Deposit added successfully!");
      navigate("/financial-accounts/fixed-deposits");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create Fixed Deposit.");
    } finally {
      setIsSubmitting(false);
    }
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
              <span className={styles.label}>FD Number</span>
              <input
                type="text"
                className={styles.input}
                value="Auto-generated on save"
                disabled
              />
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

            <div className={styles.formGroup}>
              <label htmlFor="nominee" className={styles.label}>Nominee / Responsible Person *</label>
              <input
                type="text"
                id="nominee"
                name="nominee"
                className={`${styles.input} ${formErrors.nominee ? styles.inputError : ""}`}
                placeholder="Person in charge of handling"
                value={formData.nominee}
                onChange={handleChange}
              />
              {formErrors.nominee && <span className={styles.errorText}>{formErrors.nominee}</span>}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Supporting Materials</h2>
          <p className={styles.cardSubtitle}>Additional comments and certificate documents</p>

          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label htmlFor="remarks" className={styles.label}>Remarks / Administrative Notes</label>
              <textarea
                id="remarks"
                name="remarks"
                rows="3"
                className={styles.textarea}
                placeholder="Notes for audit trails..."
                value={formData.remarks}
                onChange={handleChange}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <span className={styles.label}>Document Upload</span>
              {!uploadedFile ? (
                <label className={styles.uploadZone}>
                  <FiUploadCloud className={styles.uploadIcon} />
                  <span className={styles.uploadMainText}>Click to upload FD Receipt or Bank Letter</span>
                  <span className={styles.uploadSubText}>Supports PDF, JPG, PNG up to 5MB</span>
                  <input
                    type="file"
                    className={styles.fileInput}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className={styles.uploadedFileBar}>
                  <span className={styles.fileName}>{uploadedFile.name}</span>
                  <button
                    type="button"
                    className={styles.removeFileBtn}
                    onClick={removeFile}
                    aria-label="Remove uploaded file"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              )}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className={styles.spinner} /> : "Save Fixed Deposit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddFixedDeposit;
