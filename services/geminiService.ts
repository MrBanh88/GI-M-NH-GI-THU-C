import { GoogleGenAI } from "@google/genai";
import { AnalysisMode } from "../types";

export const generateAnalysisSQL = async (mode: AnalysisMode = 'ALERT', customInstruction?: string): Promise<string> => {
  // Support both process.env (Standard Node/Cloud) and import.meta.env (Vite/Localhost)
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please set VITE_API_KEY in .env file (Local) or API_KEY (Cloud).");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  let logicPrompt = "";
  let targetSQL = "";

  if (mode === 'ALERT') {
    logicPrompt = `
    LOGIC: Find Price Discrepancies (Overpriced drugs).
    1. Define CTE 'THUOC_CO_NHOM' selecting distinct records.
    2. Define CTE 'NHOM_CO_NHIEU_GIA' finding MIN(gia) GROUP BY [TEN_HOAT_CHAT, SO_DANG_KY, HAM_LUONG, MADUONGDUNG, NHOM_TCKT, DON_VI_TINH] HAVING COUNT(DISTINCT gia) > 1.
    3. JOIN and Filter WHERE t.gia > n.GIA_THAP_NHAT.
    `;
    targetSQL = `
    WITH THUOC_CO_NHOM AS (SELECT DISTINCT * FROM THAU_TINH),
    NHOM_CO_NHIEU_GIA AS (
        SELECT TEN_HOAT_CHAT, SO_DANG_KY, HAM_LUONG, MADUONGDUNG, NHOM_TCKT, DON_VI_TINH, MIN(gia) AS GIA_THAP_NHAT
        FROM THUOC_CO_NHOM
        GROUP BY TEN_HOAT_CHAT, SO_DANG_KY, HAM_LUONG, MADUONGDUNG, NHOM_TCKT, DON_VI_TINH
        HAVING COUNT(DISTINCT gia) > 1
    )
    SELECT t.*, n.GIA_THAP_NHAT, (t.gia - n.GIA_THAP_NHAT) AS CHENH_GIA, (t.gia - n.GIA_THAP_NHAT) * t.soluong AS TIEN_CHENH_LECH
    FROM THUOC_CO_NHOM t JOIN NHOM_CO_NHIEU_GIA n ON t.TEN_HOAT_CHAT = n.TEN_HOAT_CHAT ...
    `;
  } else {
    // COMPARE MODE
    // AlaSQL specific: GROUP_CONCAT does not support separator argument. We must use default comma.
    // Also use '+' for string concatenation to be safe in JS-based SQL.
    logicPrompt = `
    LOGIC: Cross-Facility Comparison (Matrix View).
    1. Group drugs by Identity (TEN_HOAT_CHAT, HAM_LUONG, SO_DANG_KY, NHOM_TCKT).
    2. Only select drugs present in MORE THAN 1 Facility (COUNT DISTINCT CO_SO_KCB > 1).
    3. Calculate MIN(GIA), MAX(GIA).
    4. Create a summary column 'CHI_TIET_GIA' that concatenates 'CO_SO_KCB', a separator like ':', and 'GIA'. 
       IMPORTANT: Use 'GROUP_CONCAT(CO_SO_KCB + '': '' + GIA)' syntax. DO NOT add a second argument to GROUP_CONCAT.
    `;
    targetSQL = `
    SELECT 
        TEN_HOAT_CHAT, HAM_LUONG, SO_DANG_KY, NHOM_TCKT,
        COUNT(DISTINCT CO_SO_KCB) AS SO_LUONG_CS,
        MIN(GIA) AS GIA_MIN,
        MAX(GIA) AS GIA_MAX,
        GROUP_CONCAT(CO_SO_KCB + ': ' + GIA) AS CHI_TIET_GIA
    FROM THAU_TINH
    GROUP BY TEN_HOAT_CHAT, HAM_LUONG, SO_DANG_KY, NHOM_TCKT
    HAVING COUNT(DISTINCT CO_SO_KCB) > 1
    ORDER BY TEN_HOAT_CHAT
    `;
  }

  const systemPrompt = `
    You are an expert Data Engineer specializing in Health Insurance (BHYT) drug price analysis using SQLite/AlaSQL.
    
    DATA STRUCTURE:
    - Table: 'THAU_TINH'
    - Columns: TEN_HOAT_CHAT, SO_DANG_KY, HAM_LUONG, MADUONGDUNG, NHOM_TCKT, DON_VI_TINH, GIA, SOLUONG, CO_SO_KCB, MA_CSKCB, HANG_SAN_XUAT.

    ${logicPrompt}

    OUTPUT FORMAT:
    Return ONLY the raw SQL string. Do not use markdown blocks.
    
    Example Target Pattern:
    ${targetSQL}
  `;

  const userPrompt = customInstruction || `Generate SQL for ${mode} mode.`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${systemPrompt}\n\nUser Request: ${userPrompt}`,
    });

    let sql = response.text.trim();
    // Robust cleaning of markdown code blocks
    if (sql.startsWith('```')) {
        sql = sql.replace(/^```(?:sql)?/i, '').replace(/```$/, '').trim();
    }
    
    return sql;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};