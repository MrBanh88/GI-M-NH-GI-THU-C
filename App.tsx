import React, { useState, useEffect } from 'react';
import { Upload, Database, FileText, AlertTriangle, Download, Play, Search, ShieldCheck, BookOpen, ExternalLink, Trash2, FileSpreadsheet, Layers, BarChart3, AlertCircle, Edit2, X } from 'lucide-react';
import { Button } from './components/Button';
import { DataTable } from './components/DataTable';
import { EditModal } from './components/EditModal';
import { parseExcelFile, generateMockData, executeSQL, exportToExcel } from './services/dataService';
import { generateAnalysisSQL } from './services/geminiService';
import { DrugBidRecord, AnalysisResult, AnalysisStatus, UploadedFileMeta, AnalysisMode } from './types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const formatNumber = (val: number) => 
  new Intl.NumberFormat('vi-VN').format(val);

export default function App() {
  const [data, setData] = useState<DrugBidRecord[]>([]);
  const [fileHistory, setFileHistory] = useState<UploadedFileMeta[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [generatedSQL, setGeneratedSQL] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'input' | 'analysis' | 'guide'>('input');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('ALERT');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<DrugBidRecord | null>(null);

  useEffect(() => {
    if (!window.alasql) {
      setErrorMsg("Lỗi: Không tải được thư viện SQL engine. Vui lòng kiểm tra kết nối mạng.");
    }
  }, []);

  // Calculate Data Stats
  const dataStats = React.useMemo(() => {
    const uniqueDrugs = new Set(data.map(d => d.TEN_HOAT_CHAT + d.HAM_LUONG)).size;
    const uniqueFacilities = new Set(data.map(d => d.CO_SO_KCB)).size;
    const totalValue = data.reduce((sum, item) => sum + (item.GIA * item.SOLUONG), 0);
    return { uniqueDrugs, uniqueFacilities, totalValue };
  }, [data]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const fileId = Date.now().toString();
        const rawRecords = await parseExcelFile(file);
        
        // Tag records with fileId
        const newRecords = rawRecords.map(r => ({ ...r, _fileId: fileId }));
        
        setData(prev => [...prev, ...newRecords]);
        
        const newFileMeta: UploadedFileMeta = {
            id: fileId,
            name: file.name,
            uploadDate: new Date().toLocaleTimeString(),
            rowCount: newRecords.length,
            size: (file.size / 1024).toFixed(1) + ' KB'
        };
        setFileHistory(prev => [...prev, newFileMeta]);

        setResults([]);
        setGeneratedSQL("");
        setErrorMsg(null);
        if(activeTab === 'guide') setActiveTab('input');
        
        e.target.value = '';
      } catch (err) {
        setErrorMsg("Lỗi đọc file Excel. Vui lòng kiểm tra định dạng.");
        console.error(err);
      }
    }
  };

  const handleRemoveFile = (fileId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa file này và toàn bộ dữ liệu đi kèm?")) {
        setData(prev => prev.filter(r => r._fileId !== fileId));
        setFileHistory(prev => prev.filter(f => f.id !== fileId));
        setResults([]); // Clear results as data changed
    }
  };

  const handleMockData = () => {
    const fileId = "mock_" + Date.now();
    const mock = generateMockData().map(r => ({...r, _fileId: fileId}));
    
    // Fix: Append data instead of overwriting it
    setData(prev => [...prev, ...mock]);
    
    setFileHistory(prev => [...prev, {
        id: fileId,
        name: "Mock_Data_Demo.xlsx",
        uploadDate: new Date().toLocaleTimeString(),
        rowCount: mock.length,
        size: "N/A"
    }]);
    setResults([]);
    setGeneratedSQL("");
    setErrorMsg(null);
    if(activeTab === 'guide') setActiveTab('input');
  };

  const clearAllData = () => {
      if(window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu đang làm việc không?")) {
          setData([]);
          setFileHistory([]);
          setResults([]);
          setGeneratedSQL("");
      }
  }

  // Row Actions
  const handleDeleteRow = (index: number) => {
    if(window.confirm("Xóa dòng dữ liệu này?")) {
      const newData = [...data];
      newData.splice(index, 1);
      setData(newData);
      setResults([]); // Clear results as data changed
    }
  };

  const handleEditRow = (index: number, record: DrugBidRecord) => {
    setEditingIndex(index);
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedRecord: DrugBidRecord) => {
    if (editingIndex !== null) {
      const newData = [...data];
      newData[editingIndex] = updatedRecord;
      setData(newData);
      setIsEditModalOpen(false);
      setEditingIndex(null);
      setEditingRecord(null);
      setResults([]); // Clear results
    }
  };

  const runAnalysis = async () => {
    if (data.length === 0) {
      setErrorMsg("Vui lòng nhập dữ liệu trước khi phân tích.");
      return;
    }

    setStatus(AnalysisStatus.LOADING_AI);
    setErrorMsg(null);
    setResults([]);

    try {
      const sql = await generateAnalysisSQL(analysisMode);
      setGeneratedSQL(sql);

      setStatus(AnalysisStatus.EXECUTING_SQL);
      await new Promise(r => setTimeout(r, 800)); 

      const analysisResults = executeSQL(sql, data);
      setResults(analysisResults);
      setStatus(AnalysisStatus.COMPLETED);
      setActiveTab('analysis');

    } catch (err: any) {
      console.error(err);
      setStatus(AnalysisStatus.ERROR);
      setErrorMsg(err.message || "Có lỗi xảy ra trong quá trình phân tích.");
    }
  };

  const exportReport = () => {
    if (results.length > 0) {
      exportToExcel(results, `Bao_cao_${analysisMode}_${new Date().toISOString().slice(0,10)}`);
    }
  };

  const openBHXHSite = () => {
    window.open('https://baohiemxahoi.gov.vn/tracuu/Pages/ket-qua-trung-thau-duoc-lieu-vat-tu-y-te.aspx', '_blank');
  };

  // Define Columns based on Mode
  const getColumns = () => {
    if (analysisMode === 'ALERT') {
      return [
        { key: 'TEN_HOAT_CHAT', label: 'Tên thuốc' },
        { key: 'HAM_LUONG', label: 'Hàm lượng' },
        { key: 'CO_SO_KCB', label: 'Cơ sở KCB (Giá cao)' },
        { key: 'GIA', label: 'Giá tại CS', format: formatCurrency },
        { key: 'GIA_THAP_NHAT', label: 'Giá Min', format: formatCurrency },
        { key: 'CHENH_GIA', label: 'Chênh Lệch', format: (val:any) => <span className="text-red-600 font-bold">{formatCurrency(val)}</span> },
        { key: 'SOLUONG', label: 'SL Mua' },
        { key: 'TIEN_CHENH_LECH', label: 'Tổng Tiền CL', format: (val:any) => <span className="text-red-600 font-bold">{formatCurrency(val)}</span> },
      ];
    } else {
      // COMPARE MODE
      return [
        { key: 'TEN_HOAT_CHAT', label: 'Tên thuốc' },
        { key: 'HAM_LUONG', label: 'Hàm lượng' },
        { key: 'SO_DANG_KY', label: 'SĐK' },
        { key: 'SO_LUONG_CS', label: 'Số CSKB' },
        { key: 'GIA_MIN', label: 'Giá Thấp Nhất', format: (val:any) => <span className="text-green-600 font-medium">{formatCurrency(val)}</span> },
        { key: 'GIA_MAX', label: 'Giá Cao Nhất', format: (val:any) => <span className="text-red-600 font-medium">{formatCurrency(val)}</span> },
        { key: 'CHI_TIET_GIA', label: 'Chi Tiết Giá Các Cơ Sở', format: (val:any) => (
            <div className="text-xs whitespace-pre-wrap leading-relaxed max-w-lg">
                {String(val).split(',').map((v, i) => <div key={i} className="border-b border-gray-100 last:border-0 py-1">{v.trim()}</div>)}
            </div>
        ) },
      ];
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('input')}>
            <ShieldCheck className="h-8 w-8 text-blue-300" />
            <div>
              <h1 className="text-xl font-bold leading-none">BHYT Price Watch</h1>
              <p className="text-xs text-blue-200 mt-1">Hệ thống Giám định Giá thuốc Thông minh</p>
            </div>
          </div>
          <div className="flex space-x-2 sm:space-x-4">
             <button 
               onClick={() => setActiveTab('guide')}
               className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'guide' ? 'bg-blue-900 text-white shadow-inner' : 'text-blue-100 hover:bg-blue-700'}`}
             >
               <BookOpen className="w-4 h-4 mr-2" />
               Hướng dẫn
             </button>
             <button 
               onClick={() => setActiveTab('input')}
               className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'input' ? 'bg-blue-900 text-white shadow-inner' : 'text-blue-100 hover:bg-blue-700'}`}
             >
               Quản lý Dữ liệu
             </button>
             <button 
               onClick={() => setActiveTab('analysis')}
               className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'bg-blue-900 text-white shadow-inner' : 'text-blue-100 hover:bg-blue-700'}`}
             >
               Kết quả
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {errorMsg && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-start animate-pulse">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Thông báo lỗi</h3>
                <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               {/* Keep existing guide content but update step 3 text */}
               <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900">Quy trình Giám định tự động</h2>
                <p className="mt-2 text-gray-600">Thực hiện so sánh giá thuốc trúng thầu chỉ trong 4 bước đơn giản.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center mb-4"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-4">1</div><h3 className="font-semibold">Lấy dữ liệu</h3></div>
                    <Button variant="outline" onClick={openBHXHSite} icon={<ExternalLink className="h-4 w-4"/>} className="w-full">Mở trang BHXH</Button>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center mb-4"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-4">2</div><h3 className="font-semibold">Nhập liệu</h3></div>
                    <p className="text-sm text-gray-500">Dùng chức năng "Quản lý dữ liệu" để tải lên nhiều file.</p>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center mb-4"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-4">3</div><h3 className="font-semibold">Chọn Chế độ Phân tích</h3></div>
                    <p className="text-sm text-gray-500">
                        Chọn <strong>"Cảnh báo giá"</strong> để tìm thuốc đắt hơn giá Min.<br/>
                        Chọn <strong>"So sánh Cơ sở"</strong> để xem giá cùng một loại thuốc tại các BV khác nhau.
                    </p>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center mb-4"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-4">4</div><h3 className="font-semibold">Xuất báo cáo</h3></div>
                    <p className="text-sm text-gray-500">Xuất Excel bảng chênh lệch chi tiết.</p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'input' && (
            <div className="space-y-6">
              
              {/* Dashboard Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-white p-4 rounded-lg shadow border border-blue-100 flex items-center">
                    <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
                        <Layers className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tổng số dòng dữ liệu</p>
                        <p className="text-2xl font-bold text-gray-900">{formatNumber(data.length)}</p>
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-lg shadow border border-green-100 flex items-center">
                    <div className="p-3 rounded-full bg-green-50 text-green-600 mr-4">
                        <Database className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Số loại thuốc (Hoạt chất)</p>
                        <p className="text-2xl font-bold text-gray-900">{formatNumber(dataStats.uniqueDrugs)}</p>
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-lg shadow border border-purple-100 flex items-center">
                    <div className="p-3 rounded-full bg-purple-50 text-purple-600 mr-4">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Số cơ sở KCB</p>
                        <p className="text-2xl font-bold text-gray-900">{formatNumber(dataStats.uniqueFacilities)}</p>
                    </div>
                 </div>
              </div>

              {/* Data Management Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Upload & Actions */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200 h-full">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <Upload className="h-5 w-5 mr-2 text-blue-600"/>
                            Thêm dữ liệu mới
                        </h2>
                        <div className="space-y-4">
                             <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                                <span className="mt-2 block text-sm font-medium text-gray-900">
                                   Chọn file Excel (.xlsx)
                                </span>
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                             </div>
                             
                             <div className="flex flex-col gap-2">
                                <Button variant="outline" onClick={handleMockData} icon={<Database className="h-4 w-4"/>}>
                                    Nạp dữ liệu mẫu
                                </Button>
                                <Button variant="secondary" onClick={openBHXHSite} icon={<ExternalLink className="h-4 w-4"/>}>
                                    Tải từ BHXH VN
                                </Button>
                             </div>

                             <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Thao tác</h3>
                                <div className="flex gap-2">
                                    <Button 
                                        className="w-full"
                                        onClick={() => { setActiveTab('analysis'); }} 
                                        disabled={data.length === 0}
                                        icon={<Play className="h-4 w-4"/>}
                                    >
                                        Đến Phân tích
                                    </Button>
                                    <Button 
                                        variant="danger"
                                        onClick={clearAllData}
                                        disabled={data.length === 0}
                                        icon={<Trash2 className="h-4 w-4"/>}
                                    >
                                        Xóa Tất Cả
                                    </Button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Right: File History & Preview */}
                <div className="lg:col-span-2 space-y-6">
                    {/* File History */}
                    {fileHistory.length > 0 && (
                        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-sm font-medium text-gray-700">Lịch sử file đã tải lên</h3>
                            </div>
                            <ul className="divide-y divide-gray-200 max-h-40 overflow-auto custom-scrollbar">
                                {fileHistory.map((file) => (
                                    <li key={file.id} className="px-4 py-3 flex items-center justify-between text-sm group hover:bg-gray-50">
                                        <div className="flex items-center">
                                            <FileText className="h-4 w-4 text-green-500 mr-2" />
                                            <span className="font-medium text-gray-900">{file.name}</span>
                                            <span className="ml-2 text-gray-500 text-xs">({file.size})</span>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-gray-500 text-xs flex items-center">
                                                <span className="mr-3">{file.rowCount} dòng</span>
                                                <span>{file.uploadDate}</span>
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRemoveFile(file.id);
                                                }}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                title="Xóa file và dữ liệu liên quan"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Data Table */}
                    <DataTable 
                        title="Dữ liệu chi tiết (Bảng THAU_TINH)" 
                        data={data}
                        maxHeight="max-h-[500px]"
                        columns={[
                        { key: '_actions', label: 'Thao tác', width: 'w-20', format: (_: any, row: DrugBidRecord, index: number) => (
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => handleEditRow(index, row)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="Sửa dòng này"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteRow(index)}
                                    className="text-red-400 hover:text-red-600 p-1"
                                    title="Xóa dòng này"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )},
                        { key: 'TEN_HOAT_CHAT', label: 'Tên Hoạt Chất' },
                        { key: 'HAM_LUONG', label: 'Hàm Lượng' },
                        { key: 'SO_DANG_KY', label: 'SĐK' },
                        { key: 'NHOM_TCKT', label: 'Nhóm TCKT' },
                        { key: 'GIA', label: 'Giá', format: formatCurrency },
                        { key: 'SOLUONG', label: 'Số Lượng', format: formatNumber },
                        { key: 'CO_SO_KCB', label: 'Cơ Sở KCB' },
                        ]}
                    />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              
              {/* Analysis Mode Selector */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                      <h2 className="text-lg font-bold text-gray-900">Cấu hình Phân tích</h2>
                      <p className="text-sm text-gray-500">Chọn chế độ và chạy phân tích AI.</p>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setAnalysisMode('ALERT')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${analysisMode === 'ALERT' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                      >
                         <div className="flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> Cảnh báo Giá cao</div>
                      </button>
                      <button 
                        onClick={() => setAnalysisMode('COMPARE')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${analysisMode === 'COMPARE' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                      >
                        <div className="flex items-center"><BarChart3 className="w-4 h-4 mr-2"/> So sánh Cơ sở</div>
                      </button>
                  </div>
                  <Button 
                    onClick={runAnalysis} 
                    disabled={data.length === 0}
                    isLoading={status === AnalysisStatus.LOADING_AI || status === AnalysisStatus.EXECUTING_SQL}
                    icon={<Play className="h-4 w-4"/>}
                  >
                    Chạy Phân tích Ngay
                  </Button>
              </div>

              {/* AI Insight Card */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 rounded-lg p-6 shadow-sm">
                 <div className="flex items-start space-x-4">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                       <Search className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                       <h3 className="text-base font-semibold text-indigo-900">
                           {analysisMode === 'ALERT' ? 'Logic: Tìm chênh lệch giá (Min Price Baseline)' : 'Logic: So sánh chéo giữa các Cơ sở (Cross-Facility)'}
                       </h3>
                       <p className="text-sm text-indigo-700 mt-1 mb-3">
                         {analysisMode === 'ALERT' 
                            ? 'Hệ thống sử dụng kỹ thuật CTE để tìm giá Min theo nhóm thuốc, sau đó lọc các cơ sở có giá cao hơn.'
                            : 'Hệ thống gom nhóm thuốc và liệt kê giá chi tiết tại từng cơ sở KCB để so sánh trực quan.'}
                       </p>
                       {generatedSQL ? (
                         <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
                           <code className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                             {generatedSQL}
                           </code>
                         </div>
                       ) : (
                         <div className="text-sm text-gray-500 italic">Chưa có lệnh SQL được sinh ra. Vui lòng nhấn nút "Chạy Phân tích".</div>
                       )}
                    </div>
                 </div>
              </div>

              {/* Results */}
              <div className="flex justify-between items-center">
                 <h2 className="text-lg font-bold text-gray-800 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600"/>
                    Kết quả Phân tích
                 </h2>
                 <Button 
                   onClick={exportReport} 
                   variant="outline"
                   disabled={results.length === 0} 
                   icon={<Download className="h-4 w-4"/>}
                 >
                   Xuất Excel
                 </Button>
              </div>

              <DataTable 
                title={analysisMode === 'ALERT' ? "Chi tiết chênh lệch giá" : "Ma trận giá giữa các cơ sở"} 
                data={results}
                columns={getColumns()}
              />
            </div>
          )}

        </div>

        {/* Modals */}
        {editingRecord && (
          <EditModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)}
            record={editingRecord}
            onSave={handleSaveEdit}
          />
        )}
      </main>
    </div>
  );
}