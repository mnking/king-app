import React, { useState, useEffect, useId, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  Truck,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  XCircle,
  ClipboardList,
  StickyNote,
} from 'lucide-react';
import type { AttachmentPlaceholder } from '@/shared/features/plan/types';
import { formatSingleDateTime } from '@/shared/features/plan/utils/plan-display-helpers';
import {
  toDateTimeLocalFormat,
  fromDateTimeLocalFormat,
} from '@/shared/utils';
import { FileUploadField } from './FileUploadField';
import { mapSummaryStringsToPlaceholders } from '../helpers/ReceiveExecutionHelpers';
import type { ExecutionContainer } from '../helpers/ReceiveExecutionHelpers';
import { useClickOutside } from '../hooks/use-click-outside';
import { useMediaQuery } from '../hooks/use-media-query';

export interface IssueFormSubmission {
  timestamp: string;
  notes: string | null;
  attachments: AttachmentPlaceholder[];
  photos?: AttachmentPlaceholder[];
}

const ModalShell: React.FC<{
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, isOpen, onClose, children, footer }) => {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl rounded-xl bg-white text-gray-900 shadow-xl dark:border dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close modal"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer ? (
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-end dark:border-gray-800 dark:bg-gray-900">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

const getDateInputDefault = (iso?: string | null) => {
  if (iso) {
    try {
      return toDateTimeLocalFormat(iso);
    } catch {
      // fall through to current timestamp
    }
  }
  const nowIso = new Date().toISOString();
  return toDateTimeLocalFormat(nowIso);
};

const splitDateTimeValue = (value: string | undefined | null) => {
  if (!value) {
    return { date: '', time: '' };
  }
  const [date, time] = value.split('T');
  return {
    date: date ?? '',
    time: time ?? '',
  };
};

const formatDateTimeLabel = (value: string | undefined | null) => {
  if (!value) {
    return 'Select date & time';
  }
  try {
    return formatSingleDateTime(fromDateTimeLocalFormat(value));
  } catch {
    return value.replace('T', ' ');
  }
};

const timestampField = z.string().min(1, 'Timestamp is required');

const receiveFormSchema = z.object({
  timestamp: timestampField,
  truckNo: z
    .string()
    .trim()
    .min(1, 'Truck number is required'),
  notes: z.string().optional(),
});

type ReceiveFormValues = z.infer<typeof receiveFormSchema>;

const rejectFormSchema = z.object({
  timestamp: z.string().min(1, 'Rejection time is required'),
  notes: z
    .string()
    .trim()
    .min(1, 'Rejection reason is required'),
});

type RejectFormValues = z.infer<typeof rejectFormSchema>;
const deferFormSchema = z.object({
  timestamp: z
    .string()
    .trim()
    .optional(),
  notes: z
    .string()
    .trim()
    .min(1, 'Defer reason is required'),
});

type DeferFormValues = z.infer<typeof deferFormSchema>;

interface ResponsiveDateTimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

const ResponsiveDateTimeField: React.FC<ResponsiveDateTimeFieldProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Select date & time',
  ariaLabel,
  disabled = false,
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!isMobile) {
    return (
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        aria-label={ariaLabel}
        disabled={disabled}
      />
    );
  }

  return (
    <MobileDateTimeDropdown
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      disabled={disabled}
    />
  );
};

const MobileDateTimeDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}> = ({ value, onChange, className = '', placeholder, ariaLabel, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    if (!open) {
      const { date, time } = splitDateTimeValue(value);
      setLocalDate(date);
      setLocalTime(time);
    }
  }, [value, open]);

  useClickOutside(containerRef, () => setOpen(false), open);

  const commitValue = () => {
    if (localDate && localTime) {
      onChange(`${localDate}T${localTime}`);
    } else {
      onChange('');
    }
    setOpen(false);
  };

  const displayLabel = formatDateTimeLabel(value) || placeholder || 'Select date & time';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span className="truncate">{displayLabel}</span>
        <Calendar className="ml-2 h-4 w-4 text-gray-400 dark:text-gray-300" aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="space-y-3 p-4">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Date
              <input
                type="date"
                value={localDate}
                onChange={(event) => setLocalDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
              />
            </label>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Time
              <input
                type="time"
                value={localTime}
                onChange={(event) => setLocalTime(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
                step={60}
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitValue}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const ReceiveModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  container: ExecutionContainer | null;
  isSubmitting: boolean;
  onSubmit: (payload: {
    timestamp: string;
    truckNo: string;
    notes: string | null;
    documents: string[];
    photos: string[];
  }) => Promise<void>;
  viewMode?: boolean;
}> = ({ isOpen, onClose, container, isSubmitting, onSubmit, viewMode = false }) => {
  const formId = useId();
  const [documents, setDocuments] = useState<AttachmentPlaceholder[]>([]);
  const [photos, setPhotos] = useState<AttachmentPlaceholder[]>([]);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: {
      timestamp: getDateInputDefault(),
      truckNo: container?.truckNo ?? '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (viewMode && container) {
      // In view mode, populate with existing data
      setDocuments(mapSummaryStringsToPlaceholders(container.documents));
      setPhotos(mapSummaryStringsToPlaceholders(container.photos));
      reset({
        timestamp: getDateInputDefault(container.receivedAt),
        truckNo: container.truckNo ?? '',
        notes: container.notes ?? '',
      });
    } else {
      // In edit mode, start fresh
      setDocuments([]);
      setPhotos([]);
      reset({
        timestamp: getDateInputDefault(),
        truckNo: container?.truckNo ?? '',
        notes: '',
      });
    }
  }, [isOpen, container, reset, viewMode]);

  const onSubmitForm = handleSubmit(async (data) => {
    await onSubmit({
      timestamp: data.timestamp,
      truckNo: data.truckNo.trim(),
      notes: data.notes?.trim() ? data.notes.trim() : null,
      documents: documents.map((doc) => doc.name),
      photos: photos.map((photo) => photo.name),
    });
  });

  return (
    <ModalShell
      title={
        container
          ? `Receive Container ${container.orderContainer.containerNo}`
          : 'Receive Container'
      }
      isOpen={isOpen}
      onClose={onClose}
        footer={
          viewMode ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Close
            </button>
          ) : (
            <Fragment>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              <button
                type="submit"
                form={formId}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Done
              </button>
            </div>
          </Fragment>
        )
        }
      >
        <form id={formId} onSubmit={onSubmitForm} className="space-y-4">
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-100">
            Review container receipt details and supporting documentation.
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              Receive Timestamp
              <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
            name="timestamp"
            render={({ field }) => (
                <ResponsiveDateTimeField
                  value={field.value}
                  onChange={field.onChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
                  ariaLabel="Receive timestamp"
                  disabled={viewMode}
                />
              )}
            />
          {errors.timestamp ? (
            <p className="mt-1 text-xs text-red-600">{errors.timestamp.message}</p>
          ) : null}
          </div>
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Truck className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              Truck Number
              <span className="text-red-500">*</span>
            </label>
            <input
              {...register('truckNo')}
              type="text"
              placeholder="Enter truck number"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
              disabled={viewMode}
            />
          {errors.truckNo ? (
            <p className="mt-1 text-xs text-red-600">{errors.truckNo.message}</p>
          ) : null}
        </div>
        {viewMode ? (
          <>
            {documents.length > 0 && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <FileText className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                  Documents
                </label>
                <div className="mt-1 space-y-1">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="text-sm text-gray-600 dark:text-gray-300">• {doc.name}</div>
                  ))}
                </div>
              </div>
            )}
            {photos.length > 0 && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <FileText className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                  Photos
                </label>
                <div className="mt-1 space-y-1">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="text-sm text-gray-600 dark:text-gray-300">• {photo.name}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <FileUploadField
              label="Documents (optional)"
              files={documents}
              onChange={setDocuments}
            />
            <FileUploadField
              label="Photos (optional)"
              accept="image/*"
              files={photos}
              onChange={setPhotos}
            />
          </>
          )}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <StickyNote className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Add notes about the receipt..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
              disabled={viewMode}
            />
          </div>
        </form>
    </ModalShell>
  );
};

