import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { documentApi } from '@/services/apiDocument';

export interface DocumentDownloadInput {
  documentId: string;
  fileName?: string;
  openInNewTab?: boolean;
}

const triggerBrowserDownload = (
  url: string,
  fileName?: string,
  openInNewTab?: boolean,
) => {
  if (openInNewTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  if (fileName) {
    anchor.download = fileName;
  } else {
    anchor.rel = 'noopener';
    anchor.target = '_blank';
  }

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export const useDocumentDownload = () => {
  return useMutation({
    mutationFn: async ({
      documentId,
      fileName,
      openInNewTab,
    }: DocumentDownloadInput) => {
      const { downloadUrl } = await documentApi.downloadDocument(documentId);

      if (!downloadUrl) {
        throw new Error(
          // TODO(i18n): Localize missing download URL error.
          'No download URL was returned for this document.',
        );
      }

      triggerBrowserDownload(downloadUrl, fileName, openInNewTab);

      return downloadUrl;
    },
    onSuccess: () => {
      toast.success(
        // TODO(i18n): Localize download success message.
        'Download started.',
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : // TODO(i18n): Localize download generic error.
            'Unable to download document. Please try again.';
      toast.error(message);
    },
  });
};
