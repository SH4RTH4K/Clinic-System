<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->get();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Users/Create', [
            'roles' => Role::where('name', '!=', 'Super Admin')
                ->orWhere(fn ($q) => $q->where('name', 'Super Admin'))
                ->get(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        // Prevent a Super Admin role assignment by non-Super-Admins.
        // (authorize() in the Form Request already enforces Super Admin only,
        // but this guard is a defence-in-depth check on the role values.)
        if (
            in_array('Super Admin', $request->roles, true)
            && ! $request->user()->hasRole('Super Admin')
        ) {
            abort(403, 'Only Super Admin may assign the Super Admin role.');
        }

        $roles = $request->validated('roles');

        DB::transaction(function () use ($request, $roles): void {
            $superAdminRole = $this->lockSuperAdminRole();
            $this->lockActiveSuperAdminActor($request->user()->id, $superAdminRole);

            $user = User::create([
                'name' => $request->name,
                'username' => $request->username,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'is_active' => $request->boolean('is_active', true),
                'must_change_password' => true,
            ]);

            $user->syncRoles($roles);
        });

        return redirect()->route('admin.users.index')->with('success', 'User created.');
    }

    public function edit(User $user)
    {
        $user->load('roles');

        return Inertia::render('Admin/Users/Edit', [
            'user' => $user,
            'roles' => Role::all(),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $roles = $request->validated('roles');
        $errorField = DB::transaction(function () use ($request, $user, $roles): ?string {
            $superAdminRole = $this->lockSuperAdminRole();
            $this->lockActiveSuperAdminActor($request->user()->id, $superAdminRole);
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $isActiveSuperAdmin = $lockedUser->is_active && $lockedUser->hasRole($superAdminRole);
            $removesSuperAdminRole = ! in_array($superAdminRole->name, $roles, true);
            $deactivatesSuperAdmin = ! $request->boolean('is_active', true);

            if ($isActiveSuperAdmin && ($removesSuperAdminRole || $deactivatesSuperAdmin)) {
                $activeSuperAdmins = $this->lockActiveSuperAdmins($superAdminRole);

                if ($activeSuperAdmins->count() <= 1) {
                    return $removesSuperAdminRole ? 'roles' : 'is_active';
                }
            }

            $lockedUser->update([
                'name' => $request->name,
                'username' => $request->username,
                'email' => $request->email,
                'phone' => $request->phone,
                'is_active' => $request->boolean('is_active', true),
            ]);

            if ($request->filled('password')) {
                $lockedUser->update([
                    'password' => Hash::make($request->password),
                    'must_change_password' => true,
                ]);
            }

            $lockedUser->syncRoles($roles);

            return null;
        });

        if ($errorField === 'roles') {
            return back()->withErrors(['roles' => 'Cannot remove the last Super Admin.']);
        }

        if ($errorField === 'is_active') {
            return back()->withErrors(['is_active' => 'Cannot deactivate the last Super Admin.']);
        }

        return redirect()->route('admin.users.index')->with('success', 'User updated.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $mayDelete = DB::transaction(function () use ($request, $user): bool {
            $superAdminRole = $this->lockSuperAdminRole();
            $this->lockActiveSuperAdminActor($request->user()->id, $superAdminRole);
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($lockedUser->is_active && $lockedUser->hasRole($superAdminRole)) {
                $activeSuperAdmins = $this->lockActiveSuperAdmins($superAdminRole);

                if ($activeSuperAdmins->count() <= 1) {
                    return false;
                }
            }

            $lockedUser->delete();

            return true;
        });

        if (! $mayDelete) {
            return back()->withErrors(['error' => 'Cannot delete the last Super Admin.']);
        }

        return redirect()->route('admin.users.index')->with('success', 'User deleted.');
    }

    private function lockSuperAdminRole(): Role
    {
        return Role::query()
            ->where('name', 'Super Admin')
            ->where('guard_name', 'web')
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function lockActiveSuperAdminActor(int $actorId, Role $superAdminRole): User
    {
        $actor = User::query()->whereKey($actorId)->lockForUpdate()->firstOrFail();

        abort_unless($actor->is_active && $actor->hasRole($superAdminRole), 403);

        return $actor;
    }

    /**
     * @return Collection<int, User>
     */
    private function lockActiveSuperAdmins(Role $superAdminRole): Collection
    {
        return User::query()
            ->role($superAdminRole)
            ->where('is_active', true)
            ->orderBy('users.id')
            ->lockForUpdate()
            ->get(['users.id']);
    }
}
