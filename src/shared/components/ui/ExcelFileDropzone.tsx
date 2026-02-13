import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, XCircle, FileSpreadsheet } from 'lucide-react';

interface ExcelFileDropzoneProps {
  onFileSelect: (file: File) => void;
  allowedExtensions: string[];
  maxFileSizeMb: number;
  selectedFile?: File | null;
  onClear?: () => void;
  templateUrl?: string;
  templateFileName?: string;
}

export function ExcelFileDropzone(props: ExcelFileDropzoneProps) {
  const {
    onFileSelect,
    allowedExtensions,
    maxFileSizeMb,
    selectedFile,
    onClear,
    templateUrl,
    templateFileName,
  } = props;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      e.target.value = '';
    },
    [onFileSelect],
  );

  const handleClear = useCallback(() => {
    onClear?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onClear]);

  return (
    <div className="w-full">
      <div
        className={[
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center',
          isDragActive
            ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/20'
            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => {
          setIsDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFileSelect(file);
        }}
      >
        <UploadCloud className="mb-2 h-8 w-8 text-slate-500" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Drop file here</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {allowedExtensions.join(', ')} • Max {maxFileSizeMb}MB
        </p>

        <label className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedExtensions.join(',')}
            className="hidden"
            aria-label="Select Excel file"
            onChange={handleChange}
            onClick={(e) => {
              (e.currentTarget as HTMLInputElement).value = '';
            }}
          />
          <FileSpreadsheet className="h-4 w-4" />
          Select file
        </label>

        {templateUrl && (
          <a
            href={templateUrl}
            download={templateFileName}
            className="mt-3 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            Download template
          </a>
        )}
      </div>

      {selectedFile && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            <span>{selectedFile.name}</span>
          </div>

          {onClear && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ExcelFileDropzone;
