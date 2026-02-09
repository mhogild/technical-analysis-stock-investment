interface ErrorMessageProps {
  title?: string;
  message: string;
  retryAction?: () => void;
}

export default function ErrorMessage({
  title = "Something went wrong",
  message,
  retryAction,
}: ErrorMessageProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <svg
        className="mx-auto h-10 w-10 text-red-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <h3 className="mt-3 text-sm font-semibold text-red-800">{title}</h3>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {retryAction && (
        <button
          onClick={retryAction}
          className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
        >
          Try again
        </button>
      )}
    </div>
  );
}
