import { type ReactNode, type MouseEvent } from 'react';
import { href, navigate } from '@/lib/router';

interface LinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

export function Link({ to, children, className, onClick, ariaLabel }: LinkProps) {
  const handleClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    navigate(to);
    onClick?.();
  };

  return (
    <a href={href(to)} onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
