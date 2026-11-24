import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import usePermission from '@/Components/usePermission';

export default function Index({ batches, filters = {}, metrics = {} }) {
    const can = usePermission();
    const canCreate = can('inventory.create');
    const canUpdate = can('inventory.update');
    const canDelete = can('inventory.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');

    // Quick Stock Adjustment Modal State
    const [adjustingBatch, setAdjustingBatch] = useState(null);
    const {
        data: adjustData,
        setData: setAdjustData,
        post: postAdjust,
        processing: adjusting,
        errors: adjustErrors,
        reset: resetAdjust,
    } = useForm({
        new_quantity: '',
        transaction_type: 'adjustment',
        reason: '',
        reference_number: '',
    });

    const handleFilterChange = (newType, newStatus, newSearch) => {
        router.get(
            route('admin.inventory.index'),
            {
                type: newType !== 'all' ? newType : undefined,
                status: newStatus !== 'all' ? newStatus : undefined,
                search: newSearch || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        handleFilterChange(selectedType, selectedStatus, search);
    };

    const openAdjustModal = (batch) => {
        setAdjustingBatch(batch);
        setAdjustData({
            new_quantity: batch.current_quantity,
            transaction_type: 'adjustment',
            reason: '',
            reference_number: '',
        });
    };

    const closeAdjustModal = () => {
        setAdjustingBatch(null);
        resetAdjust();
    };

    const submitAdjust = (e) => {
        e.preventDefault();
        if (!adjustingBatch) return;

        postAdjust(route('admin.inventory.adjust', adjustingBatch.id), {
            preserveScroll: true,
            onSuccess: () => closeAdjustModal(),
        });
    };

    const handleDelete = (batchId, itemName) => {
        if (!confirm(`Are you sure you want to remove ${itemName} from inventory?`)) {
            return;
        }
        router.delete(route('admin.inventory.destroy', batchId), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pharmacy Inventory & Stock Control" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Dual Pharmacy Inventory & Stock Control"
                    subtitle="Track Homeopathic potencies, dilutions, mother tinctures, and conventional pharmaceuticals with batch tracking and expiry alerts."
                    actions={
                        <div className="flex items-center space-x-2">
                            <Link
                                href={route('admin.inventory.transactions')}
                                className="inline-flex items-center px-3.5 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg shadow-xs transition"
                            >
                                <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Stock Ledger
                            </Link>
                            {canCreate && (
                                <Link
                                    href={route('admin.inventory.create')}
                                    className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                                >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    + Receive New Stock
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Metrics Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Total Active Batches */}
                    <div
                        onClick={() => {
                            setSelectedStatus('all');
                            handleFilterChange(selectedType, 'all', search);
                        }}
                        className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs cursor-pointer hover:border-teal-500 transition"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Batches</span>
                            <span className="p-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                            {metrics.total_batches || 0}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                            {metrics.remedy_batches || 0} Homeo • {metrics.pharmaceutical_batches || 0} Pharma
                        </div>
                    </div>

                    {/* Low Stock Alert */}
                    <div
                        onClick={() => {
                            const newSt = selectedStatus === 'low_stock' ? 'all' : 'low_stock';
                            setSelectedStatus(newSt);
                            handleFilterChange(selectedType, newSt, search);
                        }}
                        className={`bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-xs cursor-pointer transition ${
                            selectedStatus === 'low_stock'
                                ? 'border-amber-500 ring-2 ring-amber-400/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-amber-400'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Low Stock</span>
                            <span className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                        </div>
                        <div className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-2">
                            {metrics.low_stock_count || 0}
                        </div>
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                            At or below reorder level
                        </div>
                    </div>

                    {/* Expiring Soon (30d) */}
                    <div
                        onClick={() => {
                            const newSt = selectedStatus === 'expiring' ? 'all' : 'expiring';
                            setSelectedStatus(newSt);
                            handleFilterChange(selectedType, newSt, search);
                        }}
                        className={`bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-xs cursor-pointer transition ${
                            selectedStatus === 'expiring'
                                ? 'border-orange-500 ring-2 ring-orange-400/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-orange-400'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Expiring &le; 30d</span>
                            <span className="p-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <div className="text-xl font-bold text-orange-800 dark:text-orange-300 mt-2">
                            {metrics.expiring_count || 0}
                        </div>
                        <div className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
                            Requires rotation/sale
                        </div>
                    </div>

                    {/* Expired Stock */}
                    <div
                        onClick={() => {
                            const newSt = selectedStatus === 'expired' ? 'all' : 'expired';
                            setSelectedStatus(newSt);
                            handleFilterChange(selectedType, newSt, search);
                        }}
                        className={`bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-xs cursor-pointer transition ${
                            selectedStatus === 'expired'
                                ? 'border-red-500 ring-2 ring-red-400/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-red-400'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-red-700 dark:text-red-400">Expired</span>
                            <span className="p-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </span>
                        </div>
                        <div className="text-xl font-bold text-red-800 dark:text-red-300 mt-2">
                            {metrics.expired_count || 0}
                        </div>
                        <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                            Do not dispense / discard
                        </div>
                    </div>

                    {/* Stock Valuation */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Stock Valuation</span>
                            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">
                            ৳{metrics.total_selling_value?.toLocaleString() || '0.00'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                            Cost: ৳{metrics.total_purchase_value?.toLocaleString() || '0.00'}
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Item Type Tabs */}
                    <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg text-xs font-semibold w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedType('all');
                                handleFilterChange('all', selectedStatus, search);
                            }}
                            className={`px-3 py-1.5 rounded-md transition ${
                                selectedType === 'all'
                                    ? 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 shadow-xs'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            All Items
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedType('remedy');
                                handleFilterChange('remedy', selectedStatus, search);
                            }}
                            className={`px-3 py-1.5 rounded-md transition ${
                                selectedType === 'remedy'
                                    ? 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 shadow-xs'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            Homeopathy Remedies
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedType('pharmaceutical');
                                handleFilterChange('pharmaceutical', selectedStatus, search);
                            }}
                            className={`px-3 py-1.5 rounded-md transition ${
                                selectedType === 'pharmaceutical'
                                    ? 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 shadow-xs'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            Conventional Pharma
                        </button>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-80">
                        <div className="relative w-full">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search remedy, brand, batch #..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs focus:border-teal-500 focus:ring-teal-500"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button
                            type="submit"
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Batches Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-850 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="p-3.5">Medicine / Item</th>
                                    <th className="p-3.5">Type</th>
                                    <th className="p-3.5">Batch # / Supplier</th>
                                    <th className="p-3.5">Stock Quantity</th>
                                    <th className="p-3.5">Expiry Date</th>
                                    <th className="p-3.5">Prices (Buy / Sell)</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {batches.data && batches.data.length > 0 ? (
                                    batches.data.map((b) => {
                                        const isLow = b.is_low_stock;
                                        const isExp = b.is_expired;
                                        const isSoon = b.is_expiring_soon;

                                        return (
                                            <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition">
                                                {/* Item Title */}
                                                <td className="p-3.5">
                                                    <div className="font-bold text-gray-900 dark:text-white text-sm">
                                                        {b.item_name}
                                                    </div>
                                                    {b.item_type === 'pharmaceutical' && b.pharmaceutical && (
                                                        <div className="text-[11px] text-gray-500">
                                                            Generic: {b.pharmaceutical.generic_name}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Type Badge */}
                                                <td className="p-3.5">
                                                    {b.item_type === 'remedy' ? (
                                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                            Homeopathy
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                                                            Allopathy
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Batch & Supplier */}
                                                <td className="p-3.5">
                                                    <div className="font-mono font-bold text-gray-800 dark:text-gray-200">
                                                        {b.batch_number}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">
                                                        {b.supplier_name || 'No supplier noted'}
                                                    </div>
                                                </td>

                                                {/* Stock Level */}
                                                <td className="p-3.5">
                                                    <div className="flex items-center space-x-2">
                                                        <span
                                                            className={`font-bold text-sm ${
                                                                b.current_quantity <= 0
                                                                    ? 'text-red-600'
                                                                    : isLow
                                                                    ? 'text-amber-600'
                                                                    : 'text-gray-900 dark:text-white'
                                                            }`}
                                                        >
                                                            {Number(b.current_quantity).toLocaleString()}{' '}
                                                            <span className="text-xs font-normal text-gray-500">{b.unit}</span>
                                                        </span>
                                                        {isLow && (
                                                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold uppercase">
                                                                Low
                                                            </span>
                                                        )}
                                                        {b.current_quantity <= 0 && (
                                                            <span className="text-[10px] px-1.5 py-0.2 bg-red-100 text-red-800 rounded font-bold uppercase">
                                                                Out
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                                        Reorder at: {b.reorder_level} {b.unit}
                                                    </div>
                                                </td>

                                                {/* Expiry Date */}
                                                <td className="p-3.5">
                                                    {b.expiry_date ? (
                                                        <div>
                                                            <div className="font-mono text-xs text-gray-800 dark:text-gray-200">
                                                                {new Date(b.expiry_date).toLocaleDateString()}
                                                            </div>
                                                            {isExp ? (
                                                                <span className="inline-block mt-0.5 text-[10px] font-bold text-red-600">
                                                                    Expired
                                                                </span>
                                                            ) : isSoon ? (
                                                                <span className="inline-block mt-0.5 text-[10px] font-bold text-orange-600">
                                                                    Exp. in {b.days_until_expiry}d
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400">
                                                                    {b.days_until_expiry} days remaining
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* Prices */}
                                                <td className="p-3.5">
                                                    <div className="font-semibold text-gray-900 dark:text-white">
                                                        Sell: ৳{b.selling_price}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400">
                                                        Cost: ৳{b.purchase_price}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                                                    {canUpdate && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openAdjustModal(b)}
                                                            className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition"
                                                            title="Adjust Stock Quantity"
                                                        >
                                                            Adjust Stock
                                                        </button>
                                                    )}
                                                    {canUpdate && (
                                                        <Link
                                                            href={route('admin.inventory.edit', b.id)}
                                                            className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                                                        >
                                                            Edit
                                                        </Link>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(b.id, b.item_name)}
                                                            className="p-1 text-gray-400 hover:text-red-600 transition"
                                                            title="Delete Batch"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-xs text-gray-400">
                                            No medicine batches match your filter criteria. Click "+ Receive New Stock" to add inventory.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {batches.links && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <Pagination links={batches.links} />
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stock Adjustment Modal */}
            {adjustingBatch && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Stock Adjustment
                                </h3>
                                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                                    {adjustingBatch.item_name} (Batch: {adjustingBatch.batch_number})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeAdjustModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={submitAdjust} className="p-5 space-y-4 text-xs">
                            <div className="bg-gray-50 dark:bg-gray-850 p-3 rounded-lg flex justify-between items-center text-xs">
                                <span className="text-gray-500">Current Recorded Stock:</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {adjustingBatch.current_quantity} {adjustingBatch.unit}
                                </span>
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                                    New Quantity On-Hand <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={adjustData.new_quantity}
                                        onChange={(e) => setAdjustData('new_quantity', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <span className="inline-flex items-center px-3 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-lg font-medium">
                                        {adjustingBatch.unit}
                                    </span>
                                </div>
                                {adjustErrors.new_quantity && <p className="mt-1 text-red-600">{adjustErrors.new_quantity}</p>}
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                                    Adjustment Reason / Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={adjustData.transaction_type}
                                    onChange={(e) => setAdjustData('transaction_type', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                >
                                    <option value="adjustment">Stock Reconciliation / Count Correction</option>
                                    <option value="purchase">Additional Stock Received</option>
                                    <option value="wastage">Damage / Spillage / Expired Discard</option>
                                    <option value="return">Customer Return / Restock</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                                    Notes &amp; Justification <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows="2"
                                    required
                                    value={adjustData.reason}
                                    onChange={(e) => setAdjustData('reason', e.target.value)}
                                    placeholder="Explain the reason for adjustment (e.g. Physical inventory count, bottle broken)"
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                                {adjustErrors.reason && <p className="mt-1 text-red-600">{adjustErrors.reason}</p>}
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={closeAdjustModal}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjusting}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition"
                                >
                                    {adjusting ? 'Saving...' : 'Confirm Adjustment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
