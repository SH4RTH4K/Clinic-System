<?php

namespace App\Models;

use Database\Factories\PatientAttachmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class PatientAttachment extends Model
{
    /** @use HasFactory<PatientAttachmentFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected $appends = [
        'file_url',
        'file_size_formatted',
    ];

    protected function casts(): array
    {
        return [
            'file_size_bytes' => 'integer',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getFileUrlAttribute(): ?string
    {
        if (empty($this->file_path)) {
            return null;
        }

        return Storage::disk('public')->url($this->file_path);
    }

    public function getFileSizeFormattedAttribute(): string
    {
        $bytes = $this->file_size_bytes;

        if ($bytes <= 0) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $i = floor(log($bytes, 1024));

        return round($bytes / pow(1024, $i), 1).' '.$units[$i];
    }
}
