<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ConfirmSymptomMedicineMapImportRequest;
use App\Http\Requests\Admin\PreviewSymptomMedicineMapImportRequest;
use App\Http\Requests\Admin\RestoreSymptomMedicineMapRequest;
use App\Http\Requests\Admin\ReviewSymptomMedicineMapRequest;
use App\Http\Requests\Admin\StoreSymptomMedicineMapRequest;
use App\Http\Requests\Admin\SubmitSymptomMedicineMapForReviewRequest;
use App\Http\Requests\Admin\UpdateSymptomMedicineMapRequest;
use App\Models\Medicine;
use App\Models\Symptom;
use App\Models\SymptomMedicineMap;
use App\Services\Admin\SymptomMedicineMapCsvImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SymptomMedicineMapController extends Controller
{
    public function index(Request $request, SymptomMedicineMapCsvImportService $importService)
    {
        $query = SymptomMedicineMap::withTrashed()->with(['symptom', 'medicine']);
        $previewToken = $request->session()->get('importPreviewToken');
        $preview = $previewToken ? $importService->loadPreview($previewToken, $request->user()->id) : null;

        return Inertia::render('Admin/SymptomMedicineMap/Index', [
            'maps' => $query->paginate(15),
            'importPreview' => $preview,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/SymptomMedicineMap/Create', [
            'symptoms' => Symptom::where('is_active', true)->orderBy('name_en')->get(),
            'medicines' => Medicine::where('is_active', true)->orderBy('name')->get(),
        ]);
    }

    public function store(StoreSymptomMedicineMapRequest $request): RedirectResponse
    {
        SymptomMedicineMap::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'is_approved' => false,
            'review_status' => 'draft',
        ]);

        return redirect()->route('admin.symptom_medicine_map.index')->with('success', 'Mapping added.');
    }

    public function edit(SymptomMedicineMap $symptomMedicineMap)
    {
        return Inertia::render('Admin/SymptomMedicineMap/Edit', [
            'mapping' => $symptomMedicineMap->load(['symptom', 'medicine', 'reviewer', 'versions']),
            'versions' => $symptomMedicineMap->versions,
            'symptoms' => Symptom::query()
                ->where('is_active', true)
                ->orWhereKey($symptomMedicineMap->symptom_id)
                ->orderBy('name_en')
                ->get(),
            'medicines' => Medicine::query()
                ->where('is_active', true)
                ->orWhereKey($symptomMedicineMap->medicine_id)
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function update(UpdateSymptomMedicineMapRequest $request, SymptomMedicineMap $symptomMedicineMap): RedirectResponse
    {
        $attributes = $request->validated();
        $changedClinicalFields = array_filter($attributes, function (mixed $value, string $field) use ($symptomMedicineMap): bool {
            $current = $symptomMedicineMap->{$field};

            return ($current === null ? null : (string) $current) !== ($value === null ? null : (string) $value);
        }, ARRAY_FILTER_USE_BOTH);

        DB::transaction(function () use ($attributes, $changedClinicalFields, $request, $symptomMedicineMap): void {
            if ($changedClinicalFields !== []) {
                $symptomMedicineMap->preserveVersion($request->user()->id);
                $attributes['review_status'] = 'draft';
                $attributes['is_approved'] = false;
                $attributes['reviewed_by'] = null;
                $attributes['reviewer_name'] = null;
                $attributes['reviewed_at'] = null;
                $attributes['review_note'] = null;
            }

            $symptomMedicineMap->update([
                ...$attributes,
                'updated_by' => $request->user()->id,
            ]);
        });

        return redirect()->route('admin.symptom_medicine_map.index')->with('success', 'Mapping updated.');
    }

    public function submitForReview(SubmitSymptomMedicineMapForReviewRequest $request, SymptomMedicineMap $symptomMedicineMap): RedirectResponse
    {
        abort_unless(in_array($symptomMedicineMap->review_status, ['draft', 'legacy_unreviewed', 'rejected', 'inactive'], true), 422, 'Only drafts, legacy unreviewed mappings, rejected mappings, or inactive mappings can be submitted for review.');

        $symptomMedicineMap->preserveVersion($request->user()->id);

        $symptomMedicineMap->update([
            'review_status' => 'pending_review',
            'is_approved' => false,
            'reviewed_by' => null,
            'reviewer_name' => null,
            'reviewed_at' => null,
            'review_note' => null,
            'updated_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Mapping submitted for independent clinical review.');
    }

    public function review(ReviewSymptomMedicineMapRequest $request, SymptomMedicineMap $symptomMedicineMap): RedirectResponse
    {
        $decision = $request->validated('decision');
        $reviewNote = $request->validated('review_note');

        if ($decision !== 'inactive') {
            abort_unless($symptomMedicineMap->review_status === 'pending_review', 422, 'Only pending mappings can be approved or rejected.');
        } else {
            abort_unless($symptomMedicineMap->review_status !== 'inactive', 422, 'This mapping is already inactive.');
        }
        if ($decision === 'approved') {
            abort_if(blank($symptomMedicineMap->source_title), 422, 'A source title is required before approval.');
            abort_unless($symptomMedicineMap->symptom?->is_active && $symptomMedicineMap->medicine?->is_active, 422, 'Inactive symptom or medicine records cannot be approved.');
        }

        DB::transaction(function () use ($decision, $request, $reviewNote, $symptomMedicineMap): void {
            $symptomMedicineMap->preserveVersion($request->user()->id);

            $symptomMedicineMap->update([
                'review_status' => $decision,
                'is_approved' => $decision === 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewer_name' => $request->user()->name,
                'reviewed_at' => now(),
                'review_note' => $reviewNote,
                'updated_by' => $request->user()->id,
            ]);
        });

        return back()->with('success', 'Mapping review status updated to '.str_replace('_', ' ', $decision).'.');
    }

    public function destroy(Request $request, SymptomMedicineMap $symptomMedicineMap): RedirectResponse
    {
        DB::transaction(function () use ($request, $symptomMedicineMap): void {
            $symptomMedicineMap->preserveVersion($request->user()->id);
            $symptomMedicineMap->update([
                'review_status' => 'inactive',
                'is_approved' => false,
                'updated_by' => $request->user()->id,
            ]);
            $symptomMedicineMap->delete();
        });

        return back()->with('success', 'Mapping removed.');
    }

    public function restore(RestoreSymptomMedicineMapRequest $request, int $mapping): RedirectResponse
    {
        $symptomMedicineMap = SymptomMedicineMap::withTrashed()->findOrFail($mapping);
        abort_unless($symptomMedicineMap->trashed(), 404);

        DB::transaction(function () use ($request, $symptomMedicineMap): void {
            $symptomMedicineMap->preserveVersion($request->user()->id);
            $symptomMedicineMap->restore();
            $symptomMedicineMap->update([
                'review_status' => 'pending_review',
                'is_approved' => false,
                'reviewed_by' => null,
                'reviewer_name' => null,
                'reviewed_at' => null,
                'review_note' => null,
                'updated_by' => $request->user()->id,
            ]);
        });

        return back()->with('success', 'Mapping restored as pending review. A clinical reviewer must approve it before it can be used as a reference.');
    }

    public function previewImport(PreviewSymptomMedicineMapImportRequest $request, SymptomMedicineMapCsvImportService $importService)
    {
        $preview = $importService->prepare($request->file('csv_file'), $request->user()->id);

        return back()->with('importPreviewToken', $preview['token']);
    }

    public function confirmImport(ConfirmSymptomMedicineMapImportRequest $request, SymptomMedicineMapCsvImportService $importService): RedirectResponse
    {
        $token = $request->validated('preview_token');
        $rows = $importService->load($token, $request->user()->id);
        $request->session()->forget('importPreviewToken');
        $outcomes = [];
        $imported = 0;
        $skipped = 0;
        $rejected = 0;

        DB::transaction(function () use ($rows, $request, &$outcomes, &$imported, &$skipped, &$rejected): void {
            foreach ($rows as $row) {
                if ($row['status'] === 'invalid') {
                    $rejected++;
                    $outcomes[] = ['line' => $row['line'], 'result' => 'Rejected', 'reason' => $row['message']];

                    continue;
                }
                if ($row['status'] === 'duplicate') {
                    $skipped++;
                    $outcomes[] = ['line' => $row['line'], 'result' => 'Skipped', 'reason' => $row['message']];

                    continue;
                }

                $mapping = isset($row['mapping_id'])
                    ? SymptomMedicineMap::withTrashed()->find($row['mapping_id'])
                    : null;
                if ($mapping && ! $mapping->trashed() && ($mapping->review_status === 'approved' || $mapping->is_approved)) {
                    $skipped++;
                    $outcomes[] = ['line' => $row['line'], 'result' => 'Skipped', 'reason' => 'Approved mapping became protected after preview.'];

                    continue;
                }

                Symptom::query()->whereKey($row['symptom_id'])->lockForUpdate()->first();
                $pairAlreadyExists = SymptomMedicineMap::query()
                    ->where('symptom_id', $row['symptom_id'])
                    ->where('medicine_id', $row['medicine_id'])
                    ->when($mapping, fn ($query) => $query->where('id', '!=', $mapping->id))
                    ->exists();
                if ($pairAlreadyExists) {
                    $skipped++;
                    $outcomes[] = ['line' => $row['line'], 'result' => 'Skipped', 'reason' => 'A mapping for this pair was added after preview.'];

                    continue;
                }

                $attributes = [
                    'symptom_id' => $row['symptom_id'],
                    'medicine_id' => $row['medicine_id'],
                    'priority' => (int) $row['priority'],
                    'note' => $row['note'] !== '' ? $row['note'] : null,
                    'is_approved' => false,
                    'review_status' => 'draft',
                    'source_title' => $row['source_title'] ?? null,
                    'source_author' => $row['source_author'] ?? null,
                    'source_edition' => $row['source_edition'] ?? null,
                    'source_page' => $row['source_page'] ?? null,
                    'source_url' => $row['source_url'] ?? null,
                    'reviewed_by' => null,
                    'reviewer_name' => null,
                    'reviewed_at' => null,
                    'review_note' => null,
                    'updated_by' => $request->user()->id,
                ];
                if ($mapping) {
                    $mapping->fill($attributes);
                    if ($mapping->trashed()) {
                        $mapping->restore();
                    } else {
                        $mapping->save();
                    }
                } else {
                    $mapping = SymptomMedicineMap::query()->create([
                        ...$attributes,
                        'created_by' => $request->user()->id,
                    ]);
                }
                $imported++;
                $outcomes[] = ['line' => $row['line'], 'result' => 'Imported as draft', 'reason' => 'Submit for independent clinical review before use in consultation suggestions.'];
            }
        });

        $importService->forget($token, $request->user()->id);

        return redirect()->route('admin.symptom_medicine_map.index')
            ->with('success', "Import complete: {$imported} imported, {$skipped} skipped, {$rejected} rejected.")
            ->with('importResults', $outcomes);
    }
}
