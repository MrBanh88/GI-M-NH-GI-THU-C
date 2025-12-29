import React from 'react';

interface DataTableProps {
  data: any[];
  columns: { key: string; label: string; format?: (val: any, row: any, index: number) => React.ReactNode; width?: string }[];
  title?: string;
  maxHeight?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, columns, title, maxHeight = "max-h-96" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-white">
        <p className="text-gray-500">Chưa có dữ liệu để hiển thị.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">{title}</h3>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{data.length} bản ghi</span>
        </div>
      )}
      <div className={`overflow-auto custom-scrollbar ${maxHeight}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.width || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                {columns.map((col) => (
                  <td key={`${idx}-${col.key}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {col.format ? col.format(row[col.key], row, idx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};