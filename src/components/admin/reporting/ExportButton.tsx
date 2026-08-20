import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';

interface ExportButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  filename: string;
  label?: string;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  label = 'Export CSV',
  disabled = false,
}) => {
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str}"`
              : str;
          })
          .join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || !data.length}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
        exported
          ? 'bg-green-50 text-green-700 border-green-300'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {exported ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Exported!
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5" />
          {label}
        </>
      )}
    </button>
  );
};

export default ExportButton;
