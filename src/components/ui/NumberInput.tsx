import * as React from "react";
import { Input } from "@/components/ui/input";

interface NumberInputProps extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'onChange' | 'value'> {
  value: number | '';
  onChange: (value: number | '') => void;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, ...props }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === '') {
        onChange('');
      } else {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          onChange(num);
        }
      }
    };

    return (
      <Input
        type="number"
        value={value}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";