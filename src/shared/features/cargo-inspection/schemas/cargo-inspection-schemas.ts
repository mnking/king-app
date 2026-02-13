import { z } from 'zod';

export const PackageCheckSchema = z.object({
  packageCount: z.coerce
    .number({ required_error: 'Package count is required' })
    .int()
    .min(1, 'Package count must be at least 1'),
  statusCheck: z.enum(['normal', 'package_damaged', 'cargo_broken']),
  customsCheck: z.enum(['uninspected', 'passed', 'on_hold']),
});

export const LineCompletionSchema = z.object({
  actualPackageCount: z.coerce
    .number({ required_error: 'Actual package count is required' })
    .int()
    .min(0, 'Actual package count cannot be negative'),
  actualCargoQuantity: z.coerce
    .number({ required_error: 'Actual cargo quantity is required' })
    .min(0, 'Actual cargo quantity cannot be negative'),
  regulatoryCargoType: z.string().optional().nullable(),
  regulatoryCargoDescription: z.string().optional().nullable(),
});
