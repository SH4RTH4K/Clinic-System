<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SymptomMedicineMapVersion extends Model
{
    protected $guarded = [];

    protected $casts = [
        'snapshot' => 'array',
        'archived_at' => 'datetime',
    ];

    public function mapping(): BelongsTo
    {
        return $this->belongsTo(SymptomMedicineMap::class, 'symptom_medicine_map_id');
    }
}
