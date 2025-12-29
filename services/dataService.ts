import { DrugBidRecord, AnalysisResult } from '../types';

export const parseExcelFile = (file: File): Promise<DrugBidRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = window.XLSX.utils.sheet_to_json(sheet);
        
        // Normalize keys to upper case for consistency with SQL logic
        const normalizedData = jsonData.map((row: any) => {
            const newRow: any = {};
            Object.keys(row).forEach(key => {
                newRow[key.toUpperCase().trim()] = row[key];
            });
            // Ensure numbers
            if(newRow['GIA']) newRow['GIA'] = Number(newRow['GIA']);
            if(newRow['SOLUONG']) newRow['SOLUONG'] = Number(newRow['SOLUONG']);
            return newRow;
        });

        resolve(normalizedData as DrugBidRecord[]);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const generateMockData = (): DrugBidRecord[] => {
  const manufacturers = ["PharmaCorp A", "MediLife B", "BioTech C", "GlobalHealth D"];
  const facilities = ["BV Đa Khoa Tỉnh A", "BV Huyện B", "TT Y Tế C", "BV TW D"];
  const drugs = [
    { name: "Paracetamol", conc: "500mg", reg: "VD-12345-21", route: "Uống", group: "Nhóm 1" },
    { name: "Cefuroxim", conc: "500mg", reg: "VD-67890-22", route: "Uống", group: "Nhóm 2" },
    { name: "Atorvastatin", conc: "10mg", reg: "VN-11223-23", route: "Uống", group: "Nhóm 1" },
    { name: "Metformin", conc: "850mg", reg: "VD-33445-21", route: "Uống", group: "Nhóm 3" },
  ];

  const data: DrugBidRecord[] = [];

  // Generate base prices
  drugs.forEach(drug => {
      manufacturers.forEach(mfg => {
        const basePrice = Math.floor(Math.random() * 5000) + 1000;
        
        // Distribute to facilities with slight price variations (simulating bid differences)
        facilities.forEach(facility => {
             const variance = Math.floor(Math.random() * 500) - 200; // -200 to +300
             data.push({
                 TEN_HOAT_CHAT: drug.name,
                 HAM_LUONG: drug.conc,
                 SO_DANG_KY: drug.reg,
                 MADUONGDUNG: drug.route,
                 NHOM_TCKT: drug.group,
                 DON_VI_TINH: "Viên",
                 HANG_SAN_XUAT: mfg,
                 GIA: basePrice + variance,
                 SOLUONG: Math.floor(Math.random() * 10000) + 1000,
                 CO_SO_KCB: facility,
                 NUOC_SAN_XUAT: "Việt Nam"
             });
        });
      });
  });

  return data;
};

export const executeSQL = (sql: string, data: DrugBidRecord[]): AnalysisResult[] => {
    // 1. Create table in AlaSQL memory
    window.alasql('CREATE TABLE IF NOT EXISTS THAU_TINH');
    window.alasql('DELETE FROM THAU_TINH'); // Clear old data
    
    // 2. Insert data
    window.alasql('SELECT * INTO THAU_TINH FROM ?', [data]);

    // 3. Execute the analysis query
    // Note: AlaSQL might return an array of objects
    try {
        const res = window.alasql(sql);
        return res as AnalysisResult[];
    } catch (e) {
        console.error("SQL Execution Error:", e);
        throw e;
    }
};

export const exportToExcel = (data: any[], fileName: string) => {
    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Report");
    window.XLSX.writeFile(wb, `${fileName}.xlsx`);
}
