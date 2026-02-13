import { z } from 'zod';
import type { ContainerPositionFilters } from '../types';

export const containerPositionFiltersSchema = z.object({
  containerNo: z.string().trim().optional(),
  forwarderId: z.string().trim().optional(),
  page: z.number().optional(),
  itemsPerPage: z.number().optional(),
});

export const containerPositionDefaultFilters: ContainerPositionFilters = {
  containerNo: '',
  forwarderId: '',
  page: 1,
  itemsPerPage: 20,
};

export type ContainerPositionFiltersForm = z.infer<typeof containerPositionFiltersSchema>;
