import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const formatCurrencyNumber = (val) => {
  return parseFloat(val) || 0;
};

export const exportCashBookToExcel = (ledger) => {
  const data = ledger.map(tx => ({
    "Date": tx.date,
    "Module": tx.sourceModule,
    "Voucher No.": tx.referenceNumber,
    "Category/Type": tx.type,
    "Particulars": tx.particulars,
    "Receipt (In)": tx.receiptAmount > 0 ? formatCurrencyNumber(tx.receiptAmount) : 0,
    "Payment (Out)": tx.paymentAmount > 0 ? formatCurrencyNumber(tx.paymentAmount) : 0,
    "Running Balance": formatCurrencyNumber(tx.runningBalance),
    "Remarks": tx.remarks || ""
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 20 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Cash Book");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, "SMYA_Cash_Book_Ledger.xlsx");
};

export const exportReceiptsToExcel = (receipts) => {
  const data = receipts.map(r => ({
    "Receipt No.": r.receiptNumber,
    "Date": r.date,
    "Category": r.category,
    "Source": r.source,
    "Description": r.description,
    "Amount": formatCurrencyNumber(r.amount),
    "Remarks": r.remarks || ""
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 },
    { wch: 15 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Receipts");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, "SMYA_Receipts_Registry.xlsx");
};

export const exportPaymentsToExcel = (payments) => {
  const data = payments.map(p => ({
    "Payment No.": p.paymentNumber,
    "Date": p.date,
    "Category": p.category,
    "Paid To": p.paidTo,
    "Description": p.description,
    "Amount": formatCurrencyNumber(p.amount),
    "Remarks": p.remarks || ""
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 20 },
    { wch: 22 },
    { wch: 30 },
    { wch: 15 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Payments");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, "SMYA_Payments_Registry.xlsx");
};

export const exportAnnualReportToExcel = (reportData) => {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    ["ST. MARY'S YOUTH ASSOCIATION, KUNDARA"],
    ["CONSOLIDATED FINANCIAL ANNUAL REPORT STATEMENT"],
    [`Period: ${reportData.startDate} to ${reportData.endDate}`],
    [],
    ["SUMMARY POSTING", "AMOUNT (INR)"],
    ["Opening Cash Position Balance", formatCurrencyNumber(reportData.openingBalance)],
    ["Total Collected Receipts Inflows (+)", formatCurrencyNumber(reportData.totalReceipts)],
    ["Total Disbursed Payments Outflows (-)", formatCurrencyNumber(reportData.totalPayments)],
    ["Closing Cash Position Balance (=)", formatCurrencyNumber(reportData.closingBalance)],
    [],
    ["INBOUND RECEIPTS BREAKDOWN", "AMOUNT (INR)"],
    ["Donations", formatCurrencyNumber(reportData.receiptsBreakdown.donations)],
    ["Sponsorships", formatCurrencyNumber(reportData.receiptsBreakdown.sponsorships)],
    ["Event Collections", formatCurrencyNumber(reportData.receiptsBreakdown.eventCollections)],
    ["Fundraising Collections", formatCurrencyNumber(reportData.receiptsBreakdown.fundraising)],
    ["Other Income", formatCurrencyNumber(reportData.receiptsBreakdown.otherIncome)],
    ["TOTAL RECEIPTS", formatCurrencyNumber(reportData.totalReceipts)],
    [],
    ["OUTBOUND PAYMENTS BREAKDOWN", "AMOUNT (INR)"],
    ["Food Expenses", formatCurrencyNumber(reportData.paymentsBreakdown.food)],
    ["Travel Expenses", formatCurrencyNumber(reportData.paymentsBreakdown.travel)],
    ["Program Expenses", formatCurrencyNumber(reportData.paymentsBreakdown.program)],
    ["Printing", formatCurrencyNumber(reportData.paymentsBreakdown.printing)],
    ["Equipment", formatCurrencyNumber(reportData.paymentsBreakdown.equipment)],
    ["Charity Activities", formatCurrencyNumber(reportData.paymentsBreakdown.charity)],
    ["Utility Payments", formatCurrencyNumber(reportData.paymentsBreakdown.utility)],
    ["Miscellaneous Expenses", formatCurrencyNumber(reportData.paymentsBreakdown.miscellaneous)],
    ["TOTAL PAYMENTS", formatCurrencyNumber(reportData.totalPayments)]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 35 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Financial Summary");

  if (reportData.eventContributions && reportData.eventContributions.length > 0) {
    const eventData = reportData.eventContributions.map(ev => ({
      "Event Name": ev.name,
      "Income Collected": formatCurrencyNumber(ev.income),
      "Expenses Disbursed": formatCurrencyNumber(ev.expenses),
      "Net Contribution Balance": formatCurrencyNumber(ev.balance),
      "Status": ev.status
    }));
    const wsEvents = XLSX.utils.json_to_sheet(eventData);
    wsEvents["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsEvents, "Event Contributions");
  }

  if (reportData.monthlySummaries && reportData.monthlySummaries.length > 0) {
    const monthlyData = reportData.monthlySummaries.map(m => ({
      "Month": m.month,
      "Receipts (In)": formatCurrencyNumber(m.receipts),
      "Payments (Out)": formatCurrencyNumber(m.payments),
      "Net Activity Balance": formatCurrencyNumber(m.balance)
    }));
    const wsMonths = XLSX.utils.json_to_sheet(monthlyData);
    wsMonths["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsMonths, "Monthly Trends");
  }

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, `SMYA_Annual_Financial_Report_${reportData.startDate}_to_${reportData.endDate}.xlsx`);
};
