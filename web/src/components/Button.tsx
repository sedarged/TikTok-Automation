import { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  children: ReactNode;
}

export const Button = ({ variant = 'primary', children, ...rest }: ButtonProps) => {
  return (
    <button className={`button button-${variant}`} {...rest}>
      {children}
    </button>
  );
};

export default Button;
