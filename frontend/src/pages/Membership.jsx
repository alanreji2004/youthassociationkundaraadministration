import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  FiPlus, 
  FiDownload, 
  FiSearch, 
  FiChevronLeft, 
  FiChevronRight, 
  FiArrowUp, 
  FiArrowDown, 
  FiSlash,
  FiEdit3,
  FiTrash2
} from "react-icons/fi";
import { memberService } from "../services/memberService";
import { exportMembersToExcel } from "../utils/excelUtils";
import { useToast } from "../components/Toast";
import ConfirmationModal from "../components/ConfirmationModal";
import styles from "./Membership.module.css";

const ITEMS_PER_PAGE = 10;

const Membership = () => {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [bloodFilter, setBloodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); 

  
  const [sortConfig, setSortConfig] = useState({
    key: "serialNumber",
    direction: "desc" 
  });

  
  const [currentPage, setCurrentPage] = useState(1);

  
  const [isDeleteModal1Open, setIsDeleteModal1Open] = useState(false);
  const [isDeleteModal2Open, setIsDeleteModal2Open] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  
  useEffect(() => {
    const unsubscribe = memberService.subscribeMembers(
      (data) => {
        setMembers(data);
        setLoading(false);
      },
      (error) => {
        toast.error("Failed to load real-time database updates.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, genderFilter, bloodFilter, statusFilter]);

  
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        member.name?.toLowerCase().includes(query) ||
        member.address?.toLowerCase().includes(query) ||
        member.mobileNumber?.includes(query) ||
        member.bloodGroup?.toLowerCase().includes(query) ||
        member.remarks?.toLowerCase().includes(query) ||
        String(member.serialNumber).includes(query);

      
      const matchesGender = !genderFilter || member.gender === genderFilter;

      
      const matchesBlood = !bloodFilter || member.bloodGroup === bloodFilter;

      
      const memberStatus = member.status || "Active";
      const matchesStatus = !statusFilter || memberStatus === statusFilter;

      return matchesSearch && matchesGender && matchesBlood && matchesStatus;
    });
  }, [members, searchQuery, genderFilter, bloodFilter, statusFilter]);

  
  const sortedMembers = useMemo(() => {
    const sortableItems = [...filteredMembers];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key] || "";
        let valB = b[sortConfig.key] || "";

        
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredMembers, sortConfig]);

  
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedMembers, currentPage]);

  const totalPages = Math.ceil(sortedMembers.length / ITEMS_PER_PAGE) || 1;

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleExport = () => {
    if (members.length === 0) {
      toast.error("There is no member data to export.");
      return;
    }
    try {
      exportMembersToExcel(members);
      toast.success("Excel spreadsheet exported successfully.");
    } catch (err) {
      toast.error("Export failed. Please try again.");
    }
  };

  
  const handleDeleteAllConfirm = async (enteredPassword) => {
    if (!enteredPassword) {
      toast.error("Password is required to confirm database reset.");
      return;
    }
    
    setIsDeleteModal2Open(false);
    setIsDeleting(true);
    toast.info("Verifying credentials and wiping registry database...", 0);
    try {
      await memberService.deleteAllMembersWithAuth(enteredPassword);
      toast.success("All member records deleted and counter reset to 0.");
    } catch (err) {
      toast.error(err.message || "Failed to clear member database.");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return (
      <span className={styles.sortIconWrapper}>
        {sortConfig.direction === "asc" ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
      </span>
    );
  };

  return (
    <div>
      
      <div className={styles.headerArea}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Membership Management</h1>
          <p className={styles.subtitle}>
            Monitor, filter, and export the registry of organization members.
          </p>
        </div>
        <div className={styles.actionsArea}>
          <button 
            onClick={handleExport}
            className={`${styles.btn} ${styles.btnSecondary}`}
            title="Download full database snapshot"
            disabled={isDeleting}
          >
            <FiDownload />
            <span>Export Excel</span>
          </button>
          <Link to="/membership/add" className={`${styles.btn} ${styles.btnPrimary}`}>
            <FiPlus />
            <span>Add Member</span>
          </Link>
        </div>
      </div>

      
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, phone number, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isDeleting}
          />
        </div>
        
        <div className={styles.filters}>
          <select
            className={styles.selectFilter}
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            aria-label="Filter by Gender"
            disabled={isDeleting}
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            className={styles.selectFilter}
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value)}
            aria-label="Filter by Blood Group"
            disabled={isDeleting}
          >
            <option value="">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>

          <select
            className={styles.selectFilter}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by Status"
            disabled={isDeleting}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      
      <div className={styles.tableContainer}>
        {loading ? (
          
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>S.No.</th>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Address</th>
                  <th className={styles.th}>Gender</th>
                  <th className={styles.th}>Date of Birth</th>
                  <th className={styles.th}>Mobile</th>
                  <th className={styles.th}>Blood Group</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Remarks</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className={styles.tr}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className={styles.td}>
                        <span className="skeleton" style={{ height: "16px", width: j === 2 ? "150px" : j === 1 ? "100px" : "50px" }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sortedMembers.length === 0 ? (
          
          <div className={styles.emptyState}>
            <FiSlash className={styles.emptyIcon} />
            <h3 className={styles.emptyStateTitle}>No Members Found</h3>
            <p className={styles.emptyStateDesc}>
              {members.length === 0 
                ? "There are currently no members in the database registry." 
                : "No records match your active search terms or filtering selections."}
            </p>
            {members.length === 0 && (
              <Link to="/membership/add" className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: "8px" }}>
                <FiPlus />
                <span>Add First Member</span>
              </Link>
            )}
          </div>
        ) : (
          
          <>
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr>
                    <th 
                      className={`${styles.th} ${styles.thSortable}`} 
                      onClick={() => handleSort("serialNumber")}
                    >
                      S.No. {renderSortIcon("serialNumber")}
                    </th>
                    <th 
                      className={`${styles.th} ${styles.thSortable}`} 
                      onClick={() => handleSort("name")}
                    >
                      Name {renderSortIcon("name")}
                    </th>
                    <th className={styles.th}>Address</th>
                    <th className={styles.th}>Gender</th>
                    <th 
                      className={`${styles.th} ${styles.thSortable}`} 
                      onClick={() => handleSort("dob")}
                    >
                      Date of Birth {renderSortIcon("dob")}
                    </th>
                    <th className={styles.th}>Mobile Number</th>
                    <th 
                      className={`${styles.th} ${styles.thSortable}`} 
                      onClick={() => handleSort("bloodGroup")}
                    >
                      Blood Group {renderSortIcon("bloodGroup")}
                    </th>
                    <th 
                      className={`${styles.th} ${styles.thSortable}`} 
                      onClick={() => handleSort("status")}
                    >
                      Status {renderSortIcon("status")}
                    </th>
                    <th className={styles.th}>Remarks</th>
                    <th className={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((member) => (
                    <tr key={member.id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.serialCell}`}>
                        #{member.serialNumber}
                      </td>
                      <td className={`${styles.td} ${styles.nameCell}`}>
                        {member.name}
                      </td>
                      <td className={styles.td}>
                        {member.address}
                      </td>
                      <td className={styles.td}>
                        <span className={member.gender === "Male" ? styles.genderMale : member.gender === "Female" ? styles.genderFemale : ""}>
                          {member.gender}
                        </span>
                      </td>
                      <td className={styles.td}>
                        {member.dob}
                      </td>
                      <td className={styles.td}>
                        {member.mobileNumber}
                      </td>
                      <td className={styles.td}>
                        <span className={styles.bloodBadge}>
                          {member.bloodGroup}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span
                          className={`${styles.statusBadge} ${
                            (member.status || "Active") === "Active"
                              ? styles.statusActive
                              : styles.statusInactive
                          }`}
                        >
                          <span className={styles.statusDot} />
                          <span>{member.status || "Active"}</span>
                        </span>
                      </td>
                      <td className={styles.td} style={{ fontSize: "13px", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={member.remarks}>
                        {member.remarks || <span style={{ color: "#d1d5db" }}>&mdash;</span>}
                      </td>
                      <td className={styles.td}>
                        <Link
                          to={`/membership/edit/${member.id}`}
                          className={styles.btnTableEdit}
                          aria-label={`Edit details of ${member.name}`}
                          disabled={isDeleting}
                        >
                          <FiEdit3 style={{ marginRight: "4px" }} />
                          <span>Edit</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                Showing <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * ITEMS_PER_PAGE, sortedMembers.length)}</strong> of{" "}
                <strong>{sortedMembers.length}</strong> records
              </span>

              <div className={styles.paginationBtns}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || isDeleting}
                  aria-label="Previous Page"
                >
                  <FiChevronLeft size={16} style={{ display: "block" }} />
                </button>
                
                <span className={styles.pageBtn} style={{ cursor: "default", backgroundColor: "var(--bg-hover)" }}>
                  {currentPage} / {totalPages}
                </span>

                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || isDeleting}
                  aria-label="Next Page"
                >
                  <FiChevronRight size={16} style={{ display: "block" }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      
      {!loading && members.length > 0 && (
        <div className={styles.dangerZone}>
          <div className={styles.dangerZoneHeader}>
            <h3 className={styles.dangerZoneTitle}>Danger Zone</h3>
            <p className={styles.dangerZoneDesc}>
              These administrative operations are destructive and irreversible. Verify your intent before proceeding.
            </p>
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDangerAction}`}
            onClick={() => setIsDeleteModal1Open(true)}
            disabled={isDeleting}
          >
            <FiTrash2 />
            <span>Wipe Registry Database</span>
          </button>
        </div>
      )}

      
      <ConfirmationModal
        isOpen={isDeleteModal1Open}
        title="Wipe Database Registry?"
        message="Are you sure you want to delete ALL member records from the registry database? This will permanently wipe all entries from Firestore and cannot be undone."
        onConfirm={() => {
          setIsDeleteModal1Open(false);
          setIsDeleteModal2Open(true);
        }}
        onCancel={() => setIsDeleteModal1Open(false)}
        confirmText="Yes, Proceed"
        cancelText="Cancel"
        isDanger={true}
      />

      
      <ConfirmationModal
        isOpen={isDeleteModal2Open}
        title="FINAL WARNING: Wipe Member Database?"
        message="This is the final confirmation. If you proceed, all records will be deleted and the serial number counter will reset back to 0. Please enter your administrator password to execute."
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setIsDeleteModal2Open(false)}
        confirmText="Confirm Wipe"
        cancelText="Cancel"
        isDanger={true}
        showPasswordInput={true}
        passwordPlaceholder="Confirm your password to reset database"
      />
    </div>
  );
};

export default Membership;
