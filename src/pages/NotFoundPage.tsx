const NotFoundPage = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl font-semibold text-gray-200 dark:text-gray-700">404</div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Page not found
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The page you requested does not exist or has been moved.
        </p>
      </div>
      <a
        href="/dashboard"
        className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        Back to dashboard
      </a>
    </div>
  );
};

export default NotFoundPage;
