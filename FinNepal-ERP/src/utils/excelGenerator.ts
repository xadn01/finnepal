import * as XLSX from 'xlsx';

interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  data: any[];
  headers: string[];
}

export const generateExcel = (options: ExcelExportOptions) => {
  const { filename, sheetName, data, headers } = options;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: headers,
  });

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}; 