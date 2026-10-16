<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SymptomMedicineMap extends Model
{
    use HasFactory;

    protected $table = 'symptom_medicine_map';

    protected $guarded = [];

    public function symptom()
    {
        return $this->belongsTo(Symptom::class);
    }

    public function medicine()
    {
        return $this->belongsTo(Medicine::class);
    }
}
