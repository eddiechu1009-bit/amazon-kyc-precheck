interface StepperProps {
  total: number;
  current: number; // 0-indexed
  labels?: string[];
}

/**
 * Horizontal stepper with connecting line.
 * Current step is highlighted, completed steps get a filled check,
 * remaining steps are neutral.
 */
export default function Stepper({ total, current, labels }: StepperProps) {
  return (
    <div className="flex items-center w-full" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        const isLast = i === total - 1;

        return (
          <div key={i} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-semibold transition-all duration-300 ${
                  isDone
                    ? 'bg-amazon-success text-white shadow-sm'
                    : isCurrent
                    ? 'bg-amazon-orange text-white shadow-cta animate-glow ring-4 ring-amazon-orange/15'
                    : 'bg-gray-200 text-gray-400'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L6 11L12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {labels && labels[i] && (
                <span
                  className={`mt-1.5 text-[10px] sm:text-[11px] hidden sm:block whitespace-nowrap transition-colors ${
                    isCurrent ? 'text-amazon-dark font-semibold' : 'text-gray-400'
                  }`}
                >
                  {labels[i]}
                </span>
              )}
            </div>
            {!isLast && (
              <div className="flex-1 h-0.5 mx-1 sm:mx-2 bg-gray-200 overflow-hidden rounded-full">
                <div
                  className={`h-full bg-amazon-success transition-all duration-500 ease-out`}
                  style={{ width: isDone ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
