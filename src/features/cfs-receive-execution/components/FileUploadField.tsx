import React from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import type { AttachmentPlaceholder } from '@/shared/features/plan/types';

interface FileUploadFieldProps {
  label: string;
  accept?: string;
  files: AttachmentPlaceholder[];
  onChange: (files: AttachmentPlaceholder[]) => void;
}

const buildAttachmentPlaceholders = (
  fileList: FileList | null,
): AttachmentPlaceholder[] => {
  if (!fileList || fileList.length === 0) return [];
  return Array.from(fileList).map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
  }));
};

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  accept,
  files,
  onChange,
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(buildAttachmentPlaceholders(event.target.files));
  };

  const handleRemove = (fileId: string) => {
    onChange(files.filter((file) => file.id !== fileId));
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
        <UploadCloud className="h-4 w-4 text-gray-500 dark:text-gray-300" />
        {label}
      </label>
      <input
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-blue-400 dark:focus:ring-blue-400/40"
      />
      {files.length > 0 ? (
        <ul className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                {file.name}
              </span>
              <button
                type="button"
                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                onClick={() => handleRemove(file.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
