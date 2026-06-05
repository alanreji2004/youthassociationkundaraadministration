import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Constants for Validation
const VALID_GENDERS = ["Male", "Female", "Other"];
const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

/**
 * Validates a single parsed Excel row.
 * Returns an array of error messages. If empty, the row is valid.
 */
export const validateMemberRow = (row) => {
  const errors = [];

  // Name check
  if (!row.name || typeof row.name !== "string" || !row.name.trim()) {
    errors.push("Name is required");
  }

  // Address check
  if (!row.address || typeof row.address !== "string" || !row.address.trim()) {
    errors.push("Address is required");
  }

  // Gender check
  if (!row.gender) {
    errors.push("Gender is required");
  } else {
    const formattedGender = String(row.gender).trim();
    if (!VALID_GENDERS.some(g => g.toLowerCase() === formattedGender.toLowerCase())) {
      errors.push(`Gender must be one of: ${VALID_GENDERS.join(", ")}`);
    }
  }

  // Date of Birth check (expects string or serial date)
  if (!row.dob) {
    errors.push("Date of Birth (DOB) is required");
  }

  // Mobile Number check
  if (!row.mobileNumber) {
    errors.push("Mobile Number is required");
  } else {
    const mobileStr = String(row.mobileNumber).trim().replace(/[-\s]/g, "");
    if (!/^\+?[0-9]{10,14}$/.test(mobileStr)) {
      errors.push("Mobile number must be a valid 10-14 digit number");
    }
  }

  // Blood Group check
  if (!row.bloodGroup) {
    errors.push("Blood Group is required");
  } else {
    const bgStr = String(row.bloodGroup).trim().toUpperCase();
    if (!VALID_BLOOD_GROUPS.includes(bgStr)) {
      errors.push(`Blood Group must be one of: ${VALID_BLOOD_GROUPS.join(", ")}`);
    }
  }

  return errors;
};

/**
 * Downloads the Excel Template for Bulk Import
 */
export const downloadImportTemplate = () => {
  const headers = [
    ["Name", "Address", "Gender", "DOB", "Mobile Number", "Blood Group", "Remarks"],
    ["John Doe", "123 St. Mary Lane, Kundara", "Male", "1998-05-15", "9876543210", "O+", "Active youth member"],
    ["Jane Smith", "456 Church Road, Kundara", "Female", "2000-09-22", "8765432109", "A-", "Volunteer coordinator"]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(headers);

  // Set column widths
  ws["!cols"] = [
    { wch: 20 }, // Name
    { wch: 35 }, // Address
    { wch: 10 }, // Gender
    { wch: 15 }, // DOB
    { wch: 18 }, // Mobile Number
    { wch: 12 }, // Blood Group
    { wch: 25 }  // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Template");
  
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, "SMYA_Member_Import_Template.xlsx");
};

/**
 * Exports all member data to XLSX format.
 */
export const exportMembersToExcel = (members) => {
  // Sort copy of members by serialNumber ascending for the Excel sheet
  const sortedMembers = [...members].sort((a, b) => a.serialNumber - b.serialNumber);

  // Map members data to expected excel headers (Name, Address, Gender, DOB, Phone Number, Blood Group only)
  const data = sortedMembers.map((member) => ({
    "Name": member.name,
    "Address": member.address,
    "Gender": member.gender,
    "DOB": member.dob,
    "Phone Number": member.mobileNumber,
    "Blood Group": member.bloodGroup
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Column width styling
  ws["!cols"] = [
    { wch: 22 }, // Name
    { wch: 35 }, // Address
    { wch: 12 }, // Gender
    { wch: 15 }, // DOB
    { wch: 18 }, // Phone Number
    { wch: 12 }  // Blood Group
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Members");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, "SMYA_Kundara_Members.xlsx");
};

/**
 * Parses an uploaded Excel (.xlsx) file, maps headers to fields, and validates each row.
 */
export const parseImportExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse sheets as a 2D array to check headers
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length === 0) {
          reject(new Error("The uploaded spreadsheet is empty."));
          return;
        }

        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        
        // Expected columns: Name, Address, Gender, DOB, Mobile Number, Blood Group, Remarks
        const requiredHeaders = ["name", "address", "gender", "dob", "mobile number", "blood group"];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missing.length > 0) {
          reject(new Error(`Missing required column headers: ${missing.join(", ")}`));
          return;
        }

        // Convert worksheet rows to objects manually using indices to avoid header mismatch
        const parsedRows = [];
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const rowData = rows[i];
          if (rowData.length === 0 || rowData.every(val => val === null || val === undefined || val === "")) {
            continue; // Skip completely empty rows
          }

          const getValByHeader = (headerName) => {
            const index = headers.indexOf(headerName);
            if (index === -1) return undefined;
            const val = rowData[index];
            if (val === undefined || val === null) return "";
            return val;
          };

          // Format Date of Birth helper (handles Excel serial dates)
          let parsedDob = getValByHeader("dob");
          if (typeof parsedDob === "number") {
            // Excel serial date representation
            const dateObj = new Date(Math.round((parsedDob - 25569) * 86400 * 1000));
            if (dateObj && !isNaN(dateObj.getTime())) {
              parsedDob = dateObj.toISOString().split('T')[0];
            }
          } else if (parsedDob) {
            // Trim and double-check format
            parsedDob = String(parsedDob).trim();
          }

          const memberObj = {
            name: String(getValByHeader("name")).trim(),
            address: String(getValByHeader("address")).trim(),
            gender: String(getValByHeader("gender")).trim(),
            dob: parsedDob,
            mobileNumber: String(getValByHeader("mobile number")).trim(),
            bloodGroup: String(getValByHeader("blood group")).trim(),
            remarks: String(getValByHeader("remarks")).trim(),
          };

          // Capitalize blood group for uniformity
          if (memberObj.bloodGroup) {
            memberObj.bloodGroup = memberObj.bloodGroup.toUpperCase();
          }
          
          // Capitalize Gender properly
          if (memberObj.gender) {
            memberObj.gender = memberObj.gender.charAt(0).toUpperCase() + memberObj.gender.slice(1).toLowerCase();
          }

          const errors = validateMemberRow(memberObj);
          const isValid = errors.length === 0;

          if (isValid) {
            validCount++;
          } else {
            invalidCount++;
          }

          parsedRows.push({
            ...memberObj,
            errors,
            isValid,
            rowNum: i + 1 // Keep sheet row number references
          });
        }

        resolve({
          data: parsedRows,
          validCount,
          invalidCount,
          totalCount: parsedRows.length
        });
      } catch (err) {
        console.error("Excel parse error:", err);
        reject(new Error("Unable to parse Excel file. Please verify it matches the template."));
      }
    };

    reader.onerror = () => {
      reject(new Error("File read error."));
    };

    reader.readAsArrayBuffer(file);
  });
};
