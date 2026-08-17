import { useId } from 'react';

/**
 * Champ de saisie avec libellé.
 *
 * Le libellé est un vrai <label> associé au champ : les gestionnaires de mots
 * de passe s'en servent pour reconnaître le formulaire, et la zone tactile du
 * champ s'en trouve agrandie.
 */
export function TextField({ label, hint, error, className = '', ...props }) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-sand-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={[
          'mt-1.5 block w-full rounded-xl bg-white px-4 py-3',
          'ring-1 outline-none transition',
          'placeholder:text-sand-400',
          error
            ? 'ring-red-400 focus:ring-2 focus:ring-red-500'
            : 'ring-sand-300 focus:ring-2 focus:ring-brand-500',
        ].join(' ')}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-sand-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
