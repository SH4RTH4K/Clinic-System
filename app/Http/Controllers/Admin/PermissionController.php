<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateRolePermissionsRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Permissions/Index', [
            'roles' => Role::query()
                ->where('name', '!=', 'Super Admin')
                ->with(['permissions:id,name,guard_name'])
                ->withCount('users')
                ->orderBy('name')
                ->get(['id', 'name', 'guard_name']),
            'permissions' => Permission::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function update(UpdateRolePermissionsRequest $request, Role $role): RedirectResponse
    {
        $role->syncPermissions($request->validated('permissions'));

        return redirect()->route('admin.permissions.index')->with('success', "Permissions updated for {$role->name}.");
    }
}
