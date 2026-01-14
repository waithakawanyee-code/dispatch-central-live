import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface DriverHoursData {
  driverName: string;
  vehicleId: string | null;
  startTime: string | null;
  endTime: string | null;
}

export function generateHoursPdf(
  drivers: DriverHoursData[],
  date: Date
): void {
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

  // Prepare table data
  const tableData = sortedDrivers.map((driver) => [
    driver.driverName,
    driver.vehicleId || "",
    driver.startTime || "",
    driver.endTime || "",
  ]);

  // Generate table
  autoTable(doc, {
    startY: 60,
    head: [["Driver Name", "Vehicle ID", "Start Time", "End Time"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 11,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 180 }, // Driver Name - widest
      1: { cellWidth: 100 }, // Vehicle ID
      2: { cellWidth: 80 },  // Start Time
      3: { cellWidth: 80 },  // End Time
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

  // Open print dialog
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
