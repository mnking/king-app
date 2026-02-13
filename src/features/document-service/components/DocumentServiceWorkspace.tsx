import { useState } from 'react';
import DocumentUploader from './DocumentUploader';
import DocumentList from './DocumentList';

interface DocumentServiceWorkspaceProps {
  ownerId: string;
}

/**
 * Lightweight wrapper combining uploader + list for host screens.
 */
export const DocumentServiceWorkspace: React.FC<DocumentServiceWorkspaceProps> = ({
  ownerId,
}) => {
  const [search, setSearch] = useState('');

  return (
    <div className="flex flex-col gap-6">
      <DocumentUploader ownerId={ownerId || undefined} />
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="document-search" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            {/* TODO(i18n): Localize search label. */}
            Filter documents
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {/* TODO(i18n): Localize search helper text. */}
            Use search to filter by name once backend supports it.
          </p>
        </div>
        <input
          id="document-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search documents"
          className="w-64 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <DocumentList ownerId={ownerId} search={search || undefined} />
    </div>
  );
};

export default DocumentServiceWorkspace;
