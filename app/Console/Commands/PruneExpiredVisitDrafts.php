<?php

namespace App\Console\Commands;

use App\Models\VisitDraft;
use Illuminate\Console\Command;

class PruneExpiredVisitDrafts extends Command
{
    protected $signature = 'visit-drafts:prune';

    protected $description = 'Delete expired visit drafts';

    public function handle(): int
    {
        $deletedCount = VisitDraft::where('expires_at', '<=', now())->delete();

        $this->info("Pruned {$deletedCount} expired visit drafts.");

        return self::SUCCESS;
    }
}
