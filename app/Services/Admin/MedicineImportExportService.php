<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Models\Medicine;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedicineImportExportService
{
    private const MAX_IMPORT_ROWS = 5000;

    /**
     * Export medicines matching request filters to streamed CSV.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $query = Medicine::query()
            ->withSum(['batches as total_stock' => function ($q): void {
                $q->active();
            }], 'current_quantity')
            ->withCount(['batches as active_batches_count' => function ($q): void {
                $q->active();
            }]);

        if ($search = $request->input('search')) {
            $query->search((string) $search);
        }

        if ($request->filled('scale') && $request->input('scale') !== 'all') {
            $query->scale((string) $request->input('scale'));
        }

        if ($request->filled('form') && $request->input('form') !== 'all') {
            $query->where('form', (string) $request->input('form'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('is_active', $request->input('status') === 'active');
        }

        $medicines = $query->orderBy('name')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="homeopathic-medicines-catalog-'.now()->format('Y-m-d').'.csv"',
        ];

        return response()->stream(function () use ($medicines): void {
            $file = fopen('php://output', 'wb');
            if ($file === false) {
                return;
            }

            // UTF-8 BOM for Microsoft Excel compatibility
            fwrite($file, "\xEF\xBB\xBF");

            fputcsv($file, [
                'Name',
                'Potency',
                'Form',
                'Default Instruction',
                'Is Active',
                'Stock Qty',
                'Physical Batch Stock (Ref)',
            ]);

            foreach ($medicines as $m) {
                fputcsv($file, [
                    $m->name,
                    $m->potency,
                    $m->form,
                    $m->default_instruction ?? '',
                    $m->is_active ? '1' : '0',
                    $m->stock_qty ?? 0,
                    (float) ($m->total_stock ?? 0),
                ]);
            }

            fclose($file);
        }, 200, $headers);
    }

    /**
     * Export template CSV with sample homeopathic remedies and instructions.
     */
    public function downloadTemplate(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="medicines-import-template.csv"',
        ];

        return response()->stream(function (): void {
            $file = fopen('php://output', 'wb');
            if ($file === false) {
                return;
            }

            fwrite($file, "\xEF\xBB\xBF");

            fputcsv($file, [
                'Name',
                'Potency',
                'Form',
                'Default Instruction',
                'Is Active',
                'Stock Qty',
            ]);

            $samples = [
                ['Arnica Montana', '30C', 'drops', '৫ ফোটা করে দিনে ৩ বার খাবার আধা ঘন্টা আগে', '1', '10'],
                ['Thuja Occidentalis', '200C', 'pills', '৪টি করে গ্লোবিউলস সকালে খালি পেটে', '1', '15'],
                ['Aconitum Napellus', '1M', 'liquid', '৩ ফোটা জিহ্বায় সরাসরি সকাল ও রাতে', '1', '5'],
                ['Nux Vomica', '30C', 'drops', '৫ ফোটা রাতে ঘুমানোর পূর্বে', '1', '20'],
                ['Bryonia Alba', '200C', 'drops', '৫ ফোটা দিনে ২ বার কুসুম গরম পানির সাথে', '1', '8'],
                ['Sulphur', '0/1', 'pills', '৪টি করে বড়ি প্রতি সকালে ১ বার', '1', '12'],
                ['Calendula Officinalis', 'Q', 'liquid', 'বাহ্যিক প্রয়োগ অথবা ১০ ফোটা পানির সাথে', '1', '25'],
            ];

            foreach ($samples as $sample) {
                fputcsv($file, $sample);
            }

            fclose($file);
        }, 200, $headers);
    }

    /**
     * Import medicines from an uploaded CSV or JSON file with duplicate avoidance strategy.
     *
     * @return array{total_rows: int, created: int, updated: int, skipped: int, errors: array<int, string>}
     */
    public function import(UploadedFile $file, string $duplicateStrategy = 'skip'): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $isJson = in_array($extension, ['json'], true);

        $parsedRows = $isJson
            ? $this->parseJson($file)
            : $this->parseCsv($file);

        if (count($parsedRows) > self::MAX_IMPORT_ROWS) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'The file exceeds the maximum limit of '.self::MAX_IMPORT_ROWS.' records per import.',
            ]);
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        // Preload existing medicines mapped by unique signature: mb_strtolower(name)|mb_strtolower(potency)
        /** @var Collection<string, Medicine> $existingCatalog */
        $existingCatalog = Medicine::query()
            ->get()
            ->keyBy(fn (Medicine $m): string => $this->makeKey($m->name, $m->potency));

        DB::transaction(function () use ($parsedRows, $duplicateStrategy, &$created, &$updated, &$skipped, &$errors, $existingCatalog): void {
            foreach ($parsedRows as $index => $row) {
                $lineNumber = $index + 2; // +1 for header, +1 for 1-based index

                $name = trim((string) ($row['name'] ?? ''));
                $potency = trim((string) ($row['potency'] ?? ''));

                if ($name === '' || $potency === '') {
                    $errors[] = "Row {$lineNumber}: Remedy Name and Potency are required fields.";

                    continue;
                }

                $form = $this->normalizeForm((string) ($row['form'] ?? 'drops'));
                $defaultInstruction = isset($row['default_instruction']) && trim((string) $row['default_instruction']) !== ''
                    ? trim((string) $row['default_instruction'])
                    : null;
                $isActive = $this->normalizeBoolean($row['is_active'] ?? true);
                $stockQty = isset($row['stock_qty']) && is_numeric($row['stock_qty'])
                    ? max(0, (int) $row['stock_qty'])
                    : null;

                $key = $this->makeKey($name, $potency);

                if ($existingCatalog->has($key)) {
                    $existing = $existingCatalog->get($key);

                    if ($duplicateStrategy === 'skip') {
                        $skipped++;

                        continue;
                    }

                    if ($duplicateStrategy === 'update') {
                        $updateData = [
                            'form' => $form,
                            'default_instruction' => $defaultInstruction ?? $existing->default_instruction,
                            'is_active' => $isActive,
                        ];

                        if ($stockQty !== null) {
                            $updateData['stock_qty'] = $stockQty;
                        }

                        $existing->update($updateData);
                        $updated++;

                        continue;
                    }

                    // duplicateStrategy === 'append'
                }

                // Create new record
                $medicine = Medicine::create([
                    'name' => $name,
                    'potency' => $potency,
                    'form' => $form,
                    'default_instruction' => $defaultInstruction,
                    'is_active' => $isActive,
                    'stock_qty' => $stockQty ?? 0,
                ]);

                $existingCatalog->put($key, $medicine);
                $created++;
            }
        });

        return [
            'total_rows' => count($parsedRows),
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Parse uploaded CSV file with BOM and header normalization.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseCsv(UploadedFile $file): array
    {
        $content = file_get_contents($file->getRealPath());
        if ($content === false) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'Could not read the uploaded CSV file.',
            ]);
        }

        // Strip UTF-8 BOM if present
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content) ?? $content;

        $stream = fopen('php://temp', 'r+');
        if ($stream === false) {
            throw new \RuntimeException('Failed to allocate temporary memory stream for CSV parsing.');
        }

        fwrite($stream, $content);
        rewind($stream);

        // Detect delimiter (comma, semicolon, tab)
        $firstLine = fgets($stream);
        rewind($stream);

        $delimiter = ',';
        if ($firstLine !== false) {
            $semicolonCount = substr_count($firstLine, ';');
            $commaCount = substr_count($firstLine, ',');
            $tabCount = substr_count($firstLine, "\t");

            if ($semicolonCount > $commaCount && $semicolonCount > $tabCount) {
                $delimiter = ';';
            } elseif ($tabCount > $commaCount && $tabCount > $semicolonCount) {
                $delimiter = "\t";
            }
        }

        $rawHeader = fgetcsv($stream, 0, $delimiter);
        if (! is_array($rawHeader) || empty($rawHeader)) {
            fclose($stream);
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'The uploaded CSV file is empty or missing headers.',
            ]);
        }

        $normalizedHeaderMap = $this->normalizeHeaders($rawHeader);

        if (! isset($normalizedHeaderMap['name']) || ! isset($normalizedHeaderMap['potency'])) {
            fclose($stream);
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'CSV file must include columns for Remedy Name ("name") and Potency ("potency").',
            ]);
        }

        $rows = [];
        while (($csvRow = fgetcsv($stream, 0, $delimiter)) !== false) {
            if ($csvRow === [null] || (count($csvRow) === 1 && trim((string) $csvRow[0]) === '')) {
                continue;
            }

            $mappedRow = [];
            foreach ($normalizedHeaderMap as $key => $colIndex) {
                $mappedRow[$key] = isset($csvRow[$colIndex]) ? trim((string) $csvRow[$colIndex]) : '';
            }

            if (! empty($mappedRow['name']) || ! empty($mappedRow['potency'])) {
                $rows[] = $mappedRow;
            }
        }

        fclose($stream);

        return $rows;
    }

    /**
     * Parse uploaded JSON file.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseJson(UploadedFile $file): array
    {
        $content = file_get_contents($file->getRealPath());
        if ($content === false) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'Could not read the uploaded JSON file.',
            ]);
        }

        $decoded = json_decode($content, true);
        if (! is_array($decoded)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'The uploaded file is not a valid JSON array.',
            ]);
        }

        // If wrapped in a top-level key like {"medicines": [...]} or {"data": [...]}
        if (isset($decoded['medicines']) && is_array($decoded['medicines'])) {
            $decoded = $decoded['medicines'];
        } elseif (isset($decoded['data']) && is_array($decoded['data'])) {
            $decoded = $decoded['data'];
        }

        $rows = [];
        foreach ($decoded as $item) {
            if (! is_array($item)) {
                continue;
            }

            $rows[] = [
                'name' => $item['name'] ?? $item['remedy_name'] ?? $item['remedy'] ?? '',
                'potency' => $item['potency'] ?? $item['power'] ?? '',
                'form' => $item['form'] ?? $item['formulation'] ?? 'drops',
                'default_instruction' => $item['default_instruction'] ?? $item['instruction'] ?? null,
                'is_active' => $item['is_active'] ?? $item['status'] ?? true,
                'stock_qty' => $item['stock_qty'] ?? $item['quantity'] ?? null,
            ];
        }

        return $rows;
    }

    /**
     * Normalize header row into standard internal keys.
     *
     * @param  array<int, string|null>  $header
     * @return array<string, int>
     */
    private function normalizeHeaders(array $header): array
    {
        $map = [];

        foreach ($header as $index => $column) {
            if ($column === null) {
                continue;
            }

            $clean = strtolower(trim((string) $column));
            $clean = str_replace(['_', '-', ' '], '', $clean);

            if (in_array($clean, ['name', 'remedyname', 'remedy', 'medicinename', 'medicine'], true)) {
                $map['name'] = $index;
            } elseif (in_array($clean, ['potency', 'power', 'scale'], true)) {
                $map['potency'] = $index;
            } elseif (in_array($clean, ['form', 'formulation', 'type'], true)) {
                $map['form'] = $index;
            } elseif (in_array($clean, ['defaultinstruction', 'instruction', 'instructions', 'dosage', 'direction'], true)) {
                $map['default_instruction'] = $index;
            } elseif (in_array($clean, ['isactive', 'active', 'status'], true)) {
                $map['is_active'] = $index;
            } elseif (in_array($clean, ['stockqty', 'stock', 'quantity', 'qty'], true)) {
                $map['stock_qty'] = $index;
            }
        }

        return $map;
    }

    /**
     * Normalize form input to allowed enum values: 'drops', 'pills', 'liquid'.
     */
    private function normalizeForm(string $rawForm): string
    {
        $cleaned = mb_strtolower(trim($rawForm));

        if (in_array($cleaned, ['pills', 'pill', 'globules', 'globule', 'বড়ি', 'পিল', 'ট্যাবলেট', 'tablets', 'tablet', 'tab'], true)) {
            return 'pills';
        }

        if (in_array($cleaned, ['liquid', 'dilution', 'লিকুইড', 'liq', 'mother tincture', 'tincture', 'q', 'mt', 'ø'], true)) {
            return 'liquid';
        }

        return 'drops';
    }

    /**
     * Normalize boolean active status.
     */
    private function normalizeBoolean(mixed $val): bool
    {
        if (is_bool($val)) {
            return $val;
        }

        $str = strtolower(trim((string) $val));

        return in_array($str, ['1', 'true', 'yes', 'active', 'y'], true);
    }

    /**
     * Generate lookup key for remedy identification.
     */
    private function makeKey(string $name, string $potency): string
    {
        return mb_strtolower(trim($name)).'|'.mb_strtolower(trim($potency));
    }
}
