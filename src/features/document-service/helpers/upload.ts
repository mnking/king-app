export interface UploadOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

/**
 * Perform a PUT upload to a pre-signed URL with progress + cancel support.
 */
export const uploadFileWithProgress = (
  url: string,
  file: File,
  { signal, headers, onProgress }: UploadOptions = {},
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', url, true);

    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress?.(percent);
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      const error = new Error(
        // TODO(i18n): Localize upload failure message.
        `Upload failed with status ${xhr.status}.`,
      ) as Error & { status?: number; responseText?: string };
      error.status = xhr.status;
      error.responseText = xhr.responseText;
      reject(error);
    });

    xhr.addEventListener('error', () => {
      const error = new Error(
        // TODO(i18n): Localize upload network error message.
        'Network error occurred during file upload.',
      ) as Error & { status?: number };
      reject(error);
    });

    xhr.addEventListener('abort', () => {
      reject(
        new DOMException(
          // TODO(i18n): Localize upload cancelled message.
          'Upload cancelled by user.',
          'AbortError',
        ),
      );
    });

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          xhr.abort();
        },
        { once: true },
      );
    }

    xhr.send(file);
  });
};
