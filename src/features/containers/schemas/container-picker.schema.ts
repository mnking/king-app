import { z } from 'zod';
import { isValidISO6346 } from '@/shared/utils/container';

/**
 * Zod schema for validating container numbers according to ISO 6346 standard.
 *
 * Features:
 * - Transforms input to uppercase and removes spaces
 * - Validates format: 4 letters + 7 digits (total 11 characters)
 * - Validates check digit using ISO 6346 algorithm
 *
 * @example
 * ```typescript
 * containerNumberSchema.parse("MSCU6639870") // ✓ "MSCU6639870"
 * containerNumberSchema.parse("mscu 663 987 0") // ✓ "MSCU6639870"
 * containerNumberSchema.parse("MSCU6639871") // ✗ Error: Invalid check digit
 * containerNumberSchema.parse("ABC123") // ✗ Error: Invalid format
 * ```
 */
export const containerNumberSchema = z
  .string()
  .min(1, 'Container number is required')
  .transform((s) => s.toUpperCase().replace(/\s+/g, ''))
  .refine(
    (s) => /^[A-Z]{4}[0-9]{7}$/.test(s),
    {
      message: 'Invalid ISO 6346 format (expected: 4 letters + 7 digits)',
    }
  )
  .refine(
    (s) => isValidISO6346(s),
    {
      message: 'Invalid ISO 6346 check digit',
    }
  );

/**
 * Type representing the value structure for the ContainerNumberPicker component.
 *
 * This triad of fields represents the complete state of a container selection:
 * - id: Internal UUID for the container (null if not yet resolved/created)
 * - number: The ISO 6346 container number (always present, user-entered)
 * - typeCode: The container type code (null until container is resolved/created)
 *
 * @example
 * ```typescript
 * // Empty state
 * { id: null, number: "", typeCode: null }
 *
 * // After user enters valid number
 * { id: null, number: "MSCU6639870", typeCode: null }
 *
 * // After container resolved/created
 * { id: "uuid-123", number: "MSCU6639870", typeCode: "22G1" }
 * ```
 */
export interface ContainerFieldValue {
  /** Container UUID (null if not resolved/created yet) */
  id: string | null;
  /** ISO 6346 container number */
  number: string;
  /** Container type code (null if not resolved/created yet) */
  typeCode: string | null;
}

/**
 * Zod schema for the complete ContainerFieldValue object.
 *
 * Used for form-level validation when using the ContainerNumberPicker
 * with React Hook Form.
 *
 * @example
 * ```typescript
 * const formSchema = z.object({
 *   container: containerFieldSchema,
 *   // ... other form fields
 * });
 *
 * const form = useForm({
 *   resolver: zodResolver(formSchema),
 *   defaultValues: {
 *     container: { id: null, number: "", typeCode: null }
 *   }
 * });
 * ```
 */
export const containerFieldSchema = z.object({
  id: z.string().uuid().nullable(),
  number: containerNumberSchema,
  typeCode: z.string().nullable(),
});

/**
 * Type inferred from containerFieldSchema.
 * Use this when you need the validated type.
 */
export type ContainerField = z.infer<typeof containerFieldSchema>;
