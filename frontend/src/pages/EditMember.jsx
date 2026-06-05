import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, 
  FiSearch, 
  FiSave, 
  FiUserMinus, 
  FiUserCheck, 
  FiAlertTriangle 
} from "react-icons/fi";
import { memberService } from "../services/memberService";
import { useToast } from "../components/Toast";
import ConfirmationModal from "../components/ConfirmationModal";
import styles from "./EditMember.module.css";

const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const EditMember = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const searchContainerRef = useRef(null);

  
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    gender: "",
    dob: "",
    mobileNumber: "",
    bloodGroup: "",
    remarks: "",
    status: "Active"
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStatusToggling, setIsStatusToggling] = useState(false);

  
  useEffect(() => {
    const unsubscribe = memberService.subscribeMembers(
      (data) => {
        setMembers(data);
        setLoadingMembers(false);
      },
      (error) => {
        toast.error("Failed to fetch registry data.");
        setLoadingMembers(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  
  const activeMember = useMemo(() => {
    if (!id || members.length === 0) return null;
    return members.find((m) => m.id === id) || null;
  }, [id, members]);

  
  useEffect(() => {
    if (activeMember) {
      setFormData({
        name: activeMember.name || "",
        address: activeMember.address || "",
        gender: activeMember.gender || "",
        dob: activeMember.dob || "",
        mobileNumber: activeMember.mobileNumber || "",
        bloodGroup: activeMember.bloodGroup || "",
        remarks: activeMember.remarks || "",
        status: activeMember.status || "Active"
      });
      setFormErrors({});
    }
  }, [activeMember]);

  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  
  const filteredSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return members
      .filter((m) => m.name.toLowerCase().includes(query))
      .slice(0, 5); 
  }, [members, searchQuery]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.dob) errors.dob = "Date of Birth is required";
    
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

  
  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please resolve all form errors.");
      return;
    }

    setIsSaving(true);
    try {
      await memberService.updateMember(id, formData);
      toast.success("Member record updated successfully.");
      navigate("/membership");
    } catch (error) {
      toast.error(error.message || "Failed to update member.");
    } finally {
      setIsSaving(false);
    }
  };

  
  const handleStatusToggleConfirm = async () => {
    if (!id) return;
    setIsStatusModalOpen(false);
    setIsStatusToggling(true);
    try {
      const result = await memberService.toggleMemberStatus(id, formData.status);
      toast.success(
        `Member successfully ${result.status === "Active" ? "re-activated" : "deactivated"}.`
      );
      setFormData((prev) => ({ ...prev, status: result.status }));
    } catch (error) {
      toast.error(error.message || "Status change failed.");
    } finally {
      setIsStatusToggling(false);
    }
  };

  const selectSuggestion = (memberId) => {
    setSearchQuery("");
    setShowSuggestions(false);
    navigate(`/membership/edit/${memberId}`);
  };

  return (
    <div className={styles.sectionsContainer}>
      
      <div className={styles.header}>
        <Link to="/membership" className={styles.backBtn} aria-label="Back to registry list">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className={styles.title}>Modify Registry Record</h1>
          <p className={styles.subtitle}>
            Search, preview details, edit fields, or update membership status.
          </p>
        </div>
      </div>

      
      <section className={styles.lookupCard}>
        <h2 className={styles.lookupTitle}>Search Member to Edit</h2>
        <div ref={searchContainerRef} className={styles.lookupWrapper}>
          <div className={styles.searchWrapper}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by member name to select..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
          </div>

          {showSuggestions && searchQuery.trim() && (
            <ul className={styles.suggestionsList}>
              {filteredSuggestions.length === 0 ? (
                <li className={styles.noSuggestions}>No matching names found.</li>
              ) : (
                filteredSuggestions.map((m) => (
                  <li
                    key={m.id}
                    className={styles.suggestionItem}
                    onClick={() => selectSuggestion(m.id)}
                  >
                    <span className={styles.suggestionName}>{m.name}</span>
                    <span className={styles.suggestionDetails}>
                      S.No. #{m.serialNumber} &bull; {m.mobileNumber}
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </section>

      
      {loadingMembers ? (
        <div className={styles.card}>
          <div className="skeleton" style={{ height: "40px", marginBottom: "20px" }} />
          <div className="skeleton" style={{ height: "120px" }} />
        </div>
      ) : !id ? (
        
        <div className={styles.card} style={{ textAlign: "center", padding: "40px 20px" }}>
          <FiSearch size={32} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Please use the search box above to lookup and select a member, or click Edit in the registry table list.
          </p>
        </div>
      ) : !activeMember ? (
        
        <div className={styles.card} style={{ textAlign: "center", padding: "40px 20px" }}>
          <FiAlertTriangle size={32} style={{ color: "var(--color-error)", marginBottom: "12px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            The requested member record was not found or has been removed from the registry.
          </p>
          <Link to="/membership" className={`${styles.btn} ${styles.btnSecondary}`} style={{ marginTop: "16px" }}>
            Return to Registry List
          </Link>
        </div>
      ) : (
        
        <section className={styles.card}>
          <div className={styles.cardHeaderArea}>
            <div>
              <h2 className={styles.cardTitle}>{formData.name || "Edit Member"}</h2>
              <p className={styles.cardSubtitle}>
                Edit fields below. Be sure to hit Save Changes to write modifications to the database.
              </p>
            </div>
            
            
            <div
              className={`${styles.statusBadge} ${
                formData.status === "Active" ? styles.statusActive : styles.statusInactive
              }`}
            >
              <span className={styles.statusDot} />
              <span>{formData.status}</span>
            </div>
          </div>

          <form onSubmit={handleSaveSubmit}>
            <div className={styles.formGrid}>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Serial Number</label>
                <input
                  type="text"
                  className={styles.input}
                  value={`#${activeMember.serialNumber}`}
                  disabled
                />
              </div>

              
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>Full Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className={styles.input}
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isSaving || isStatusToggling}
                />
                {formErrors.name && <span className={styles.errorText}>{formErrors.name}</span>}
              </div>

              
              <div className={styles.formGroup}>
                <label htmlFor="gender" className={styles.label}>Gender *</label>
                <select
                  id="gender"
                  name="gender"
                  className={styles.input}
                  value={formData.gender}
                  onChange={handleInputChange}
                  disabled={isSaving || isStatusToggling}
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {formErrors.gender && <span className={styles.errorText}>{formErrors.gender}</span>}
              </div>

              
              <div className={styles.formGroup}>
                <label htmlFor="dob" className={styles.label}>Date of Birth *</label>
                <input
                  id="dob"
                  name="dob"
                  type="date"
                  className={styles.input}
                  value={formData.dob}
                  onChange={handleInputChange}
                  disabled={isSaving || isStatusToggling}
                />
                {formErrors.dob && <span className={styles.errorText}>{formErrors.dob}</span>}
              </div>

              
              <div className={styles.formGroup}>
                <label htmlFor="mobileNumber" className={styles.label}>Mobile Number *</label>
                <input
                  id="mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  className={styles.input}
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  disabled={isSaving || isStatusToggling}
                />
                {formErrors.mobileNumber && <span className={styles.errorText}>{formErrors.mobileNumber}</span>}
              </div>

              
              <div className={styles.formGroup}>
                <label htmlFor="bloodGroup" className={styles.label}>Blood Group *</label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  className={styles.input}
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  disabled={isSaving || isStatusToggling}
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
                {formErrors.bloodGroup && <span className={styles.errorText}>{formErrors.bloodGroup}</span>}
              </div>

              
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label htmlFor="address" className={styles.label}>Residential Address *</label>
                <textarea
                  id="address"
                  name="address"
                  className={styles.input}
                  rows="3"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={isSaving || isStatusToggling}
                  style={{ resize: "vertical", minHeight: "80px" }}
                />
                {formErrors.address && <span className={styles.errorText}>{formErrors.address}</span>}
              </div>

              
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label htmlFor="remarks" className={styles.label}>Remarks (Optional)</label>
                <input
                  id="remarks"
                  name="remarks"
                  type="text"
                  className={styles.input}
                  value={formData.remarks}
                  onChange={handleInputChange}
                  disabled={isSaving || isStatusToggling}
                />
              </div>
            </div>

            
            <div className={styles.formActions}>
              <div className={styles.leftActions}>
                
                {formData.status === "Active" ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDeactivate}`}
                    onClick={() => setIsStatusModalOpen(true)}
                    disabled={isSaving || isStatusToggling}
                  >
                    <FiUserMinus />
                    <span>Deactivate Member</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnActivate}`}
                    onClick={() => setIsStatusModalOpen(true)}
                    disabled={isSaving || isStatusToggling}
                  >
                    <FiUserCheck />
                    <span>Re-Activate Member</span>
                  </button>
                )}
              </div>

              <div className={styles.rightActions}>
                <Link
                  to="/membership"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  disabled={isSaving || isStatusToggling}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={isSaving || isStatusToggling}
                >
                  {isSaving ? (
                    <>
                      <span className={styles.spinner} />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <FiSave />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      
      <ConfirmationModal
        isOpen={isStatusModalOpen}
        title={formData.status === "Active" ? "Confirm Deactivation" : "Confirm Re-activation"}
        message={
          formData.status === "Active"
            ? `Are you sure you want to deactivate ${formData.name || "this member"}? They will be flagged as Inactive in the membership registry list.`
            : `Are you sure you want to activate ${formData.name || "this member"}? Their status will be restored to Active.`
        }
        onConfirm={handleStatusToggleConfirm}
        onCancel={() => setIsStatusModalOpen(false)}
        confirmText={formData.status === "Active" ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        isDanger={formData.status === "Active"}
      />
    </div>
  );
};

export default EditMember;
