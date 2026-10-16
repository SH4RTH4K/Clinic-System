<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\Symptom;
use App\Models\SymptomMedicineMap;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SymptomMedicineMapController extends Controller
{
    public function index(Request $request)
    {
        $query = SymptomMedicineMap::with(['symptom', 'medicine']);

        return Inertia::render('Admin/SymptomMedicineMap/Index', [
            'maps' => $query->paginate(15),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/SymptomMedicineMap/Create', [
            'symptoms' => Symptom::all(),
            'medicines' => Medicine::all(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'symptom_id' => 'required|exists:symptoms,id',
            'medicine_id' => 'required|exists:medicines,id',
            'priority' => 'required|integer|min:1',
            'note' => 'nullable|string',
        ]);

        SymptomMedicineMap::create([
            'symptom_id' => $request->symptom_id,
            'medicine_id' => $request->medicine_id,
            'priority' => $request->priority,
            'note' => $request->note,
            'created_by' => Auth::id(),
        ]);

        return redirect()->route('admin.symptom_medicine_map.index')->with('success', 'Mapping added.');
    }

    public function destroy(SymptomMedicineMap $symptomMedicineMap)
    {
        $symptomMedicineMap->delete();

        return back()->with('success', 'Mapping removed.');
    }

    public function import(Request $request)
    {
        $request->validate(['csv_file' => 'required|file|mimes:csv,txt']);

        $path = $request->file('csv_file')->getRealPath();
        $data = array_map('str_getcsv', file($path));

        $header = array_shift($data);
        // Expecting: symptom_name, medicine_name, priority, note
        foreach ($data as $row) {
            if (count($row) >= 2) {
                $symName = trim($row[0]);
                $medName = trim($row[1]);
                $priority = isset($row[2]) ? (int) trim($row[2]) : 1;
                $note = isset($row[3]) ? trim($row[3]) : null;

                $symptom = Symptom::where('name_en', $symName)->first();
                $medicine = Medicine::where('name', $medName)->first();

                if ($symptom && $medicine) {
                    SymptomMedicineMap::updateOrCreate(
                        ['symptom_id' => $symptom->id, 'medicine_id' => $medicine->id],
                        ['priority' => $priority, 'note' => $note, 'created_by' => Auth::id()]
                    );
                }
            }
        }

        return back()->with('success', 'CSV imported successfully.');
    }
}