export const ContainerProblemModal: React.FC<{
  variant: 'problem' | 'adjusted';
  isOpen: boolean;
  onClose: () => void;
  container: ExecutionContainer | null;
  isSubmitting: boolean;
  onSubmit: (payload: IssueFormSubmission) => Promise<void>;
  viewMode?: boolean;
}> = ({ variant, isOpen, onClose, container, isSubmitting, onSubmit, viewMode = false }) => {
  const formId = useId();
  const [attachments, setAttachments] = useState<AttachmentPlaceholder[]>([]);
  const [photos, setPhotos] = useState<AttachmentPlaceholder[]>([]);

  const isProblem = variant === 'problem';
  const summary = isProblem
    ? container?.summary?.problem
    : container?.summary?.adjustedDocument;
  const timestampKey = isProblem ? 'problemTimestamp' : 'adjustedDocTimestamp';

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ timestamp: string; notes?: string }>({
    resolver: zodResolver(
      z.object({
        timestamp: z.string().min(1, 'Timestamp is required'),
        notes: z.string().optional(),
      }),
    ),
    defaultValues: {
      timestamp: getDateInputDefault(),
      notes: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    setAttachments(mapSummaryStringsToPlaceholders(summary?.documents));
    setPhotos(mapSummaryStringsToPlaceholders(summary?.photos));
    reset({
      timestamp: getDateInputDefault(summary?.[timestampKey] ?? null),
      notes: summary?.notes ?? '',
    });
  }, [isOpen, container, reset, summary, timestampKey]);

  const onSubmitForm = handleSubmit(async (data) => {
    await onSubmit({
      timestamp: data.timestamp,
      notes: data.notes?.trim() ? data.notes.trim() : null,
      attachments,
      photos,
    });
  });

  return (
    <ModalShell
      title={
        container
          ? `${isProblem ? 'Container Problem' : 'Adjusted Document'} — ${container.orderContainer.containerNo}`
          : isProblem
            ? 'Container Problem'
            : 'Adjusted Document'
      }
      isOpen={isOpen}
      onClose={onClose}
        footer={
          viewMode ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Close
            </button>
          ) : (
            <Fragment>
              <button
                type="submit"
                form={formId}
                disabled={isSubmitting}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border ${isProblem ? 'border-amber-400' : 'border-blue-400'} px-4 py-2 text-sm font-semibold ${isProblem ? 'text-amber-600' : 'text-blue-700'} transition ${isProblem ? 'hover:bg-amber-50' : 'hover:bg-blue-50'} disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:text-gray-100 ${isProblem ? 'dark:border-amber-600' : 'dark:border-blue-500'} ${isProblem ? 'dark:hover:bg-amber-900/30' : 'dark:hover:bg-blue-900/30'}`}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardList className="h-4 w-4" />
              )}
              Save
            </button>
          </Fragment>
        )
      }
      >
        <form id={formId} onSubmit={onSubmitForm} className="space-y-5">
          <div
            className={`rounded-lg ${isProblem ? 'bg-amber-50' : 'bg-blue-50'} px-4 py-3 text-sm ${isProblem ? 'text-amber-800' : 'text-blue-800'} ${isProblem ? 'dark:bg-amber-900/30 dark:text-amber-200' : 'dark:bg-blue-900/30 dark:text-blue-100'}`}
          >
            {isProblem
              ? 'Please capture detailed notes and supporting evidence before marking the container as received with problems.'
              : 'Attach supporting documents that confirm adjustments and retain the container in waiting state until the receive action is completed.'}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              {isProblem ? 'Problem Timestamp' : 'Adjusted Doc Timestamp'}
              {!viewMode && <span className="text-red-500">*</span>}
            </label>
            {viewMode ? (
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {summary?.[timestampKey] ? formatSingleDateTime(summary[timestampKey]) : '—'}
              </p>
            ) : (
              <Controller
                control={control}
                name="timestamp"
                render={({ field }) => (
                  <ResponsiveDateTimeField
                    value={field.value}
                    onChange={field.onChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
                    ariaLabel="Receive timestamp"
                    disabled={false}
                  />
                )}
              />
            )}
            {!viewMode && errors.timestamp ? (
              <p className="mt-1 text-xs text-red-600">{errors.timestamp.message}</p>
            ) : null}
          </div>

        {viewMode ? (
          <>
            {attachments.length > 0 && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <FileText className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                  {isProblem ? 'Incident Report Attachments' : 'Confirmation Documents'}
                </label>
                <div className="mt-1 space-y-1">
                  {attachments.map((doc, idx) => (
                    <div key={idx} className="text-sm text-gray-600 dark:text-gray-300">• {doc.name}</div>
                  ))}
                </div>
              </div>
            )}
            {photos.length > 0 && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <FileText className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                  Photo Evidence
                </label>
                <div className="mt-1 space-y-1">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="text-sm text-gray-600 dark:text-gray-300">• {photo.name}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <FileUploadField
              label={isProblem ? 'Incident Report Attachments' : 'Confirmation Documents'}
              files={attachments}
              onChange={setAttachments}
            />

            <FileUploadField
              label="Photo Evidence"
              accept="image/*"
              files={photos}
              onChange={setPhotos}
            />
          </>
        )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          <StickyNote className="h-4 w-4 text-gray-500 dark:text-gray-300" />
          Notes
        </label>
        <textarea
          {...register('notes')}
          rows={4}
          placeholder={
            isProblem
              ? 'Describe the issue observed during inspection...'
              : 'Describe the adjustments and supporting context...'
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
          disabled={viewMode}
        />
      </div>
      </form>
    </ModalShell>
  );
};

export const RejectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  container: ExecutionContainer | null;
  isSubmitting: boolean;
  onSubmit: (payload: { timestamp: string; notes: string | null }) => Promise<void>;
}> = ({ isOpen, onClose, container, isSubmitting, onSubmit }) => {
  const formId = useId();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
    defaultValues: {
      timestamp: getDateInputDefault(),
      notes: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (container?.rejectDetails?.rejectedAt && container?.rejectDetails?.notes) {
      // Populate with existing reject data from rejectDetails
      reset({
        timestamp: getDateInputDefault(container.rejectDetails.rejectedAt),
        notes: container.rejectDetails.notes,
      });
    } else {
      // Use defaults for new reject
      reset({
        timestamp: getDateInputDefault(),
        notes: '',
      });
    }
  }, [isOpen, reset, container]);

  const onSubmitForm = handleSubmit(async (data) => {
    const trimmedNotes = data.notes.trim();
    await onSubmit({
      timestamp: data.timestamp,
      notes: trimmedNotes || null,
    });
  });

  return (
    <ModalShell
      title={
        container
          ? `Reject Container ${container.orderContainer.containerNo}`
          : 'Reject Container'
      }
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Done
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmitForm} className="space-y-4">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-100">
          Provide a reason for rejecting the container. The plan will move to
          pending reconciliation if any rejections remain.
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-300" />
            Rejection Timestamp
            <span className="text-red-500">*</span>
          </label>
          <Controller
            control={control}
            name="timestamp"
            render={({ field }) => (
              <ResponsiveDateTimeField
                value={field.value}
                onChange={field.onChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-red-400 dark:focus:ring-red-400/50"
                ariaLabel="Rejection timestamp"
              />
            )}
          />
          {errors.timestamp ? (
            <p className="mt-1 text-xs text-red-600">{errors.timestamp.message}</p>
          ) : null}
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <StickyNote className="h-4 w-4 text-gray-500 dark:text-gray-300" />
            Notes
            <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('notes')}
            rows={4}
            placeholder="Describe the reason for rejection..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-red-400 dark:focus:ring-red-400/50"
          />
          {errors.notes ? (
            <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>
      </form>
    </ModalShell>
  );
};

export const DeferModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  container: ExecutionContainer | null;
  isSubmitting: boolean;
  onSubmit: (payload: { timestamp: string | null; notes: string }) => Promise<void>;
}> = ({ isOpen, onClose, container, isSubmitting, onSubmit }) => {
  const formId = useId();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeferFormValues>({
    resolver: zodResolver(deferFormSchema),
    defaultValues: {
      timestamp: getDateInputDefault(),
      notes: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (container?.rejectDetails?.rejectedAt && container?.rejectDetails?.notes) {
      // Populate with existing defer data from rejectDetails
      reset({
        timestamp: getDateInputDefault(container.rejectDetails.rejectedAt),
        notes: container.rejectDetails.notes,
      });
    } else {
      // Use defaults for new defer
      reset({
        timestamp: getDateInputDefault(),
        notes: '',
      });
    }
  }, [isOpen, reset, container]);

  const onSubmitForm = handleSubmit(async (data) => {
    const trimmedTimestamp =
      data.timestamp && data.timestamp.trim().length > 0
        ? data.timestamp.trim()
        : null;
    await onSubmit({
      timestamp: trimmedTimestamp,
      notes: data.notes.trim(),
    });
  });

  return (
    <ModalShell
      title={
        container
          ? `Defer Container ${container.orderContainer.containerNo}`
          : 'Defer Container'
      }
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            Done
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmitForm} className="space-y-4">
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
          Capture when and why the container is deferred. Notes are sent to the
          operations backend, while timestamps remain local for audit tracking.
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-300" />
            Defer Timestamp
            <span className="text-xs font-normal text-gray-500">(optional)</span>
          </label>
          <Controller
            control={control}
            name="timestamp"
            render={({ field }) => (
              <ResponsiveDateTimeField
                value={field.value}
                onChange={field.onChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-amber-400 dark:focus:ring-amber-400/50"
                ariaLabel="Defer timestamp"
              />
            )}
          />
          {errors.timestamp ? (
            <p className="mt-1 text-xs text-red-600">{errors.timestamp.message}</p>
          ) : null}
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <StickyNote className="h-4 w-4 text-gray-500 dark:text-gray-300" />
            Notes
            <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('notes')}
            rows={4}
            placeholder="Describe why this container is deferred..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-amber-400 dark:focus:ring-amber-400/50"
          />
          {errors.notes ? (
            <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>
      </form>
    </ModalShell>
  );
};
