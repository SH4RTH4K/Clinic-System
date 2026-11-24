import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function Print({ invoice, clinic = {}, mode: initialMode = 'standard' }) {
    const [mode, setMode] = useState(initialMode);

    const consultationItem = invoice.items?.find((i) => i.item_type === 'consultation');
    const consultationDoctor = consultationItem?.notes?.startsWith('Doctor:')
        ? consultationItem.notes.replace('Doctor: ', '')
        : (consultationItem?.item_name?.includes('(') ? consultationItem.item_name.match(/\((.*?)\)/)?.[1] : null);
    const doctorDisplayName = invoice.visit?.doctor?.name || consultationDoctor || 'Clinic Desk';

    return (
        <div className="min-h-screen bg-slate-100 py-6 text-gray-900 print:bg-white print:py-0 print:text-black">
            <Head title={`Print Invoice #${invoice.invoice_number}`} />

            {/* Floating Top Action Toolbar (Hidden in print) */}
            <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('admin.invoices.show', invoice.id)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                        ← Back to Invoice
                    </Link>
                    <span className="text-xs font-mono font-bold text-gray-600">
                        {invoice.invoice_number}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                        <button
                            type="button"
                            onClick={() => setMode('standard')}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                mode === 'standard' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Standard A4/A5
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('thermal_pos')}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                mode === 'thermal_pos' ? 'bg-white shadow-2xs text-emerald-800' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Thermal 80mm
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                        <span>🖨️</span> Print Receipt
                    </button>
                </div>
            </div>

            {/* Document Content */}
            {mode === 'standard' ? (
                /* Standard A4 / A5 Medical Invoice Layout */
                <div className="mx-auto max-w-3xl rounded-xl border border-gray-300 bg-white p-8 shadow-sm print:max-w-none print:border-none print:p-0 print:shadow-none">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b pb-6">
                        <div className="flex items-center gap-4">
                            {clinic.logo_url && (
                                <img src={clinic.logo_url} alt="Clinic Logo" className="h-14 w-auto object-contain" />
                            )}
                            <div>
                                <h1 className="text-xl font-black text-gray-950 uppercase tracking-tight">{clinic.name}</h1>
                                {clinic.name_bn && <p className="text-sm font-semibold text-gray-600">{clinic.name_bn}</p>}
                                <p className="text-xs text-gray-600 mt-1">{clinic.address}</p>
                                <p className="text-xs text-gray-600">Phone: {clinic.phone}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="inline-block rounded-md bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-extrabold uppercase text-emerald-800 tracking-wider">
                                Invoice &amp; Receipt
                            </span>
                            <p className="mt-2 text-sm font-mono font-bold text-gray-900">{invoice.invoice_number}</p>
                            <p className="text-xs text-gray-600">Date: {invoice.invoice_date}</p>
                            <p className="text-[11px] font-semibold text-emerald-700 capitalize">Status: {invoice.status.replace('_', ' ')}</p>
                        </div>
                    </div>

                    {/* Patient & Doctor Sub-Header */}
                    <div className="grid grid-cols-2 gap-4 py-4 border-b text-xs text-gray-700">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-gray-400 block mb-0.5">Patient Details</span>
                            <p className="text-sm font-bold text-gray-900">{invoice.patient?.name || 'Walk-in Patient'}</p>
                            <p>Patient ID: <span className="font-mono font-semibold">{invoice.patient?.patient_code || invoice.patient?.id}</span></p>
                            <p>Phone: {invoice.patient?.phone || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-gray-400 block mb-0.5">Clinical Reference</span>
                            <p className="text-sm font-bold text-gray-900">
                                Doctor: {doctorDisplayName}
                            </p>
                            {invoice.visit_id && <p>Visit ID: #{invoice.visit_id}</p>}
                            <p>Cashier: {invoice.created_by?.name || 'Staff'}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="py-4">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-900 text-gray-900 font-bold uppercase">
                                    <th className="py-2 w-8">#</th>
                                    <th className="py-2">Item / Service Description</th>
                                    <th className="py-2 w-20 text-center">Category</th>
                                    <th className="py-2 w-16 text-right">Qty</th>
                                    <th className="py-2 w-24 text-right">Rate (৳)</th>
                                    <th className="py-2 w-28 text-right">Total (৳)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {invoice.items?.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="py-2 text-gray-500 font-mono">{idx + 1}</td>
                                        <td className="py-2 font-semibold text-gray-900">{item.item_name}</td>
                                        <td className="py-2 text-center text-[10px] font-semibold text-gray-600 uppercase">{item.item_type}</td>
                                        <td className="py-2 text-right">{Number(item.quantity)}</td>
                                        <td className="py-2 text-right font-mono">৳{Number(item.unit_price).toFixed(2)}</td>
                                        <td className="py-2 text-right font-bold text-gray-900 font-mono">৳{Number(item.total_price).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Total & Summary Block */}
                    <div className="flex items-start justify-between border-t-2 border-gray-900 pt-4 text-xs">
                        <div className="max-w-xs space-y-2">
                            {invoice.notes && (
                                <p className="italic text-gray-600">Note: {invoice.notes}</p>
                            )}
                            {invoice.payments?.length > 0 && (
                                <div className="rounded-lg bg-gray-50 p-2 text-[11px] border">
                                    <span className="font-bold text-gray-700 block mb-1">Payment Received:</span>
                                    {invoice.payments.map((p) => (
                                        <div key={p.id} className="flex justify-between text-gray-600">
                                            <span className="capitalize">{p.payment_method} ({p.payment_date})</span>
                                            <span className="font-bold font-mono">৳{Number(p.amount).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-64 space-y-1.5 font-mono">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span>৳{Number(invoice.subtotal).toFixed(2)}</span>
                            </div>
                            {Number(invoice.discount_amount) > 0 && (
                                <div className="flex justify-between text-rose-700">
                                    <span>Discount:</span>
                                    <span>-৳{Number(invoice.discount_amount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t pt-1 flex justify-between font-bold text-gray-950 text-sm">
                                <span>Total Payable:</span>
                                <span>৳{Number(invoice.total_amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-emerald-800">
                                <span>Paid Amount:</span>
                                <span>৳{Number(invoice.paid_amount).toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-1 flex justify-between font-extrabold text-sm">
                                <span>Due Balance:</span>
                                <span>৳{Number(invoice.due_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="mt-12 pt-6 border-t flex items-end justify-between text-xs text-gray-500">
                        <div>
                            <p className="font-semibold text-gray-700">{clinic.footer_note}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Generated electronically by RemediQ Clinic System</p>
                        </div>
                        <div className="text-center w-40">
                            <div className="border-b border-gray-400 pb-1 mb-1 font-semibold text-gray-800">
                                Authorized Signature
                            </div>
                            <span className="text-[10px] text-gray-400">Cashier / Staff</span>
                        </div>
                    </div>
                </div>
            ) : (
                /* Thermal 80mm POS Slip Receipt Layout */
                <div className="mx-auto w-[80mm] max-w-[80mm] bg-white p-4 text-[11px] font-mono leading-tight shadow-sm print:m-0 print:w-[80mm] print:p-0 print:shadow-none">
                    <div className="text-center space-y-1">
                        <h2 className="text-sm font-black uppercase text-black">{clinic.name}</h2>
                        {clinic.name_bn && <p className="text-[10px]">{clinic.name_bn}</p>}
                        <p className="text-[10px]">{clinic.address}</p>
                        <p className="text-[10px]">Tel: {clinic.phone}</p>
                        <p className="text-[10px] tracking-wider mt-1">================================</p>
                        <p className="text-xs font-bold uppercase">MONEY RECEIPT</p>
                        <p className="text-[10px] tracking-wider">================================</p>
                    </div>

                    {/* Receipt Metadata */}
                    <div className="my-2 space-y-0.5 text-[10px]">
                        <div className="flex justify-between">
                            <span>Receipt #:</span>
                            <span className="font-bold">{invoice.invoice_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Date:</span>
                            <span>{invoice.invoice_date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Patient:</span>
                            <span className="font-bold">{invoice.patient?.name || 'Walk-in'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Patient ID:</span>
                            <span>{invoice.patient?.patient_code || invoice.patient?.id}</span>
                        </div>
                        {doctorDisplayName && doctorDisplayName !== 'Clinic Desk' && (
                            <div className="flex justify-between">
                                <span>Doctor:</span>
                                <span className="font-bold">{doctorDisplayName}</span>
                            </div>
                        )}
                        <p className="tracking-wider">--------------------------------</p>
                    </div>

                    {/* Items Table */}
                    <div className="my-2 space-y-1">
                        <div className="flex justify-between font-bold text-[10px] uppercase">
                            <span>Item Description</span>
                            <span>Total</span>
                        </div>
                        <p className="tracking-wider">--------------------------------</p>
                        {invoice.items?.map((item, idx) => (
                            <div key={item.id} className="space-y-0.5">
                                <div className="font-semibold text-black">{idx + 1}. {item.item_name}</div>
                                <div className="flex justify-between text-[10px] text-gray-700 pl-2">
                                    <span>{Number(item.quantity)} x ৳{Number(item.unit_price).toFixed(2)}</span>
                                    <span className="font-bold">৳{Number(item.total_price).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                        <p className="tracking-wider">--------------------------------</p>
                    </div>

                    {/* Financials */}
                    <div className="space-y-1 text-right text-[11px] font-bold">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>৳{Number(invoice.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(invoice.discount_amount) > 0 && (
                            <div className="flex justify-between">
                                <span>Discount:</span>
                                <span>-৳{Number(invoice.discount_amount).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs font-black border-t border-b border-black py-0.5">
                            <span>TOTAL:</span>
                            <span>৳{Number(invoice.total_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Paid ({invoice.payments?.[0]?.payment_method || 'Cash'}):</span>
                            <span>৳{Number(invoice.paid_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span>Due Balance:</span>
                            <span>৳{Number(invoice.due_amount).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 text-center space-y-1 text-[10px]">
                        <p className="tracking-wider">================================</p>
                        <p className="font-bold">Thank you for visiting!</p>
                        <p className="text-[9px] text-gray-500">Please preserve this receipt for follow-up.</p>
                        <p className="text-[8px] text-gray-400 mt-2">RemediQ POS · Powered by Antigravity</p>
                    </div>
                </div>
            )}
        </div>
    );
}
