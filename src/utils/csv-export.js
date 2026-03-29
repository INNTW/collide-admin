/**
 * Export data as CSV file download
 * @param {Array<Object>} data - Array of objects to export
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @param {string} filename - Download filename (without .csv)
 */
export function exportCSV(data, columns, filename) {
  if (!data || data.length === 0) return;

  const escapeValue = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((col) => escapeValue(col.label)).join(",");
  const rows = data.map((row) =>
    columns.map((col) => escapeValue(row[col.key])).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split("T")[0];
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
