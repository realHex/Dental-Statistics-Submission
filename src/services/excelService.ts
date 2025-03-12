import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabaseClient';
import { DentalStatistics } from '../types';

interface UserProfile {
  id: string;
  name: string;
}

export const excelService = {
  // Generate or update Excel file for a specific month
  async generateMonthlyExcel(year: number, month: number, userId: string, userName: string, data: DentalStatistics): Promise<void> {
    try {
      // Format month for filename (e.g., "2023-01")
      const monthStr = String(month).padStart(2, '0');
      const fileName = `dental_statistics_${year}-${monthStr}.xlsx`;

      // Try to download the existing file
      let workbook = new ExcelJS.Workbook();
      let fileExists = false;
      let userSheetExists = false;
      
      // Check if the file exists in storage
      const { data: existingFile, error: fileError } = await supabase
        .storage
        .from('excel-reports')
        .download(`monthly/${fileName}`);

      if (!fileError && existingFile) {
        // Load the existing workbook
        const buffer = await existingFile.arrayBuffer();
        await workbook.xlsx.load(buffer);
        fileExists = true;
        
        // Check if the user already has a sheet
        userSheetExists = workbook.worksheets.some(sheet => sheet.name === userName);
      }

      // Fetch all users to ensure total sheet is accurate
      const { data: userProfiles, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, name');
      
      if (usersError) {
        console.error('Error fetching user profiles:', usersError);
        throw usersError;
      }

      // Get days in the month
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // Extract day from date
      const day = parseInt(data.date.split('-')[2]);

      // Get or create the user's worksheet
      let userSheet: ExcelJS.Worksheet;
      if (userSheetExists) {
        const sheet = workbook.getWorksheet(userName);
        // Ensure sheet exists
        if (sheet) {
          userSheet = sheet;
        } else {
          // Create sheet if it doesn't exist (this shouldn't happen, but as a safeguard)
          userSheet = workbook.addWorksheet(userName);
          this.setupWorksheetHeaders(userSheet, year, month, daysInMonth);
        }
      } else {
        userSheet = workbook.addWorksheet(userName);
        this.setupWorksheetHeaders(userSheet, year, month, daysInMonth);
      }

      // Update the user's data for the specific day
      this.updateDailyData(userSheet, day, data);

      // Get or create the totals worksheet
      let totalsSheet: ExcelJS.Worksheet;
      const existingTotalsSheet = workbook.getWorksheet('Total');
      if (existingTotalsSheet) {
        totalsSheet = existingTotalsSheet;
      } else {
        totalsSheet = workbook.addWorksheet('Total');
        this.setupWorksheetHeaders(totalsSheet, year, month, daysInMonth);
      }

      // Recalculate the totals
      await this.recalculateTotals(totalsSheet, workbook, userProfiles as UserProfile[]);
      
      // Convert workbook to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase
        .storage
        .from('excel-reports')
        .upload(`monthly/${fileName}`, buffer, { 
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      console.log(`Excel file ${fileName} ${fileExists ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      throw error;
    }
  },

  // Set up headers for a new worksheet
  setupWorksheetHeaders(worksheet: ExcelJS.Worksheet, year: number, month: number, daysInMonth: number): void {
    // Add title row with month and year
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const titleRow = worksheet.addRow([`${monthName} ${year} Dental Statistics`]);
    titleRow.font = { bold: true, size: 14 };
    worksheet.mergeCells(`A1:${this.getColumnName(daysInMonth + 2)}1`);
    titleRow.alignment = { horizontal: 'center' };
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add header row with day numbers
    const headerRow = worksheet.addRow(['Parameter']);
    for (let i = 1; i <= daysInMonth; i++) {
      headerRow.getCell(i + 1).value = i;
      headerRow.getCell(i + 1).font = { bold: true };
      headerRow.getCell(i + 1).alignment = { horizontal: 'center' };
    }
    headerRow.getCell(daysInMonth + 2).value = 'Total';
    headerRow.getCell(daysInMonth + 2).font = { bold: true };
    headerRow.getCell(daysInMonth + 2).alignment = { horizontal: 'center' };
    
    // Add parameter rows
    const parameters = [
      'Extractions',
      'Oro-Facial pain relief',
      'Dento-alveolar trauma',
      'Soft tissue injuries',
      'Post Op Infections/bleeding',
      'TF',
      'GIC',
      'Composite',
      'Scaling',
      'OPMD',
      'Minor Oral Surgery',
      'Referrals',
      'Others',
      'Total attendance',
      'Pregnant Mothers',
      'Age under 3',
      'Age 13-19',
      'Inward Patients'
    ];
    
    parameters.forEach((param, index) => {
      const row = worksheet.addRow([param]);
      row.getCell(1).font = { bold: true };
      
      // Add formula for row totals
      const lastCol = daysInMonth + 2;
      row.getCell(lastCol).value = { 
        formula: `SUM(B${index + 4}:${this.getColumnName(daysInMonth + 1)}${index + 4})`,
        date1904: false
      };
    });

    // Format worksheet
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    worksheet.getColumn(1).width = 25; // Parameter column wider
    worksheet.getColumn(daysInMonth + 2).width = 15; // Total column width
  },

  // Update daily data in a worksheet
  updateDailyData(worksheet: ExcelJS.Worksheet, day: number, data: DentalStatistics): void {
    const paramToRow: Record<string, number> = {
      'extractions': 4,
      'oro_facial_pain_relief': 5,
      'dento_alveolar_trauma': 6,
      'soft_tissue_injuries': 7,
      'post_op_infections_bleeding': 8,
      'tf': 9,
      'gic': 10,
      'composite': 11,
      'scaling': 12,
      'opmd': 13,
      'minor_oral_surgery': 14,
      'referrals': 15,
      'others': 16,
      'total_attendance': 17,
      'pregnant_mothers': 18,
      'age_under_3': 19,
      'age_13_19': 20,
      'inward_patients': 21
    };

    // Set values for each parameter
    Object.entries(paramToRow).forEach(([param, rowIndex]) => {
      const colIndex = day + 1; // +1 because first column is parameter names
      const value = data[param as keyof typeof data] || 0;
      worksheet.getCell(rowIndex, colIndex).value = value;
    });
  },

  // Recalculate totals across all users
  async recalculateTotals(totalsSheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook, users: UserProfile[]): Promise<void> {
    // Clear existing data (except headers)
    for (let row = 4; row <= 21; row++) {
      for (let col = 2; col <= 33; col++) { // Max 31 days + total column
        totalsSheet.getCell(row, col).value = null;
      }
    }

    // Get number of days from worksheet
    let daysInMonth = 0;
    const headerRow = totalsSheet.getRow(3);
    for (let col = 2; col <= 33; col++) {
      const value = headerRow.getCell(col).value;
      if (typeof value === 'number') {
        daysInMonth = Math.max(daysInMonth, value);
      }
    }

    if (daysInMonth === 0) daysInMonth = 31; // Default if not found
    
    // Initialize daily totals matrix [parameter][day]
    const dailyTotals: number[][] = Array(22).fill(0).map(() => Array(daysInMonth + 1).fill(0));
    
    // Process all user worksheets except the Total sheet
    workbook.worksheets.forEach(sheet => {
      if (sheet.name !== 'Total') { // Skip the totals sheet
        console.log(`Processing sheet: ${sheet.name}`);
        
        // For each parameter row (4 to 21)
        for (let paramRow = 4; paramRow <= 21; paramRow++) {
          // For each day (1 to daysInMonth)
          for (let day = 1; day <= daysInMonth; day++) {
            const colIndex = day + 1; // +1 because first column is parameter names
            const cellValue = sheet.getCell(paramRow, colIndex).value;
            
            // Add to dailyTotals if it's a number
            if (typeof cellValue === 'number') {
              dailyTotals[paramRow][day] += cellValue;
            }
          }
        }
      }
    });
    
    // Write totals to the totals sheet
    for (let paramRow = 4; paramRow <= 21; paramRow++) {
      for (let day = 1; day <= daysInMonth; day++) {
        const colIndex = day + 1;
        totalsSheet.getCell(paramRow, colIndex).value = dailyTotals[paramRow][day];
      }
    }

    // Update row totals
    for (let paramRow = 4; paramRow <= 21; paramRow++) {
      totalsSheet.getCell(paramRow, daysInMonth + 2).value = { 
        formula: `SUM(B${paramRow}:${this.getColumnName(daysInMonth + 1)}${paramRow})`,
        date1904: false
      };
    }
  },

  // Helper: Convert column number to Excel column letter (1=A, 2=B, etc.)
  getColumnName(columnNumber: number): string {
    let dividend = columnNumber;
    let columnName = '';
    let modulo;

    while (dividend > 0) {
      modulo = (dividend - 1) % 26;
      columnName = String.fromCharCode(65 + modulo) + columnName;
      dividend = Math.floor((dividend - modulo) / 26);
    }

    return columnName;
  },

  // Download Excel file for a specific month
  async downloadMonthlyExcel(year: number, month: number): Promise<void> {
    try {
      const monthStr = String(month).padStart(2, '0');
      const fileName = `dental_statistics_${year}-${monthStr}.xlsx`;

      // First, check if the bucket exists
      const { error: bucketError } = await supabase
        .storage
        .getBucket('excel-reports');

      if (bucketError) {
        console.error('Storage bucket does not exist:', bucketError);
        throw new Error('No excel sheet exists for the month selected. Storage not configured correctly.');
      }

      // Then attempt to download the file
      const { data, error } = await supabase
        .storage
        .from('excel-reports')
        .download(`monthly/${fileName}`);

      // Handle specific error cases
      if (error) {
        console.error('Download error details:', error);
        
        // For 400 Bad Request errors, likely the file doesn't exist
        if (error.message && error.message.includes('400')) {
          throw new Error(`No excel sheet exists for the month selected.`);
        }
        
        // For any other errors
        throw new Error(`Unable to download file: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error(`No excel sheet exists for the month selected.`);
      }

      saveAs(new Blob([data], { type: 'application/octet-stream' }), fileName);
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      throw error;
    }
  }
};
