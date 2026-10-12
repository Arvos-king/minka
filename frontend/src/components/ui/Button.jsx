/**
 * Bouton de l'application.
 *
 * Hauteur minimale de 48 px sur les variantes principales : c'est la taille en
 * dessous de laquelle une cible devient pénible à viser au pouce, et toute
 * l'interface est pensée pour être utilisée d'une main.
 */

const VARIANTS = {
  primary: 'bg-brand-600 text-sur-marque hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-surface text-sand-800 ring-1 ring-sand-300 hover:bg-sand-50 active:bg-sand-100 disabled:text-sand-400',
  ghost: 'text-sand-700 hover:bg-sand-200/70 active:bg-sand-200 disabled:text-sand-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
};

const SIZES = {
  md: 'min-h-12 px-5 text-base',
  sm: 'min-h-9 px-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
