import { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export const Card = ({ title, subtitle, children }: CardProps) => (
  <section className="card" aria-label={title}>
    {title && (
      <header className="card__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
      </header>
    )}
    <div className="card__body">{children}</div>
  </section>
);

export default Card;
