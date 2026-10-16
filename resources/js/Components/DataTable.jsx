export default function DataTable({
    columns = [],
    data = [],
    keyExtractor = (item, index) => item?.id ?? index,
    isLoading = false,
    emptyMessage = 'No records found.',
    className = '',
}) {
    // Normalize data: support raw arrays, Laravel paginators ({ data: [...] }), or fallback to []
    const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
            ? data.data
            : [];

    const getHeader = (col) => col.header ?? col.label ?? '';
    const getColumnKey = (col, index) => col.key ?? col.accessor ?? index;

    const renderCell = (item, col, rowIndex) => {
        if (typeof col.cell === 'function') {
            return col.cell(item, rowIndex);
        }
        if (typeof col.render === 'function') {
            return col.render(item, rowIndex);
        }
        const key = col.accessor ?? col.key;
        if (typeof key === 'string' && key.includes('.')) {
            const nested = key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), item);
            return nested ?? '—';
        }
        if (key && item) {
            const val = item[key];
            if (val === null || val === undefined || val === '') return '—';
            if (typeof val === 'boolean') return val ? 'Yes' : 'No';
            return val;
        }
        return null;
    };

    return (
        <div className={`overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50/75">
                    <tr>
                        {columns.map((col, index) => (
                            <th
                                key={getColumnKey(col, index)}
                                scope="col"
                                className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-muted ${
                                    col.className ?? ''
                                }`}
                            >
                                {getHeader(col)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {isLoading ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-12 text-center text-sm text-ink-muted"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg
                                        className="h-5 w-5 animate-spin text-primary-500"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8H4z"
                                        />
                                    </svg>
                                    <span>Loading records...</span>
                                </div>
                            </td>
                        </tr>
                    ) : rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-12 text-center text-sm text-ink-muted"
                            >
                                <div className="mx-auto flex max-w-xs flex-col items-center">
                                    <svg
                                        className="h-10 w-10 text-gray-300 mb-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                                        />
                                    </svg>
                                    <span className="font-medium text-gray-600">{emptyMessage}</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        rows.map((item, rowIndex) => (
                            <tr
                                key={keyExtractor(item, rowIndex)}
                                className="transition hover:bg-gray-50/60"
                            >
                                {columns.map((col, colIndex) => (
                                    <td
                                        key={getColumnKey(col, colIndex)}
                                        className={`px-4 py-3.5 text-ink ${col.className ?? ''}`}
                                    >
                                        {renderCell(item, col, rowIndex)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

