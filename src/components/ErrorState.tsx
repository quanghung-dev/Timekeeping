import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorState({
  title = 'Không thể tải dữ liệu',
  message,
  onRetry,
  fullScreen = false,
}: ErrorStateProps) {
  return (
    <div
      className={`${fullScreen ? 'min-h-screen' : 'min-h-64'} flex items-center justify-center bg-brandBg-light p-6 dark:bg-brandBg-dark`}
      role="alert"
    >
      <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-red-100 bg-white p-8 text-center shadow-soft dark:border-red-950/40 dark:bg-brandCard-dark">
        <AlertCircle className="text-danger" size={40} />
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="mt-2 text-sm text-brandText-secondaryLight dark:text-brandText-secondaryDark">
            {message}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <RefreshCw size={16} />
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}
