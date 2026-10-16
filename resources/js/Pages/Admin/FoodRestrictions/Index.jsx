import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
export default function Index({ foodRestrictions }) {
    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800">Food Restrictions</h2>}>
            <Head title="Food Restrictions" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm sm:rounded-lg">
                <Link href={route('admin.food_restrictions.create')} className="bg-blue-500 text-white px-4 py-2 rounded mb-4 inline-block">New Restriction</Link>
                <table className="w-full text-left border-collapse"><thead><tr><th className="border-b p-2">Text (BN)</th><th className="border-b p-2">Default?</th><th className="border-b p-2">Actions</th></tr></thead>
                <tbody>{foodRestrictions.data.map(a => (<tr key={a.id}><td className="border-b p-2">{a.text_bn}</td><td className="border-b p-2">{a.is_default?'Yes':'No'}</td><td className="border-b p-2 space-x-2"><Link href={route('admin.food_restrictions.edit', a.id)} className="text-blue-600">Edit</Link><Link href={route('admin.food_restrictions.destroy', a.id)} method="delete" as="button" onClick={(e) => { if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault(); }} className="text-red-600">Delete</Link></td></tr>))}</tbody></table>
            </div></div>
        </AuthenticatedLayout>
    );
}
