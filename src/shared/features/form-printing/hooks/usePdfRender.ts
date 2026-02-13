import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { renderPdf } from '@/services/apiDocument';
import type { FormTemplateCode, RenderPayload } from '../types';

export interface PdfRenderInput<TCode extends FormTemplateCode> {
  templateCode: TCode;
  payload: RenderPayload<TCode>;
  fileName?: string;
}

const downloadBlob = (blob: Blob, fileName?: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'document.pdf';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export function usePdfRender<TCode extends FormTemplateCode>() {
  return useMutation({
    mutationFn: async ({ templateCode, payload }: PdfRenderInput<TCode>) => {
      const blob = await renderPdf({ templateCode, payload });
      return blob;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to render PDF');
    },
  });
}

export const usePdfDownload = <TCode extends FormTemplateCode>() => {
  const mutation = usePdfRender<TCode>();

  const download = async (input: PdfRenderInput<TCode>) => {
    const blob = await mutation.mutateAsync(input);
    downloadBlob(blob, input.fileName);
    return blob;
  };

  return {
    ...mutation,
    download,
  };
};
