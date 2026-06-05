import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, 
  FiDownload, 
  FiUploadCloud, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiTrash2, 
  FiX 
} from "react-icons/fi";
import { memberService } from "../services/memberService";
import { downloadImportTemplate, parseImportExcel } from "../utils/excelUtils";
import { useToast } from "../components/Toast";
import styles from "./AddMember.module.css";

const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const AddMember = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Single Member Form State
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    gender: "",
    dob: "",
    mobileNumber: "",
    bloodGroup: "",
    remarks: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Import State
  const [importData, setImportData] = useState(null); // { data, validCount, invalidCount, totalCount }
  const [isImporting, setIsImporting] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Counter State to calculate target S.No. dynamically
  const [members, setMembers] = useState([]);
  const [currentCounter, setCurrentCounter] = useState(0);

  useEffect(() => {
    const unsubscribe = memberService.subscribeMembers(
      (data) => {
        setMembers(data);
        const maxSerial = data.length > 0 ? Math.max(...data.map(m => m.serialNumber || 0)) : 0;
        setCurrentCounter(maxSerial);
      },
      (err) => {
        console.error("Failed to fetch member counter for import preview:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  const getProspectiveSerial = (idx) => {
    const row = importData.data[idx];
    if (!row.isValid) return "—";
    
    // Count valid rows preceding this one
    let validBefore = 0;
    for (let i = 0; i < idx; i++) {
      if (importData.data[i].isValid) {
        validBefore++;
      }
    }
    return `#${currentCounter + validBefore + 1}`;
  };

  // Handle Form Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when field is typed in
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Validate Single Member Form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.dob) errors.dob = "Date of Birth is required";
    
    // Mobile number regex validation
    if (!formData.mobileNumber.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else {
      const cleaned = formData.mobileNumber.trim().replace(/[-\s]/g, "");
      if (!/^\+?[0-9]{10,14}$/.test(cleaned)) {
        errors.mobileNumber = "Enter a valid 10-14 digit mobile number";
      }
    }

    if (!formData.bloodGroup) errors.bloodGroup = "Blood group is required";
    return errors;
  };

  // Handle Single Member Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill out all required fields correctly.");
      return;
    }

    setIsSubmitting(true);
    try {
      await memberService.addMember(formData);
      toast.success("Member added successfully!");
      navigate("/membership");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to add member to registry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Template download
  const handleDownloadTemplate = () => {
    try {
      downloadImportTemplate();
      toast.success("Excel template downloaded.");
    } catch (err) {
      toast.error("Failed to download template.");
    }
  };

  // Handle Excel parsing
  const handleExcelFile = async (file) => {
    setExcelError("");
    setImportData(null);
    
    if (!file) return;
    const fileType = file.name.split(".").pop().toLowerCase();
    if (fileType !== "xlsx") {
      setExcelError("Unsupported file type. Please upload an Excel (.xlsx) file.");
      toast.error("Invalid file format.");
      return;
    }

    try {
      const parsed = await parseImportExcel(file);
      setImportData(parsed);
      toast.success("File parsed. Preview the table below.");
    } catch (err) {
      setExcelError(err.message || "Failed to parse the file.");
      toast.error("Import parsing failed.");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleExcelFile(e.target.files[0]);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleExcelFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Confirm and Save Bulk Imports
  const handleConfirmImport = async () => {
    if (!importData || importData.validCount === 0) {
      toast.error("There are no valid records to import.");
      return;
    }

    setIsImporting(true);
    // Filter only valid records to send to service
    const validRecords = importData.data.filter(row => row.isValid);
    
    try {
      await memberService.bulkImportMembers(validRecords);
      toast.success(`Successfully imported ${validRecords.length} member records!`);
      navigate("/membership");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error occurred during bulk import.");
    } finally {
      setIsImporting(false);
    }
  };

  const clearImportPreview = () => {
    setImportData(null);
    setExcelError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.sectionsContainer}>
      {/* Header Back Button */}
      <div className={styles.header}>
        <Link to="/membership" className={styles.backBtn} aria-label="Go back to list">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className={styles.title}>Register Member</h1>
          <p className={styles.subtitle}>
            Add a new member to the Kundara St. Mary's Youth Association registry.
          </p>
        </div>
      </div>

      {/* Section 1: Add Single Member Card */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Single Registry Form</h2>
        <p className={styles.cardSubtitle}>
          Complete all mandatory fields to auto-assign a serial number to this member.
        </p>

        <form onSubmit={handleFormSubmit}>
          <div className={styles.formGrid}>
            {/* Serial Number placeholder */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Serial Number</label>
              <input
                type="text"
                className={styles.input}
                value="Auto-generated upon save"
                disabled
              />
            </div>

            {/* Name */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>Full Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                className={styles.input}
                placeholder="Enter member's full name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {formErrors.name && <span className={styles.errorText}>{formErrors.name}</span>}
            </div>

            {/* Gender */}
            <div className={styles.formGroup}>
              <label htmlFor="gender" className={styles.label}>Gender *</label>
              <select
                id="gender"
                name="gender"
                className={styles.input}
                value={formData.gender}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="">Select Gender</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {formErrors.gender && <span className={styles.errorText}>{formErrors.gender}</span>}
            </div>

            {/* DOB */}
            <div className={styles.formGroup}>
              <label htmlFor="dob" className={styles.label}>Date of Birth *</label>
              <input
                id="dob"
                name="dob"
                type="date"
                className={styles.input}
                value={formData.dob}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {formErrors.dob && <span className={styles.errorText}>{formErrors.dob}</span>}
            </div>

            {/* Mobile Number */}
            <div className={styles.formGroup}>
              <label htmlFor="mobileNumber" className={styles.label}>Mobile Number *</label>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                className={styles.input}
                placeholder="10-digit number"
                value={formData.mobileNumber}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {formErrors.mobileNumber && <span className={styles.errorText}>{formErrors.mobileNumber}</span>}
            </div>

            {/* Blood Group */}
            <div className={styles.formGroup}>
              <label htmlFor="bloodGroup" className={styles.label}>Blood Group *</label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                className={styles.input}
                value={formData.bloodGroup}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
              {formErrors.bloodGroup && <span className={styles.errorText}>{formErrors.bloodGroup}</span>}
            </div>

            {/* Address */}
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label htmlFor="address" className={styles.label}>Residential Address *</label>
              <textarea
                id="address"
                name="address"
                className={styles.input}
                placeholder="Enter complete house name, landmark, post office, PIN code"
                rows="3"
                value={formData.address}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{ resize: "vertical", minHeight: "80px" }}
              />
              {formErrors.address && <span className={styles.errorText}>{formErrors.address}</span>}
            </div>

            {/* Remarks */}
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label htmlFor="remarks" className={styles.label}>Remarks (Optional)</label>
              <input
                id="remarks"
                name="remarks"
                type="text"
                className={styles.input}
                placeholder="Any special remarks or comments"
                value={formData.remarks}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Link to="/membership" className={`${styles.btn} ${styles.btnSecondary}`} disabled={isSubmitting}>
              Cancel
            </Link>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Member</span>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Section 2: Bulk Import Section */}
      <section className={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "24px" }}>
          <div>
            <h2 className={styles.cardTitle}>Bulk Import Members</h2>
            <p className={styles.subtitle} style={{ margin: 0 }}>
              Import a formatted list of members simultaneously using an Excel spreadsheet.
            </p>
          </div>
          <div>
            <button 
              onClick={handleDownloadTemplate}
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ fontSize: "12px" }}
            >
              <FiDownload />
              <span>Download Template</span>
            </button>
          </div>
        </div>

        {/* Excel Import Dropzone */}
        {!importData && (
          <div 
            className={styles.importZone}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            style={{
              borderColor: dragActive ? "var(--text-primary)" : "var(--border-color)",
              backgroundColor: dragActive ? "var(--bg-hover)" : "#fafafa"
            }}
          >
            <FiUploadCloud className={styles.uploadIcon} />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600 }}>Click to upload or drag & drop</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Excel spreadsheet files (.xlsx) only</p>
            </div>
            <p className={styles.importInstructions}>
              Fill in Name, Address, Gender, DOB, Mobile Number, and Blood Group columns exactly as specified in the template. Do not modify the header labels.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className={styles.fileInput}
              onChange={handleFileChange}
            />
          </div>
        )}

        {excelError && (
          <div className={styles.errorText} style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FiAlertTriangle />
            <span>{excelError}</span>
          </div>
        )}

        {/* Uploaded File Statistics & Preview Grid */}
        {importData && (
          <div>
            {/* Stats */}
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Total Spreadsheet Rows</span>
                <span className={styles.statVal}>{importData.totalCount}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Valid Rows (Will Import)</span>
                <span className={`${styles.statVal} ${styles.statValValid}`}>{importData.validCount}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Invalid Rows (Will Skip)</span>
                <span className={`${styles.statVal} ${styles.statValInvalid}`}>{importData.invalidCount}</span>
              </div>
            </div>

            {/* Warning Alert if errors exist */}
            {importData.invalidCount > 0 && (
              <div style={{ display: "flex", gap: "8px", padding: "12px", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", color: "var(--text-primary)", fontSize: "13px", marginBottom: "16px", alignItems: "flex-start" }}>
                <FiAlertTriangle style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Attention required:</strong> There are {importData.invalidCount} rows containing validation issues. These rows are highlighted in red below and will be excluded during the import process. Ensure they are corrected and uploaded again if they are required.
                </div>
              </div>
            )}

            {/* Scrollable Preview Table */}
            <div className={styles.previewContainer}>
              <div className={styles.previewScroll}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th className={styles.previewTh}>Target S.No.</th>
                      <th className={styles.previewTh}>Name</th>
                      <th className={styles.previewTh}>Gender</th>
                      <th className={styles.previewTh}>DOB</th>
                      <th className={styles.previewTh}>Mobile Number</th>
                      <th className={styles.previewTh}>Blood Group</th>
                      <th className={styles.previewTh}>Remarks</th>
                      <th className={styles.previewTh}>Address</th>
                      <th className={styles.previewTh}>Validation Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.data.map((row, idx) => (
                      <tr key={idx} className={`${styles.previewTr} ${!row.isValid ? styles.rowInvalid : ""}`}>
                        <td className={styles.previewTd} style={{ fontWeight: 600 }}>{getProspectiveSerial(idx)}</td>
                        <td className={styles.previewTd} style={{ fontWeight: 500 }}>{row.name || <span style={{ color: "#d1d5db" }}>N/A</span>}</td>
                        <td className={styles.previewTd}>{row.gender || <span style={{ color: "#d1d5db" }}>N/A</span>}</td>
                        <td className={styles.previewTd}>{row.dob || <span style={{ color: "#d1d5db" }}>N/A</span>}</td>
                        <td className={styles.previewTd}>{row.mobileNumber || <span style={{ color: "#d1d5db" }}>N/A</span>}</td>
                        <td className={styles.previewTd} style={{ fontFamily: "monospace" }}>{row.bloodGroup || <span style={{ color: "#d1d5db" }}>N/A</span>}</td>
                        <td className={styles.previewTd} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>{row.remarks}</td>
                        <td className={styles.previewTd} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>{row.address || <span style={{ color: "#d1d5db" }}>N/A</span>}</td>
                        <td className={styles.previewTd}>
                          {row.isValid ? (
                            <span style={{ color: "var(--color-success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                              <FiCheckCircle /> Valid
                            </span>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: 0 }}>
                              {row.errors.map((err, errIdx) => (
                                <li key={errIdx} className={styles.errorListItem}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions for Import */}
            <div className={styles.formActions} style={{ borderTop: "none", paddingTop: 0 }}>
              <button 
                type="button" 
                onClick={clearImportPreview} 
                className={`${styles.btn} ${styles.btnSecondary}`}
                disabled={isImporting}
              >
                <FiTrash2 />
                <span>Clear Preview</span>
              </button>
              
              <button 
                type="button" 
                onClick={handleConfirmImport} 
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={isImporting || importData.validCount === 0}
              >
                {isImporting ? (
                  <>
                    <span className={styles.spinner} />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle />
                    <span>Import {importData.validCount} Valid Members</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AddMember;
