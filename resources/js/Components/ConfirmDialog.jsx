import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function ConfirmDialog({
    show,
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDanger,
    isDestructive,
    isLoading = false,
    onConfirm,
    onClose,
    onCancel,
}) {
    const isVisible = show ?? isOpen ?? false;
    const isDestructiveAction = isDanger ?? isDestructive ?? true;
    const handleClose = onClose ?? onCancel ?? (() => {});

    return (
        <Modal show={isVisible} onClose={handleClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-center gap-4">
                    <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                            isDestructiveAction ? 'bg-rose-100 text-rose-600' : 'bg-primary-100 text-primary-600'
                        }`}
                        aria-hidden="true"
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                        >
                            {isDestructiveAction ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                                />
                            )}
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-ink">
                            {title}
                        </h2>
                        <p className="mt-1 text-sm text-ink-muted">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={handleClose} disabled={isLoading}>
                        {cancelLabel}
                    </SecondaryButton>

                    {isDestructiveAction ? (
                        <DangerButton onClick={onConfirm} disabled={isLoading}>
                            {isLoading ? 'Processing...' : confirmLabel}
                        </DangerButton>
                    ) : (
                        <PrimaryButton onClick={onConfirm} disabled={isLoading}>
                            {isLoading ? 'Processing...' : confirmLabel}
                        </PrimaryButton>
                    )}
                </div>
            </div>
        </Modal>
    );
}

