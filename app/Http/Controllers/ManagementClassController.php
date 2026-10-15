<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class ManagementClassController extends Controller
{
    /**
     * Halaman manajemen jadwal pemakaian lab.
     * UI/UX + interaktivitas frontend (mock data / client-side state).
     * Belum ada integrasi database pada tahap ini.
     */
    public function index()
    {
        return Inertia::render('ManagementClass/Index');
    }
}