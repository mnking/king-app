import { useState } from 'react';
import DocumentServiceWorkspace from '../components/DocumentServiceWorkspace';

const DEFAULT_OWNER_ID = '4531c632-0f60-4a99-adc7-b033eb7a545f';

const DocumentServiceDemoPage = () => {
  const [ownerId, setOwnerId] = useState(DEFAULT_OWNER_ID);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {/* TODO(i18n): Localize demo page title. */}
          Document Service Demo
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          {/* TODO(i18n): Localize demo page description. */}
          Use this page to exercise the shared document upload, listing, and download
          experience without impacting production routes. Adjust the owner identifier to
          emulate different contexts (shipments, containers, etc.).
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label htmlFor="owner-id-input" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          {/* TODO(i18n): Localize owner ID label. */}
          Owner identifier
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {/* TODO(i18n): Localize owner ID helper text. */}
          The document list and upload operations scope to this owner ID. Replace with a
          valid value from your environment to test against real data.
        </p>
        <input
          id="owner-id-input"
          type="text"
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="Enter owner ID"
        />
      </section>

      <DocumentServiceWorkspace ownerId={ownerId} />
    </div>
  );
};

export default DocumentServiceDemoPage;
