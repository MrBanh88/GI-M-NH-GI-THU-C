import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { DrugBidRecord } from '../types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DrugBidRecord;
  onSave: (updatedRecord: DrugBidRecord) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, record, onSave }) => {
  const [formData, setFormData] = useState<DrugBidRecord>({ ...record });

  useEffect(() => {
    setFormData({ ...record });
  }, [record]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'GIA' || name === 'SOLUONG') ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 bg-blue-800 text-white flex justify-between items-center">
          <h3 className="text-lg font-bold">Sửa thông tin thuốc</h3>
          <button onClick={onClose} className="text-blue-200 hover:text-white">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên hoạt chất</label>
              <input
                type="text"
                name="TEN_HOAT_CHAT"
                value={formData.TEN_HOAT_CHAT || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hàm lượng</label>
              <input
                type="text"
                name="HAM_LUONG"
                value={formData.HAM_LUONG || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số đăng ký</label>
              <input
                type="text"
                name="SO_DANG_KY"
                value={formData.SO_DANG_KY || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá (VNĐ)</label>
              <input
                type="number"
                name="GIA"
                value={formData.GIA || 0}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-yellow-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
              <input
                type="number"
                name="SOLUONG"
                value={formData.SOLUONG || 0}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-yellow-50"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cơ sở KCB</label>
              <input
                type="text"
                name="CO_SO_KCB"
                value={formData.CO_SO_KCB || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
             <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hãng sản xuất</label>
              <input
                type="text"
                name="HANG_SAN_XUAT"
                value={formData.HANG_SAN_XUAT || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit">Lưu thay đổi</Button>
          </div>
        </form>
      </div>
    </div>
  );
};