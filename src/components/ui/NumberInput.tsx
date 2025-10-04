import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface NumberInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

export const NumberInput = ({ value, onChange, min = 1, max, step = 1, required = false }: NumberInputProps) => {
  const handleIncrement = () => {
    const currentValue = value === '' ? 0 : Number(value);
    const newValue = currentValue + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const currentValue = value === '' ? 0 : Number(value);
    const newValue = currentValue - step;
    if (min === undefined || newValue >= min) {
      onChange(newValue);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
        onChange('');
    } else {
        const numValue = parseInt(rawValue, 10);
        if (!isNaN(numValue)) {
            onChange(numValue);
        }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="icon" onClick={handleDecrement} disabled={value === min}>
        <Minus className="h-4 w-4" />
      </Button>
      <Input 
        type="number" 
        value={value} 
        onChange={handleChange} 
        className="text-center" 
        min={min} 
        max={max} 
        step={step}
        required={required}
        placeholder="0"
      />
      <Button type="button" variant="outline" size="icon" onClick={handleIncrement} disabled={max !== undefined && value === max}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};