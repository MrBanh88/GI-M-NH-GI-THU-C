// Global declarations for external libraries loaded via CDN
declare global {
  interface Window {
    alasql: any;
    XLSX: any;
  }
}

export interface DrugBidRecord {
  _fileId?: string; // ID of the uploaded file this record belongs to
  MA_THUOC?: string;
  TEN_HOAT_CHAT: string;
  SO_DANG_KY: string;
  HAM_LUONG: string;
  MADUONGDUNG: string;
  NHOM_TCKT: string;
  DON_VI_TINH: string;
  HANG_SAN_XUAT: string;
  NUOC_SAN_XUAT?: string;
  GIA: number;
  SOLUONG: number;
  CO_SO_KCB: string; // Tên cơ sở
  MA_CSKCB?: string; // Mã cơ sở (nếu có)
  [key: string]: any; // Allow other flexible columns from Excel
}

export interface UploadedFileMeta {
  id: string;
  name: string;
  uploadDate: string;
  rowCount: number;
  size: string;
}

export interface AnalysisResult {
  // Common fields
  TEN_HOAT_CHAT: string;
  HAM_LUONG: string;
  SO_DANG_KY: string;
  
  // Alert Mode fields
  NHOM_TCKT?: string;
  MADUONGDUNG?: string;
  DON_VI_TINH?: string;
  HANG_SAN_XUAT?: string;
  CO_SO_KCB?: string;
  GIA?: number;            
  GIA_THAP_NHAT?: number;
  CHENH_GIA?: number;      
  SOLUONG?: number;        
  TIEN_CHENH_LECH?: number;

  // Comparison Mode fields
  SO_LUONG_CS?: number;
  GIA_MIN?: number;
  GIA_MAX?: number;
  CHI_TIET_GIA?: string; // String aggregated list of prices

  [key: string]: any;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING_AI = 'LOADING_AI',
  EXECUTING_SQL = 'EXECUTING_SQL',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type AnalysisMode = 'ALERT' | 'COMPARE';