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
    public function index(Request $request)
    {
        $search = $request->string('search')->trim()->value();
        $role = $request->string('role')->trim()->value();
        $status = $request->string('status', 'all')->trim()->value();

        $users = User::query()
            ->with('roles')
            ->search($search)
            ->roleFilter($role)
            ->status($status)
            ->orderByDesc('id')
            ->get();

        $allUsers = User::with('roles')->get();
        $kpis = [
            'total_users' => $allUsers->count(),
            'active_users' => $allUsers->where('is_active', true)->count(),
            'super_admins_count' => $allUsers->filter(fn ($u) => $u->hasRole('Super Admin'))->count(),
            'doctors_count' => $allUsers->filter(fn ($u) => $u->hasRole('Doctor'))->count(),
            'support_staff_count' => $allUsers->filter(fn ($u) => ! $u->hasRole('Super Admin') && ! $u->hasRole('Doctor'))->count(),
        ];

        $roles = Role::query()->orderBy('name')->pluck('name');

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'kpis' => $kpis,
            'filters' => [
                'search' => $search,
                'role' => $role,
                'status' => $status,
            ],
            'availableRoles' => $roles,
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

    public function toggleStatus(Request $request, User $user): RedirectResponse
    {
        $error = DB::transaction(function () use ($request, $user): ?string {
            $superAdminRole = $this->lockSuperAdminRole();
            $this->lockActiveSuperAdminActor($request->user()->id, $superAdminRole);
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($lockedUser->is_active && $lockedUser->hasRole($superAdminRole)) {
                $activeSuperAdmins = $this->lockActiveSuperAdmins($superAdminRole);

                if ($activeSuperAdmins->count() <= 1) {
                    return 'Cannot deactivate the last remaining active Super Admin.';
                }
            }

            $lockedUser->update([
                'is_active' => ! $lockedUser->is_active,
            ]);

            return null;
        });

        if ($error) {
            return back()->withErrors(['is_active' => $error]);
        }

        $statusText = $user->fresh()->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "User \"{$user->name}\" {$statusText} successfully.");
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
