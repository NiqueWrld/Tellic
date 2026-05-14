import { useState } from 'react';

type Props = {
  data: unknown;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function CopyJsonButton({ data, disabled, label = 'Copy JSON', className }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const onClick = async () => {
    try {
      const text = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
        copied
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
          : error
            ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className || '',
      ].join(' ')}
    >
      <i
        className={`ph ${
          copied ? 'ph-check' : error ? 'ph-x' : 'ph-clipboard-text'
        }`}
      />
      {copied ? 'Copied!' : error ? 'Failed' : label}
    </button>
  );
}

export default CopyJsonButton;
