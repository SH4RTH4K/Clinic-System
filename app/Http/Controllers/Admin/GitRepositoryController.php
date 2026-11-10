<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateGitRepositorySettingsRequest;
use App\Services\GitRepositoryService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class GitRepositoryController extends Controller
{
    public function index(GitRepositoryService $repository): Response
    {
        return Inertia::render('Admin/GitRepository', [
            'repository' => $repository->snapshot(),
            'settings' => $repository->settingsForPage(),
            'history' => $repository->historyForPage(),
        ]);
    }

    public function updateSettings(UpdateGitRepositorySettingsRequest $request, GitRepositoryService $repository): RedirectResponse
    {
        try {
            $settings = $request->validated();
            $settings['credential'] = $settings['credential'] ?? null;
            $repository->saveSettings($settings);

            return back()->with('success', 'Git Repository settings saved in private application storage.');
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }

    public function check(GitRepositoryService $repository): RedirectResponse
    {
        try {
            $status = $repository->check();

            return back()->with('success', $status['message']);
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }

    public function reconnectSourceCheckout(GitRepositoryService $repository): RedirectResponse
    {
        try {
            $repository->reconnectSourceCheckout();

            return back()->with('success', 'The private application-managed Git checkout is ready. Check GitHub to verify the repository status.');
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }

    public function pull(GitRepositoryService $repository): RedirectResponse
    {
        try {
            $status = $repository->pull();

            return back()->with('success', $status['message']);
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }
}
