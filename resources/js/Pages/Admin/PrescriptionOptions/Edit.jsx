import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import PrescriptionConfigModal from '@/Components/PrescriptionConfigModal';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

export default function Edit({ config = {} }) {
    const [currentConfig, setCurrentConfig] = useState(config);

    return (
        <AuthenticatedLayout>
            <Head title="Prescription Options & Presets" />

            <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Prescription Options & Presets"
                    subtitle="Configure timing (খাওয়ার সময়), meal relation & dosage units, dilution instructions, and duration presets used in consultation visits."
                />

                <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
                    <PrescriptionConfigModal
                        inline={true}
                        initialConfig={currentConfig}
                        onConfigSaved={(updated) => setCurrentConfig(updated)}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

