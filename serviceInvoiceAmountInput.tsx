import React, { useEffect, useState } from 'react';
import {
  formatNumberForInput,
  formatThousandsWhileTyping,
  parseFormattedNumber,
  roundToDecimalPlaces,
  type MaxDecimalPlaces,
} from './numericInputFormat';

type Props = {
  value: number;
  onChange: (n: number) => void;
  maxDecimalPlaces: MaxDecimalPlaces;
  className?: string;
  placeholder?: string;
  title?: string;
};

/** Text input with comma grouping; decimals optional (0–3 places). */
export function ServiceInvoiceAmountInput({
  value,
  onChange,
  maxDecimalPlaces,
  className,
  placeholder,
  title,
}: Props) {
  const [localValue, setLocalValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const displayFromProp = () => formatNumberForInput(value, maxDecimalPlaces);

  useEffect(() => {
    if (!isEditing) setLocalValue(displayFromProp());
  }, [value, isEditing, maxDecimalPlaces]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const display = formatThousandsWhileTyping(raw, { maxDecimalPlaces });
    setLocalValue(display);
    let n = parseFormattedNumber(raw);
    n = roundToDecimalPlaces(Math.max(0, n), maxDecimalPlaces);
    onChange(n);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setLocalValue(displayFromProp());
  };

  return (
    <input
      type="text"
      inputMode={maxDecimalPlaces === 0 ? 'numeric' : 'decimal'}
      dir="ltr"
      value={localValue}
      onChange={handleChange}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      title={title}
    />
  );
}
