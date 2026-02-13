import { z } from 'zod';

export const truckInfoSchema = z.object({
  plateNumber: z.string().min(1, 'Vehicle plate number is required'),
  driverName: z.string().min(1, 'Driver name is required'),
});

export type TruckInfoForm = z.infer<typeof truckInfoSchema>;

export const truckInfoDefaultValues: TruckInfoForm = {
  plateNumber: '',
  driverName: '',
};
