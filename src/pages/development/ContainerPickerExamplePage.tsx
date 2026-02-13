/**
 * ContainerPickerExamplePage
 *
 * Development page demonstrating how to use ContainerNumberPicker with React Hook Form.
 * This example shows:
 * - Form initialization with zodResolver
 * - Controller wrapping the picker
 * - Error handling
 * - Form submission
 * - onResolved callback usage
 * - ISO 6346 container number generation
 */

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Package2, ClipboardList, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ContainerNumberPicker } from '@/features/containers/components/ContainerNumberPicker';
import { containerFieldSchema } from '@/features/containers/schemas';
import { useShippingLines } from '@/features/shipping-lines/hooks';
import { useAllContainers, containerQueryKeys } from '@/features/containers';
import { generateValidISO6346ContainerNumber } from '@/shared/utils/container';
import { toastService } from '@/shared/services/toast/toast.service';

// Form schema
const exampleFormSchema = z.object({
  container: containerFieldSchema,
  // Other form fields can go here
  notes: z.string().optional(),
});

type ExampleFormData = z.infer<typeof exampleFormSchema>;

type FormStateTab = 'values' | 'errors' | 'submitted';

const ContainerPickerExamplePage: React.FC = () => {
  const [resolveInfo, setResolveInfo] = useState<string>('');
  const [submitData, setSubmitData] = useState<string>('');

  // Generate Container Numbers state
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const MAX_ATTEMPTS = 100;
  const TARGET_COUNT = 5;

  // Form state display tab
  const [formStateTab, setFormStateTab] = useState<FormStateTab>('values');

  // Query client for invalidating cache after container creation
  const queryClient = useQueryClient();

  // Initialize form with React Hook Form
  const form = useForm<ExampleFormData>({
    resolver: zodResolver(exampleFormSchema),
    defaultValues: {
      container: {
        id: null,
        number: '',
        typeCode: null,
      },
      notes: '',
    },
  });

  // Fetch shipping lines for owner codes
  const { data: shippingLinesData, isLoading: isLoadingShippingLines } = useShippingLines(
    { itemsPerPage: 100 },
    { enabled: true }
  );

  // Fetch all existing containers for duplicate checking
  const { data: allContainers, isLoading: isLoadingContainers } = useAllContainers();

  // Refresh container list manually
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: containerQueryKeys.all });
  };

  // Extract and filter valid 3-letter owner codes, with fallback
  const ownerCodes = useMemo(() => {
    const codes = shippingLinesData?.results
      .map((sl) => sl.code)
      .filter((code) => code && /^[A-Z]{3}$/.test(code)) || [];

    return codes.length > 0 ? codes : ['MSC', 'TEM', 'CMA', 'HLB', 'TGB'];
  }, [shippingLinesData]);

  // Build Set of existing container numbers for O(1) lookup
  const existingContainerNumbers = useMemo(() => {
    return new Set(allContainers?.map((c) => c.number) ?? []);
  }, [allContainers]);

  const onSubmit = (data: ExampleFormData) => {
    setSubmitData(JSON.stringify(data, null, 2));
    setFormStateTab('submitted');
    toastService.success('Form submitted successfully!');
  };

  const handleGenerateNumbers = () => {
    setIsGenerating(true);
    const results: string[] = [];
    const seen = new Set<string>();
    let attempts = 0;

    while (results.length < TARGET_COUNT && attempts < MAX_ATTEMPTS) {
      attempts++;

      const ownerCode = ownerCodes[Math.floor(Math.random() * ownerCodes.length)];

      try {
        const candidate = generateValidISO6346ContainerNumber(ownerCode);

        // Check against both local duplicates AND existing containers in system
        if (!seen.has(candidate) && !existingContainerNumbers.has(candidate)) {
          seen.add(candidate);
          results.push(candidate);
        }
      } catch (error) {
        console.error('Error generating container number:', error);
      }
    }

    if (attempts >= MAX_ATTEMPTS) {
      toastService.error('Failed to generate unique numbers');
    }

    setGeneratedNumbers(results);
    setIsGenerating(false);
  };

  const handleCopyToClipboard = (number: string, index: number) => {
    navigator.clipboard.writeText(number);
    setCopiedIndex(index);
    toastService.success(`Copied: ${number}`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formErrors = form.formState.errors;
  const hasErrors = Object.keys(formErrors).length > 0;
  const hasSubmitData = submitData.length > 0;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Development Preview Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-blue-600">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            <p className="text-xs font-bold uppercase tracking-wider">Development Preview</p>
          </div>
          <div className="flex items-center gap-2">
            <Package2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Container Picker Demo
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Demonstrates the ContainerNumberPicker component integrated with React Hook Form.
          </p>
        </div>
      </div>

      {/* Two-Column Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column (Left) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Container Number Picker */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800 shadow-sm">
              <Controller
                control={form.control}
                name="container"
                render={({ field, fieldState }) => (
                  <ContainerNumberPicker
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    onResolved={({ value, existed }) => {
                      const message = `Container ${existed ? 'found' : 'created'}: ${value.number}`;
                      setResolveInfo(
                        `Container ${existed ? 'found' : 'created'}: ${value.number} (ID: ${value.id}, Type: ${value.typeCode})`
                      );
                      if (existed) {
                        toastService.info(message);
                      } else {
                        toastService.success(message);
                        // Invalidate useAllContainers query to refresh existingContainerNumbers Set
                        queryClient.invalidateQueries({ queryKey: containerQueryKeys.all });
                      }
                    }}
                    required
                    autoFocus
                  />
                )}
              />
            </div>

            {/* Optional Notes Field */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800 shadow-sm">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                {...form.register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Enter any additional notes..."
              />
            </div>

            {/* Resolve Info */}
            {resolveInfo && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-300">{resolveInfo}</p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => {
                  form.reset();
                  setResolveInfo('');
                  setSubmitData('');
                  setFormStateTab('values');
                  toastService.info('Form has been reset');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </form>

          {/* Form State Display - Collapsible Tabs */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setFormStateTab('values')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  formStateTab === 'values'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                Current Values
              </button>
              <button
                type="button"
                onClick={() => setFormStateTab('errors')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  formStateTab === 'errors'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } ${!hasErrors ? 'opacity-50' : ''}`}
                disabled={!hasErrors}
              >
                Errors {hasErrors && `(${Object.keys(formErrors).length})`}
              </button>
              <button
                type="button"
                onClick={() => setFormStateTab('submitted')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  formStateTab === 'submitted'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } ${!hasSubmitData ? 'opacity-50' : ''}`}
                disabled={!hasSubmitData}
              >
                Submitted Data
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {formStateTab === 'values' && (
                <pre className="text-xs text-gray-600 dark:text-gray-300 overflow-auto bg-gray-50 dark:bg-gray-900/50 p-3 rounded">
                  {JSON.stringify(form.watch(), null, 2)}
                </pre>
              )}
              {formStateTab === 'errors' && (
                <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  {hasErrors ? JSON.stringify(formErrors, null, 2) : 'No errors'}
                </pre>
              )}
              {formStateTab === 'submitted' && (
                <pre className="text-xs text-green-700 dark:text-green-400 overflow-auto bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  {hasSubmitData ? submitData : 'Not submitted yet'}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column (Right) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Generate Container Numbers - Top of Sidebar */}
          <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-800/50 rounded">
                  <ClipboardList className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                </div>
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                  Generate Container Numbers
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoadingContainers}
                className="p-1.5 bg-purple-200 dark:bg-purple-700/50 rounded hover:bg-purple-300 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                title="Refresh container list"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-purple-700 dark:text-purple-300 ${isLoadingContainers ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Container count */}
            <div className="mb-3 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
              <span>Total existing containers:</span>
              <span className="font-medium">{allContainers?.length ?? 0}</span>
            </div>

            <button
              type="button"
              onClick={handleGenerateNumbers}
              disabled={isGenerating || isLoadingShippingLines || isLoadingContainers || ownerCodes.length === 0}
              className="w-full px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-100 border border-purple-300 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer mb-4"
            >
              {isGenerating ? 'Generating...' : 'Generate 5 Container Numbers'}
            </button>

            {(isLoadingShippingLines || isLoadingContainers || ownerCodes.length === 0) && (
              <p className="text-xs text-purple-700 dark:text-purple-400">
                {isLoadingShippingLines ? 'Loading shipping line owner codes...' : 'Loading existing containers...'}
              </p>
            )}

            {generatedNumbers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">
                  Valid ISO 6346 numbers:
                </p>
                <ul className="space-y-1.5">
                  {generatedNumbers.map((number, index) => (
                    <li
                      key={index}
                      className="group relative flex items-center justify-between text-sm font-mono text-purple-900 dark:text-purple-300 bg-white dark:bg-purple-900/40 px-3 py-2 rounded border border-purple-200 dark:border-purple-700/50 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 cursor-pointer"
                      onClick={() => handleCopyToClipboard(number, index)}
                    >
                      <span className="truncate">{number}</span>
                      <span className="text-xs text-purple-500 dark:text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity">
                        {copiedIndex === index ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          'Click to copy'
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Test Instructions */}
          <div className="p-5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-yellow-100 dark:bg-yellow-800/50 rounded">
                <CheckCircle className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
              </div>
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                Test Data
              </h3>
            </div>
            <ul className="text-xs text-yellow-800 dark:text-yellow-400 space-y-2">
              <li className="flex items-start gap-2">
                <XCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Valid:</strong> MSCU6639870</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Valid:</strong> TEMU9876540</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span><strong>Invalid check digit:</strong> MSCU6639871</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <span><strong>Valid but not found:</strong> ABCD1234560</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span><strong>Invalid format:</strong> ABC123</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContainerPickerExamplePage;
