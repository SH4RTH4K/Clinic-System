<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateRolePermissionsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionController extends Controller
{
    public function index(Request $request): Response
    {
        $roles = Role::query()
            ->where('name', '!=', 'Super Admin')
            ->with(['permissions:id,name,guard_name'])
            ->withCount('users')
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name']);

        $permissions = Permission::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name']);

        $totalRoles = $roles->count();
        $totalPermissions = $permissions->count();
        $totalAssignments = (int) $roles->sum('users_count');

        $kpis = [
            'total_roles' => $totalRoles,
            'total_permissions' => $totalPermissions,
            'total_assignments' => $totalAssignments,
        ];

        return Inertia::render('Admin/Permissions/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
            'kpis' => $kpis,
            'filters' => [
                'role' => $request->input('role'),
            ],
        ]);
    }

    public function update(UpdateRolePermissionsRequest $request, Role $role): RedirectResponse
    {
        $role->syncPermissions($request->validated('permissions'));

        return redirect()->route('admin.permissions.index')
            ->with('success', "Permissions updated for {$role->name}.");
    }
}
