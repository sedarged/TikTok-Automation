import { InputHTMLAttributes } from 'react';
import './TextField.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

export const TextField = ({ label, helperText, ...rest }: TextFieldProps) => {
  return (
    <label className="text-field">
      {label && <span className="text-field__label">{label}</span>}
      <input className="text-field__input" {...rest} />
      {helperText && <span className="text-field__helper">{helperText}</span>}
    </label>
  );
};

export default TextField;
