<?php

namespace App\Services\Admin;

use App\Models\Medicine;
use App\Models\Symptom;
use App\Models\SymptomMedicineMap;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SymptomMedicineMapCsvImportService
{
    private const MAX_ROWS = 1000;

    /** @return array{token: string, expires_at: string, rows: array<int, array<string, mixed>>, totals: array<string, int>} */
    public function prepare(UploadedFile $file, int $userId): array
    {
        $content = file_get_contents($file->getRealPath());
        if ($content === false || ! mb_check_encoding($content, 'UTF-8')) {
            throw ValidationException::withMessages(['csv_file' => 'The CSV must use valid UTF-8 encoding.']);
        }

        $stream = fopen('php://temp', 'r+');
        fwrite($stream, preg_replace('/^\xEF\xBB\xBF/', '', $content));
        rewind($stream);
        $header = fgetcsv($stream, null, ',', '"', '');
        if (! is_array($header)) {
            fclose($stream);
            throw ValidationException::withMessages(['csv_file' => 'The CSV is empty or has no header row.']);
        }

        $header = array_map(fn ($column): string => strtolower(trim((string) $column)), $header);
        if (in_array('', $header, true) || count($header) !== count(array_unique($header)) || array_diff(['symptom_name', 'medicine_name'], $header) !== []) {
            fclose($stream);
            throw ValidationException::withMessages(['csv_file' => 'CSV headers must include symptom_name and medicine_name. Priority, note, source_title, source_author, source_edition, source_page, and source_url are optional.']);
        }
        if (array_diff($header, ['symptom_name', 'medicine_name', 'priority', 'note', 'source_title', 'source_author', 'source_edition', 'source_page', 'source_url']) !== []) {
            fclose($stream);
            throw ValidationException::withMessages(['csv_file' => 'The CSV contains an unsupported column.']);
        }

        $columns = array_flip($header);
        $symptoms = Symptom::query()->get(['id', 'name_en', 'is_active'])->groupBy(fn (Symptom $item): string => mb_strtolower(trim($item->name_en)));
        $medicines = Medicine::query()->get(['id', 'name', 'is_active'])->groupBy(fn (Medicine $item): string => mb_strtolower(trim($item->name)));
        $existing = SymptomMedicineMap::query()->get()->groupBy(fn (SymptomMedicineMap $mapping): string => $mapping->symptom_id.':'.$mapping->medicine_id);
        $deleted = SymptomMedicineMap::onlyTrashed()->get()->groupBy(fn (SymptomMedicineMap $mapping): string => $mapping->symptom_id.':'.$mapping->medicine_id);
        $seen = [];
        $rows = [];
        $line = 1;

        while (($csvRow = fgetcsv($stream, null, ',', '"', '')) !== false) {
            $line++;
            if ($csvRow === [null] || (count($csvRow) === 1 && trim((string) $csvRow[0]) === '')) {
                continue;
            }
            if (count($rows) >= self::MAX_ROWS) {
                fclose($stream);
                throw ValidationException::withMessages(['csv_file' => 'A CSV may contain at most 1,000 data rows.']);
            }

            $data = [];
            foreach ($columns as $name => $index) {
                $data[$name] = isset($csvRow[$index]) ? trim((string) $csvRow[$index]) : '';
            }
            $preview = [
                'line' => $line,
                'symptom' => $data['symptom_name'] ?? '',
                'medicine' => $data['medicine_name'] ?? '',
                'priority' => $data['priority'] ?? '1',
                'status' => 'invalid',
                'message' => '',
                'action' => null,
            ];

            if (count($csvRow) !== count($header)) {
                $preview['message'] = 'Malformed row: values do not match the header columns.';
            } elseif ($preview['symptom'] === '' || $preview['medicine'] === '') {
                $preview['message'] = 'Symptom and medicine names are required.';
            } elseif (! preg_match('/^[1-9][0-9]{0,3}$/D', $preview['priority'])) {
                $preview['message'] = 'Priority must be a whole number from 1 to 9999.';
            } elseif (mb_strlen($data['note'] ?? '') > 5000) {
                $preview['message'] = 'Clinical note must be 5,000 characters or fewer.';
            } elseif (mb_strlen($data['source_title'] ?? '') > 255 || mb_strlen($data['source_author'] ?? '') > 255 || mb_strlen($data['source_edition'] ?? '') > 255 || mb_strlen($data['source_page'] ?? '') > 100) {
                $preview['message'] = 'Reference-source metadata exceeds the allowed field length.';
            } elseif (! empty($data['source_url']) && (mb_strlen($data['source_url']) > 2048 || filter_var($data['source_url'], FILTER_VALIDATE_URL) === false)) {
                $preview['message'] = 'Source URL must be a valid URL no longer than 2,048 characters.';
            } else {
                $symptomMatches = $symptoms->get(mb_strtolower($preview['symptom']), collect())->where('is_active', true);
                $medicineMatches = $medicines->get(mb_strtolower($preview['medicine']), collect())->where('is_active', true);
                if ($symptomMatches->count() !== 1) {
                    $preview['message'] = $symptomMatches->isEmpty() ? 'Active symptom reference not found.' : 'Symptom name matches multiple catalog records.';
                } elseif ($medicineMatches->count() !== 1) {
                    $preview['message'] = $medicineMatches->isEmpty() ? 'Active medicine reference not found.' : 'Medicine name matches multiple catalog records.';
                } else {
                    $symptom = $symptomMatches->first();
                    $medicine = $medicineMatches->first();
                    $pair = $symptom->id.':'.$medicine->id;
                    $preview['symptom'] = $symptom->name_en;
                    $preview['medicine'] = $medicine->name;
                    if (isset($seen[$pair])) {
                        $preview['status'] = 'duplicate';
                        $preview['message'] = 'This relationship already appears on CSV line '.$seen[$pair].'.';
                    } else {
                        $seen[$pair] = $line;
                        $activeMatches = $existing->get($pair, collect());
                        $deletedMatches = $deleted->get($pair, collect());
                        if ($activeMatches->count() > 1) {
                            $preview['status'] = 'duplicate';
                            $preview['message'] = 'Multiple active database mappings already exist for this relationship; resolve them before importing.';
                            $rows[] = $preview;

                            continue;
                        }
                        $mapping = $activeMatches->first();
                        $deletedMapping = $deletedMatches->sortByDesc('id')->first();
                        $preview['status'] = $mapping ? 'update' : 'new';
                        $preview['action'] = $mapping ? 'update' : ($deletedMapping ? 'restore' : 'create');
                        $preview['mapping_id'] = $mapping?->id ?? $deletedMapping?->id;
                        $preview['is_approved'] = (bool) ($mapping?->is_approved ?? false);
                        $approvedMapping = $mapping && ($mapping->review_status === 'approved' || $mapping->is_approved);
                        $preview['is_approved'] = (bool) $approvedMapping;
                        $preview['message'] = $approvedMapping
                            ? 'Approved mapping is protected and will be skipped.'
                            : ($mapping ? 'Unapproved mapping will be updated.' : ($deletedMapping ? 'Removed mapping will be restored as unapproved.' : 'New mapping will be imported as unapproved.'));
                        $preview['symptom_id'] = $symptom->id;
                        $preview['medicine_id'] = $medicine->id;
                        $preview['note'] = $data['note'] ?? '';
                        $preview['source_title'] = $data['source_title'] ?? '';
                        $preview['source_author'] = $data['source_author'] ?? '';
                        $preview['source_edition'] = $data['source_edition'] ?? '';
                        $preview['source_page'] = $data['source_page'] ?? '';
                        $preview['source_url'] = $data['source_url'] ?? '';
                    }
                }
            }
            $rows[] = $preview;
        }
        fclose($stream);

        $token = Str::random(64);
        $expiresAt = now()->addMinutes(30);
        $directory = $this->userDirectory($userId);
        foreach (Storage::disk('local')->files($directory) as $oldFile) {
            if (Storage::disk('local')->lastModified($oldFile) < now()->subMinutes(30)->timestamp) {
                Storage::disk('local')->delete($oldFile);
            }
        }
        $totals = [
            'valid' => count(array_filter($rows, fn (array $row): bool => in_array($row['status'], ['new', 'update'], true))),
            'invalid' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'invalid')),
            'duplicate' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'duplicate')),
            'new' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'new')),
            'update' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'update')),
            'protected' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'update' && $row['is_approved'])),
        ];
        Storage::disk('local')->put($directory.'/'.$token.'.json', json_encode([
            'user_id' => $userId,
            'expires_at' => $expiresAt->toIso8601String(),
            'rows' => $rows,
            'totals' => $totals,
        ], JSON_THROW_ON_ERROR));

        return [
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'rows' => $rows,
            'totals' => $totals,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function load(string $token, int $userId): array
    {
        return $this->loadPreview($token, $userId)['rows'];
    }

    /** @return array{user_id: int, expires_at: string, rows: array<int, array<string, mixed>>, totals: array<string, int>} */
    public function loadPreview(string $token, int $userId): array
    {
        if (! preg_match('/^[A-Za-z0-9]{64}$/D', $token)) {
            throw ValidationException::withMessages(['preview_token' => 'The import preview is invalid or expired. Upload the CSV again.']);
        }
        $path = $this->userDirectory($userId).'/'.$token.'.json';
        if (! Storage::disk('local')->exists($path)) {
            throw ValidationException::withMessages(['preview_token' => 'The import preview is invalid or expired. Upload the CSV again.']);
        }
        $preview = json_decode(Storage::disk('local')->get($path), true, flags: JSON_THROW_ON_ERROR);
        if (($preview['user_id'] ?? null) !== $userId || now()->greaterThan($preview['expires_at'] ?? now()->subSecond())) {
            Storage::disk('local')->delete($path);
            throw ValidationException::withMessages(['preview_token' => 'The import preview is invalid or expired. Upload the CSV again.']);
        }

        return $preview;
    }

    public function forget(string $token, int $userId): void
    {
        if (preg_match('/^[A-Za-z0-9]{64}$/D', $token)) {
            Storage::disk('local')->delete($this->userDirectory($userId).'/'.$token.'.json');
        }
    }

    private function userDirectory(int $userId): string
    {
        return 'symptom-map-import-previews/'.$userId;
    }
}
