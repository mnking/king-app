# Document Service Frontend Module

This feature slice contains the shared document upload, listing, and download experience described in `openspec/changes/implement-document-service-upload-download`.

## Components
- `DocumentUploader` – handles file selection, validation, upload progress, cancel/retry.
- `DocumentList` – paginated table with download actions.
- `DocumentServiceWorkspace` – convenience wrapper combining uploader + list.

## Hooks
- `useDocumentUpload` – orchestrates create → PUT → confirm flow using React Query.
- `useDocumentList` – fetches paginated documents by `ownerId` with caching.
- `useDocumentDownload` – resolves download URLs and triggers the browser download.

## API Client
The service layer lives in `src/services/apiDocument.ts`. It exposes `documentApi` (and a backward-compatible `documentClient` alias) wrapping backend endpoints (`createDocument`, `confirmDocument`, `listDocuments`, `downloadDocument`) and surfaces backend constraints (required headers, max size, allowed MIME types).

### Environment variables

Configure the following keys (shown with defaults in `.env.example`):

```
VITE_MAX_FILE_SIZE_MB=25
VITE_ALLOWED_MIME=application/pdf,image/jpeg,image/png
VITE_DEFAULT_PAGE_SIZE=10
```

`src/features/document-service/config.ts` reads the values and falls back to safe defaults when absent, but setting them explicitly keeps environments consistent.

## Configuration
The module reads the following environment variables with safe defaults:

```
MAX_FILE_SIZE_MB    # default 25
ALLOWED_MIME        # default pdf,jpeg,png
DEFAULT_PAGE_SIZE   # default 10
```

Update `.env` per environment as needed. The Vite proxy forwards `/api/document/*` to `API_BASE_URL` for local development.

## Manual Testing
Navigate to **Development → Document Service Demo** in the sidebar. The playground mounts the uploader/list combo scoped to the owner ID you enter, making it easy to test end-to-end flows against real or mock backends.

### Manual QA Checklist
- Upload a PDF/JPEG under the configured size limit and confirm it appears in the list with status `UPLOADED`.
- Trigger an expired pre-signed URL (e.g., reuse an old URL) and verify the Vietnamese error message: `Link hết hạn hoặc không hợp lệ; vui lòng thử lại.`.
- Download an uploaded document and confirm the browser starts the file download.
- Exercise cancel + retry flows to confirm state resets correctly.
