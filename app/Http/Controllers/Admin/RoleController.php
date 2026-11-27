<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $filter = (string) $request->input('filter', 'all');

        $query = Role::query()->withCount(['users', 'permissions']);

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($filter === 'protected') {
            $query->where('name', 'Super Admin');
        } elseif ($filter === 'custom') {
            $query->where('name', '!=', 'Super Admin');
        } elseif ($filter === 'assigned') {
            $query->has('users');
        } elseif ($filter === 'unassigned') {
            $query->doesntHave('users')->where('name', '!=', 'Super Admin');
        }

        $roles = $query->orderBy('name')->get();

        // Calculate system-wide KPIs across all roles
        $allRoles = Role::query()->withCount(['users', 'permissions'])->get();
        $totalRoles = $allRoles->count();
        $totalAssignments = (int) $allRoles->sum('users_count');
        $customRolesCount = $allRoles->where('name', '!=', 'Super Admin')->count();
        $unassignedRolesCount = $allRoles->where('name', '!=', 'Super Admin')->where('users_count', 0)->count();
        $protectedRolesCount = $allRoles->where('name', 'Super Admin')->count();

        $kpis = [
            'total_roles' => $totalRoles,
            'total_assignments' => $totalAssignments,
            'custom_roles_count' => $customRolesCount,
            'unassigned_roles_count' => $unassignedRolesCount,
            'protected_roles_count' => $protectedRolesCount,
        ];

        return Inertia::render('Admin/Roles/Index', [
            'roles' => $roles,
            'kpis' => $kpis,
            'filters' => [
                'search' => $search,
                'filter' => $filter,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Roles/Create');
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        Role::create($request->validated());

        return redirect()->route('admin.roles.index')->with('success', 'Role created. Assign its permissions from Permission Management.');
    }

    public function edit(Role $role): Response
    {
        abort_if($role->name === 'Super Admin', 403, 'The Super Admin role is protected.');

        return Inertia::render('Admin/Roles/Edit', [
            'role' => $role,
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $role->update($request->validated());

        return redirect()->route('admin.roles.index')->with('success', 'Role updated. Manage its permissions from Permission Management.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        abort_if($role->name === 'Super Admin', 403, 'The Super Admin role cannot be deleted.');

        $assignedUserCount = $role->users()->count();

        if ($assignedUserCount > 0) {
            $userLabel = $assignedUserCount === 1 ? 'user' : 'users';

            return back()->withErrors([
                'role' => "Cannot delete {$role->name}; it is assigned to {$assignedUserCount} {$userLabel}. Reassign those users first.",
            ]);
        }

        $role->delete();

        return redirect()->route('admin.roles.index')->with('success', 'Role deleted.');
    }
}
