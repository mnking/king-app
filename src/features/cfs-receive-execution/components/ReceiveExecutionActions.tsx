import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/features/auth/useAuth';
import type { ActionType } from '../helpers/ReceiveExecutionHelpers';
import { useClickOutside } from '../hooks/use-click-outside';

export const MobileActionMenu: React.FC<{
  onSelect: (type: ActionType) => void;
  className?: string;
  showDefer?: boolean;
}> = ({ onSelect, className = '', showDefer = false }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { can } = useAuth();
  const canWriteExecution = can?.('actual_container_receive:write') ?? false;

  useClickOutside(menuRef, () => setOpen(false), open);

  const handleSelect = (type: ActionType) => {
    if (!canWriteExecution && !type.startsWith('view')) {
      toast.error('You do not have permission to modify container execution.');
      return;
    }
    onSelect(type);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Select action
        <svg
          className="ml-2 h-4 w-4 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
            <MobileActionButton label="Receive" onClick={() => handleSelect('receive')} />
            <MobileActionButton
              label="Container Problem"
              onClick={() => handleSelect('problem')}
            />
            <MobileActionButton
              label="Adjusted Document"
              onClick={() => handleSelect('adjusted')}
            />
            {showDefer ? (
              <MobileActionButton label="Defer" onClick={() => handleSelect('defer')} />
            ) : null}
            <MobileActionButton label="Reject" onClick={() => handleSelect('reject')} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

const MobileActionButton: React.FC<{ label: string; onClick: () => void }> = ({
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
  >
    {label}
  </button>
);

export const SplitActionButton: React.FC<{
  onReceive: () => void;
  onProblem: () => void;
  onAdjusted: () => void;
  className?: string;
}> = ({ onReceive, onProblem, onAdjusted, className = '' }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { can } = useAuth();
  const canWriteExecution = can?.('actual_container_receive:write') ?? false;

  useClickOutside(menuRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const toggleMenu = () => setOpen((prev) => !prev);

  const handleSelect = (action: () => void) => {
    if (!canWriteExecution) {
      toast.error('You do not have permission to modify container execution.');
      return;
    }
    action();
    setOpen(false);
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => handleSelect(onReceive)}
        className="rounded-l-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
        disabled={!canWriteExecution}
      >
        Receive
      </button>
      <button
        type="button"
        onClick={toggleMenu}
        className="inline-flex items-center rounded-r-lg border border-l border-green-700 bg-green-600 px-2 py-2 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <button
            type="button"
            onClick={() => handleSelect(onProblem)}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-900/30"
          >
            Problem
          </button>
          <button
            type="button"
            onClick={() => handleSelect(onAdjusted)}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-900/30"
          >
            Adjusted Doc
          </button>
        </div>
      ) : null}
    </div>
  );
};

export const SplitRejectButton: React.FC<{
  onReject: () => void;
  onDefer?: () => void;
  className?: string;
}> = ({ onReject, onDefer, className = '' }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { can } = useAuth();
  const canWriteExecution = can?.('actual_container_receive:write') ?? false;

  useClickOutside(menuRef, () => setOpen(false), open && Boolean(onDefer));

  useEffect(() => {
    if (!open || !onDefer) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onDefer]);

  const toggleMenu = () => setOpen((prev) => !prev);

  const handleSelect = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => handleSelect(onReject)}
        className="rounded-l-lg border border-red-600 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
        disabled={!canWriteExecution}
      >
        Reject
      </button>
      {onDefer ? (
        <>
          <button
            type="button"
            onClick={toggleMenu}
            className="inline-flex items-center rounded-r-lg border border-l border-red-600 bg-red-50 px-2 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none dark:border-red-700 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
            aria-haspopup="true"
            aria-expanded={open}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          {open ? (
            <div
              ref={menuRef}
              className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <button
                type="button"
                onClick={() => handleSelect(onDefer)}
                className="flex w-full items-center px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-900/30"
              >
                Defer
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
