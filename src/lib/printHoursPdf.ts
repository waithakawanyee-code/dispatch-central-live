import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface DriverHoursData {
  driverName: string;
  driverCode: string | null;
  vehicleId: string | null;
  startTime: string | null;
  endTime: string | null;
  weekHours: number | null;
}

// Calculate hours between two time strings (e.g., "8:30 AM" and "5:00 PM")
function calculateHoursBetween(startTime: string | null, endTime: string | null): number | null {
  if (!startTime || !endTime) return null;
  
  try {
    // Parse times like "8:30 AM" or "5:00 PM"
    const parseTime = (timeStr: string): number => {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return NaN;
      
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      
      return hours + minutes / 60;
    };
    
    const startHours = parseTime(startTime);
    const endHours = parseTime(endTime);
    
    if (isNaN(startHours) || isNaN(endHours)) return null;
    
    let diff = endHours - startHours;
    // Handle overnight shifts
    if (diff < 0) diff += 24;
    
    return Math.round(diff * 100) / 100;
  } catch {
    return null;
  }
}

// Format hours as "X.XX" or empty string
function formatHours(hours: number | null): string {
  if (hours === null || hours === undefined) return "";
  return hours.toFixed(2);
}

function createHoursPdf(drivers: DriverHoursData[], date: Date): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  const dateStr = format(date, "EEEE, MMMM do, yyyy");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Driver Hours - ${dateStr}`, pageWidth / 2, 40, { align: "center" });

  // Sort drivers alphabetically by name
  const sortedDrivers = [...drivers].sort((a, b) =>
    a.driverName.localeCompare(b.driverName)
  );

  // Prepare table data with calculated hours
  const tableData = sortedDrivers.map((driver) => {
    const dailyHours = calculateHoursBetween(driver.startTime, driver.endTime);
    const nameWithCode = driver.driverCode 
      ? `${driver.driverName} (${driver.driverCode})`
      : driver.driverName;
    return [
      nameWithCode,
      driver.vehicleId || "",
      driver.startTime || "",
      driver.endTime || "",
      formatHours(dailyHours),
      formatHours(driver.weekHours),
    ];
  });

  // Generate table
  autoTable(doc, {
    startY: 60,
    head: [["Driver Name", "Vehicle ID", "Start Time", "End Time", "Total Hrs", "Week Hrs"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 140 }, // Driver Name
      1: { cellWidth: 70 },  // Vehicle ID
      2: { cellWidth: 70 },  // Start Time
      3: { cellWidth: 70 },  // End Time
      4: { cellWidth: 55, halign: "center" },  // Total Hrs
      5: { cellWidth: 55, halign: "center" },  // Week Hrs
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: "center" }
      );
    },
  });

  return doc;
}

export function printHoursPdf(drivers: DriverHoursData[], date: Date): void {
  const doc = createHoursPdf(drivers, date);
  
  // Create blob URL and use iframe for printing to avoid popup blocker
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  
  // Create hidden iframe for printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.src = blobUrl;
  
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 100);
    
    // Clean up after printing
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(blobUrl);
    }, 60000);
  };
  
  document.body.appendChild(iframe);
}

export function downloadHoursPdf(drivers: DriverHoursData[], date: Date): void {
  const doc = createHoursPdf(drivers, date);
  const dateStr = format(date, "yyyy-MM-dd");
  doc.save(`driver-hours-${dateStr}.pdf`);
}
