'use client'

import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variantClass = {
  primary: 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] shadow-sm',
  secondary: 'border border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent)]/10',
  ghost: 'text-[var(--text-muted)] bg-transparent hover:bg-[var(--border)]/50 hover:text-[var(--text-primary)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
}

const sizeClass = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-[13px]',
  lg: 'px-5 py-2.5 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClass
  size?: keyof typeof sizeClass
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold leading-none whitespace-nowrap',
        'transition-all duration-150 ease-in-out active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
