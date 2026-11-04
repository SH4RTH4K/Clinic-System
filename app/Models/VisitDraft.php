<?php

namespace App\Models;

use Database\Factories\VisitDraftFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VisitDraft extends Model
{
    /** @use HasFactory<VisitDraftFactory> */
    use HasFactory;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'payload' => 'encrypted:array',
            'expires_at' => 'datetime',
        ];
    }

    public static function ownerTokenFor(User $user): string
    {
        return hash_hmac('sha256', 'visit-draft-user:'.$user->getAuthIdentifier(), (string) config('app.key'));
    }
}
