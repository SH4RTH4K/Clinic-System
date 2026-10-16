import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';

export default function FormField({
    id,
    label,
    error,
    required = false,
    helpText,
    className = '',
    children,
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <div className="flex items-center justify-between">
                    <InputLabel htmlFor={id} value={label} />
                    {required && (
                        <span className="text-xs font-semibold text-rose-500" aria-hidden="true">
                            *
                        </span>
                    )}
                </div>
            )}

            {children}

            {helpText && !error && (
                <p className="text-xs text-ink-muted">{helpText}</p>
            )}

            <InputError message={error} className="mt-1 text-xs" />
        </div>
    );
}

