'use client';

interface QuestionStepProps {
  question: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange: (value: string) => void;
}

export function QuestionStep({ question, options, value, onChange }: QuestionStepProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{question}</h3>
      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={`
              block p-4 border-2 rounded-lg cursor-pointer
              transition-all duration-200
              hover:border-emerald-500 hover:bg-emerald-50
              focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2
              ${value === option.value 
                ? 'border-emerald-600 bg-emerald-50' 
                : 'border-gray-300'
              }
            `}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="question"
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <span className="ml-3 text-base font-medium text-gray-900">
                {option.label}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
