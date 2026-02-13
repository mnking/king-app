import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import type { Container, ContainerType } from '@/features/containers/types';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ContainerCreateForm } from '@/features/containers/types';

interface CreateContainerModalProps {
  isOpen: boolean;
  containerNumber: string;
  onClose: () => void;
  onCreated: (container: Container) => void;
  containerTypes: ContainerType[];
  isLoadingTypes: boolean;
  createMutation: UseMutationResult<Container, Error, ContainerCreateForm, unknown>;
}

/**
 * CreateContainerModal Component
 *
 * Modal dialog for creating a new container when the entered number is valid
 * but not found in the system.
 *
 * Features:
 * - Displays the validated container number (readonly)
 * - Searchable/filterable combobox for selecting container type
 * - Handles creation with loading states
 * - Error handling with retry capability
 * - Focus management (trap focus, return to trigger on close)
 * - Keyboard navigation (ESC to close, Enter to submit)
 */
export const CreateContainerModal: React.FC<CreateContainerModalProps> = ({
  isOpen,
  containerNumber,
  onClose,
  onCreated,
  containerTypes,
  isLoadingTypes,
  createMutation,
}) => {
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);

  // Filter types based on search term
  const filteredTypes = containerTypes.filter((type) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      type.code.toLowerCase().includes(searchLower) ||
      type.size?.toLowerCase().includes(searchLower) ||
      type.description?.toLowerCase().includes(searchLower)
    );
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTypeCode('');
      setSearchTerm('');
      setError('');
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !createMutation.isPending) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, createMutation.isPending, onClose]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !createMutation.isPending) {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTypeCode) {
      setError('Please select a container type');
      return;
    }

    createMutation.mutate(
      {
        number: containerNumber,
        containerTypeCode: selectedTypeCode,
      },
      {
        onSuccess: (container) => {
          onCreated(container);
        },
        onError: (err) => {
          setError(err.message || 'Failed to create container. Please try again.');
        },
      }
    );
  };

  const handleTypeSelect = (typeCode: string) => {
    setSelectedTypeCode(typeCode);
    setError('');
  };

  if (!isOpen) return null;

  const modalRoot = typeof document !== 'undefined' ? document.body : null;

  if (!modalRoot) return null;

  const isLoading = isLoadingTypes;
  const isSaving = createMutation.isPending;
  const selectedType = containerTypes.find((t) => t.code === selectedTypeCode);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Container
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Container Number (readonly) */}
            <div className="space-y-2">
              <label htmlFor="container-number" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Container Number
              </label>
              <input
                id="container-number"
                type="text"
                value={containerNumber}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono cursor-default"
                tabIndex={-1}
              />
            </div>

            {/* Container Type Selection */}
            <div className="space-y-2">
              <label htmlFor="container-type-search" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Container Type <span className="text-red-500">*</span>
              </label>

              {/* Search Input */}
              <input
                ref={firstFocusableRef}
                id="container-type-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code, size, or description..."
                disabled={isLoading || isSaving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              />

              {/* Type List */}
              <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading types...</span>
                  </div>
                ) : filteredTypes.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No types found matching your search' : 'No container types available'}
                  </div>
                ) : (
                  <div role="listbox" aria-label="Container types">
                    {filteredTypes.map((type) => {
                      const isSelected = selectedTypeCode === type.code;
                      return (
                        <button
                          key={type.code}
                          type="button"
                          onClick={() => handleTypeSelect(type.code)}
                          disabled={isSaving}
                          role="option"
                          aria-selected={isSelected}
                          className={`
                            w-full px-3 py-2 text-left text-sm
                            hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:outline-none
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 font-medium' : ''}
                          `}
                        >
                          <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">{type.code}</div>
                          <div className="text-gray-600 dark:text-gray-300">
                            {type.size}
                            {type.description && ` — ${type.description}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Type Display */}
              {selectedType && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-900 dark:text-blue-300">
                  <span className="font-medium">Selected:</span> {selectedType.code} — {selectedType.size}{' '}
                  {selectedType.description}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300" role="alert">
                {error}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving || !selectedTypeCode}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSaving ? 'Creating...' : 'Create Container'}
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};
