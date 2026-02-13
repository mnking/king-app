import { Construction, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ComingSoon = () => {
  const navigate = useNavigate();
  const availableFeatures = [
    {
      label: 'Zones & Locations',
      path: '/zones-locations',
      description: 'Organize storage areas and maintain accurate facility mapping.',
    },
    {
      label: 'HBL Management',
      path: '/hbl-management',
      description: 'Oversee house bills of lading and shipment documentation.',
    },
    {
      label: 'Booking Orders',
      path: '/booking-orders',
      description: 'Create and manage booking orders for CFS operations.',
    },
    {
      label: 'Container Receive Plan',
      path: '/receive-plan-workspace',
      description: 'Coordinate inbound plans and monitor staging progress.',
    },
    {
      label: 'Container Receiving',
      path: '/receive-plan-execution',
      description: 'Implement actual container receiving and update statuses.',
    },
  ];

  return (
    <div className="flex flex-1 h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-4xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative rounded-full bg-blue-100 p-6 shadow-inner dark:bg-blue-950/40">
              <Construction className="h-20 w-20 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
            Coming Soon
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            This feature is currently under development. In the meantime, explore
            the tools that are ready for you today.
          </p>

          <div className="my-8 border-t border-gray-200 dark:border-gray-700" />

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Available Now
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {availableFeatures.map(({ label, path, description }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="group flex h-full w-full flex-col items-start rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      {label}
                    </span>
                    <ArrowRight className="h-5 w-5 text-blue-500 transition-transform group-hover:translate-x-1" />
                  </div>
                  {description ? (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {description}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-10 text-xs text-gray-400 dark:text-gray-500">
            Stay tuned for updates
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
