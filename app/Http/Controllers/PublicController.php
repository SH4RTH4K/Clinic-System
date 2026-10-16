<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use Illuminate\Contracts\View\View;

class PublicController extends Controller
{
    public function index(): View
    {
        $heroDoctors = Doctor::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return view('public.home', ['heroDoctors' => $heroDoctors]);
    }

    public function about(): View
    {
        $doctors = Doctor::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return view('public.about', ['doctors' => $doctors]);
    }

    public function doctors(): View
    {
        $doctors = Doctor::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return view('public.doctors', ['doctors' => $doctors]);
    }

    public function contact(): View
    {
        return view('public.contact');
    }
}
