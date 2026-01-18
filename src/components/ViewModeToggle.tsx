'use client';

interface ViewModeToggleProps {
  showErrors: boolean;
  onToggle: (showErrors: boolean) => void;
}

export function ViewModeToggle({ showErrors, onToggle }: ViewModeToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onToggle(false)}
        className={`
          px-4 py-1.5 text-sm font-medium rounded-md transition-colors
          ${!showErrors
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
          }
        `}
      >
        Records
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`
          px-4 py-1.5 text-sm font-medium rounded-md transition-colors
          ${showErrors
            ? 'bg-amber-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
          }
        `}
      >
        Errors
      </button>
    </div>
  );
}
