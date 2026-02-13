export { documentApi } from '@/services/apiDocument';
export type { DocumentApi } from '@/services/apiDocument';
// Backwards compatibility alias (TODO: remove after consumers migrate)
export { documentApi as documentClient } from '@/services/apiDocument';
export type { DocumentApi as DocumentClient } from '@/services/apiDocument';
export { DocumentUploader } from './components/DocumentUploader';
export { DocumentList } from './components/DocumentList';
export { DocumentServiceWorkspace } from './components/DocumentServiceWorkspace';
export { useDocumentUpload } from './hooks/use-document-upload';
export { useDocumentList } from './hooks/use-document-list';
export { useDocumentDownload } from './hooks/use-document-download';
export { documentListQueryKey, documentListPrefixKey } from './hooks/query-keys';
export * from './types';
