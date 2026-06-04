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
  FiUsers,
  FiSlash
} from "react-icons/fi";
import { memberService } from "../services/memberService";
import { exportMembersToExcel } from "../utils/excelUtils";
import { useToast } from "../components/Toast";
import styles from "./Membership.module.css";

const ITEMS_PER_PAGE = 10;

const Membership = () => {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [bloodFilter, setBloodFilter] = useState("");

  // Sorting State
  const [sortConfig, setSortConfig] = useState({
    key: "serialNumber",
    direction: "desc" // Default to highest serial number first
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Subscribe to real-time member data from Firestore
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

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, genderFilter, bloodFilter]);

  // Filter & Search Logic
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // 1. Search Query Match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        member.name?.toLowerCase().includes(query) ||
        member.address?.toLowerCase().includes(query) ||
        member.mobileNumber?.includes(query) ||
        member.bloodGroup?.toLowerCase().includes(query) ||
        member.remarks?.toLowerCase().includes(query) ||
        String(member.serialNumber).includes(query);

      // 2. Gender Match
      const matchesGender = !genderFilter || member.gender === genderFilter;

      // 3. Blood Group Match
      const matchesBlood = !bloodFilter || member.bloodGroup === bloodFilter;

      return matchesSearch && matchesGender && matchesBlood;
    });
  }, [members, searchQuery, genderFilter, bloodFilter]);

  // Sorting Logic
  const sortedMembers = useMemo(() => {
    const sortableItems = [...filteredMembers];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Format names to lowercase for alphabetic sorting
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

  // Pagination Logic
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
      {/* Header Area */}
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

      {/* Controls Bar (Search & Filter inputs) */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, phone number, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.filters}>
          <select
            className={styles.selectFilter}
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            aria-label="Filter by Gender"
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
        </div>
      </div>

      {/* Table Section */}
      <div className={styles.tableContainer}>
        {loading ? (
          // Skeleton Loader State
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
                  <th className={styles.th}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className={styles.tr}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className={styles.td}>
                        <span className="skeleton" style={{ height: "16px", width: j === 2 ? "180px" : j === 1 ? "120px" : "60px" }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sortedMembers.length === 0 ? (
          // Empty State
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
          // Active Data Table State
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
                    <th className={styles.th}>Remarks</th>
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
                      <td className={styles.td} style={{ fontSize: "13px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={member.remarks}>
                        {member.remarks || <span style={{ color: "#d1d5db" }}>&mdash;</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
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
                  disabled={currentPage === 1}
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
                  disabled={currentPage === totalPages}
                  aria-label="Next Page"
                >
                  <FiChevronRight size={16} style={{ display: "block" }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Membership;
