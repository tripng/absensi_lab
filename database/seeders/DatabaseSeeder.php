<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Master data (kelas, labkom, lokasi, guru, mapel, user admin)
        $this->call([
            MasterTablesSeeder::class,
        ]);
    }
}
