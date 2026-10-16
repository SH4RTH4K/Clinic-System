<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
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

    public function store(StoreUserRequest $request)
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

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'is_active' => $request->boolean('is_active', true),
            'must_change_password' => true,
        ]);

        $user->syncRoles($request->roles);

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

    public function update(UpdateUserRequest $request, User $user)
    {
        // Guard: prevent removing/replacing Super Admin role unless actor is Super Admin.
        if (
            in_array('Super Admin', $request->roles, true) === false
            && $user->hasRole('Super Admin')
            && ! $request->user()->hasRole('Super Admin')
        ) {
            abort(403, 'Only Super Admin may change the Super Admin role.');
        }

        // Guard: cannot strip Super Admin from the last Super Admin.
        if ($user->hasRole('Super Admin') && ! in_array('Super Admin', $request->roles, true)) {
            $superAdminCount = User::role('Super Admin')->count();
            if ($superAdminCount <= 1) {
                return back()->withErrors(['roles' => 'Cannot remove the last Super Admin.']);
            }
        }

        // Guard: cannot deactivate the last Super Admin.
        if ($user->hasRole('Super Admin') && ! $request->boolean('is_active', true)) {
            $superAdminCount = User::role('Super Admin')->count();
            if ($superAdminCount <= 1) {
                return back()->withErrors(['is_active' => 'Cannot deactivate the last Super Admin.']);
            }
        }

        $user->update([
            'name' => $request->name,
            'username' => $request->username,
            'email' => $request->email,
            'phone' => $request->phone,
            'is_active' => $request->boolean('is_active', true),
        ]);

        if ($request->filled('password')) {
            $user->update(['password' => Hash::make($request->password)]);
        }

        $user->syncRoles($request->roles);

        return redirect()->route('admin.users.index')->with('success', 'User updated.');
    }

    public function destroy(User $user)
    {
        if ($user->hasRole('Super Admin')) {
            $superAdminCount = User::role('Super Admin')->count();
            if ($superAdminCount <= 1) {
                return back()->withErrors(['error' => 'Cannot delete the last Super Admin.']);
            }
        }

        $user->delete();

        return redirect()->route('admin.users.index')->with('success', 'User deleted.');
    }
}
