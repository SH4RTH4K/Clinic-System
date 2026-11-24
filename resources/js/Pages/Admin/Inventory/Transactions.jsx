import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';

export default function Transactions({ transactions, filters = {} }) {
    const [selectedType, setSelectedType] = useState(filters.type || 'all');

    const handleTypeChange = (type) => {
        setSelectedType(type);
        router.get(
            route('admin.inventory.transactions'),
            {
                type: type !== 'all' ? type : undefined,
                batch_id: filters.batch_id || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const typeBadge = (type) => {
        switch (type) {
            case 'purchase':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Purchase</span>;
            case 'dispense':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800">Dispense</span>;
            case 'adjustment':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">Adjustment</span>;
            case 'return':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800">Return</span>;
            case 'wastage':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">Wastage</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-800">{type}</span>;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pharmacy Stock Ledger" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Pharmacy Stock Ledger & Movement History"
                    subtitle="Immutable chronological ledger of all medication purchases, prescription dispensations, inventory adjustments, returns, and write-offs."
                    actions={
                        <Link
                            href={route('admin.inventory.index')}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg shadow-xs transition"
                        >
                            Back to Inventory
                        </Link>
                    }
                />

                {/* Filter Pills */}
                <div className="flex bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex-wrap gap-1 text-xs">
                    {['all', 'purchase', 'dispense', 'adjustment', 'return', 'wastage'].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => handleTypeChange(t)}
                            className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[11px] transition ${
                                selectedType === t
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {t === 'all' ? 'All Movements' : t}
                        </button>
                    ))}
                </div>

                {/* Ledger Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-850 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="p-3.5">Date &amp; Time</th>
                                    <th className="p-3.5">Type</th>
                                    <th className="p-3.5">Item &amp; Batch #</th>
                                    <th className="p-3.5">Quantity Changed</th>
                                    <th className="p-3.5">Balance After</th>
                                    <th className="p-3.5">Prescription / Reference</th>
                                    <th className="p-3.5">Performed By</th>
                                    <th className="p-3.5">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {transactions.data && transactions.data.length > 0 ? (
                                    transactions.data.map((tx) => {
                                        const batch = tx.batch;
                                        const qty = Number(tx.quantity);
                                        const isNegative = qty < 0;

                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition">
                                                <td className="p-3.5 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                    {new Date(tx.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-3.5 whitespace-nowrap">
                                                    {typeBadge(tx.transaction_type)}
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {batch?.item_name || 'Item'}
                                                    </div>
                                                    <div className="font-mono text-[11px] text-gray-500">
                                                        Batch: {batch?.batch_number || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="p-3.5 font-bold whitespace-nowrap">
                                                    <span className={isNegative ? 'text-rose-600' : 'text-emerald-600'}>
                                                        {qty > 0 ? `+${qty}` : qty} {batch?.unit || 'unit'}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                                    {Number(tx.balance_after).toLocaleString()} {batch?.unit || 'unit'}
                                                </td>
                                                <td className="p-3.5">
                                                    {tx.visit ? (
                                                        <Link
                                                            href={route('admin.visits.show', tx.visit.id)}
                                                            className="text-teal-600 hover:text-teal-700 font-mono font-medium"
                                                        >
                                                            Visit #{tx.visit.id} ({tx.visit.patient?.name || 'Patient'})
                                                        </Link>
                                                    ) : (
                                                        <span className="font-mono text-gray-500">
                                                            {tx.reference_number || '—'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {tx.performed_by?.name || 'System / Auto'}
                                                </td>
                                                <td className="p-3.5 text-gray-500 max-w-xs truncate" title={tx.notes}>
                                                    {tx.notes || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="p-8 text-center text-xs text-gray-400">
                                            No stock transactions recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <Pagination links={transactions.links} />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
