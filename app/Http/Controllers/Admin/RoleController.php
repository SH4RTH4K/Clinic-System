<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Roles/Index', [
            'roles' => Role::query()
                ->withCount(['users', 'permissions'])
                ->orderBy('name')
                ->get(),
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
