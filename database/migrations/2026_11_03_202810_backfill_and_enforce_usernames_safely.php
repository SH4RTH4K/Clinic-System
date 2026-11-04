<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            throw new RuntimeException('The users table must exist before usernames can be enforced.');
        }

        if (! Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->string('username')->nullable()->after('name');
            });
        }

        $this->throwIfDuplicateUsernamesExist();
        $this->backfillMissingUsernames();
        $this->throwIfUsernamesAreIncomplete();
        $this->throwIfDuplicateUsernamesExist();

        if (! $this->hasStandaloneUniqueUsernameIndex()) {
            $this->addStandaloneUniqueUsernameIndex();
        }

        $usernameColumn = collect(Schema::getColumns('users'))
            ->firstWhere('name', 'username');

        if ($usernameColumn === null) {
            throw new RuntimeException('The username column could not be verified.');
        }

        if ($usernameColumn['nullable']) {
            Schema::table('users', function (Blueprint $table) use ($usernameColumn): void {
                $username = $table->string('username')->nullable(false);

                if ($usernameColumn['collation'] !== null) {
                    $username->collation($usernameColumn['collation']);
                }

                $username->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Username backfill and uniqueness enforcement are non-reversible because they establish login identities.'
        );
    }

    private function throwIfDuplicateUsernamesExist(): void
    {
        $hasDuplicates = DB::table('users')
            ->select('username')
            ->whereNotNull('username')
            ->whereRaw("TRIM(username) <> ''")
            ->groupBy('username')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicates) {
            throw new RuntimeException(
                'Duplicate usernames exist under the database collation. Resolve them manually before continuing.'
            );
        }
    }

    private function backfillMissingUsernames(): void
    {
        DB::table('users')
            ->select(['id', 'username'])
            ->orderBy('id')
            ->chunkById(500, function ($users): void {
                foreach ($users as $user) {
                    if ($user->username !== null && trim($user->username) !== '') {
                        continue;
                    }

                    $username = $this->availableUsernameFor((int) $user->id);

                    DB::table('users')
                        ->where('id', $user->id)
                        ->where(function ($query): void {
                            $query->whereNull('username')
                                ->orWhereRaw("TRIM(username) = ''");
                        })
                        ->update(['username' => $username]);
                }
            });
    }

    private function availableUsernameFor(int $userId): string
    {
        $baseUsername = 'clinic-user-'.$userId;
        $candidate = $baseUsername;
        $suffix = 1;

        while (DB::table('users')->where('username', $candidate)->exists()) {
            $suffix++;
            $candidate = $baseUsername.'-'.$suffix;
        }

        return $candidate;
    }

    private function throwIfUsernamesAreIncomplete(): void
    {
        $hasIncompleteUsernames = DB::table('users')
            ->whereNull('username')
            ->orWhereRaw("TRIM(username) = ''")
            ->exists();

        if ($hasIncompleteUsernames) {
            throw new RuntimeException(
                'Some user accounts still have no username. No username constraints were enforced.'
            );
        }
    }

    private function hasStandaloneUniqueUsernameIndex(): bool
    {
        foreach (Schema::getIndexes('users') as $index) {
            if ($index['unique'] && $index['columns'] === ['username']) {
                return true;
            }
        }

        return false;
    }

    private function addStandaloneUniqueUsernameIndex(): void
    {
        $existingIndexNames = array_column(Schema::getIndexes('users'), 'name');
        $indexName = 'users_username_unique';
        $suffix = 1;

        while (in_array($indexName, $existingIndexNames, true)) {
            $indexName = 'users_username_unique_hardened_'.$suffix;
            $suffix++;
        }

        Schema::table('users', function (Blueprint $table) use ($indexName): void {
            $table->unique('username', $indexName);
        });
    }
};
