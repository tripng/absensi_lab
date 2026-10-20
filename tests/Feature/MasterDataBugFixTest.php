<?php

use App\Models\User;
use Database\Seeders\MasterTablesSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->artisan('db:seed', ['--class' => MasterTablesSeeder::class]);
});

function makeBugFixAdmin()
{
    return User::factory()->create([
        'email' => 'admin+bugfix@absensi.test',
        'password' => Hash::make('password'),
    ]);
}

it('shares success flash to Inertia props', function () {
    $admin = makeBugFixAdmin();

    $this->actingAs($admin)
        ->withSession(['success' => 'Guru berhasil ditambahkan.'])
        ->get('/master-data')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('success', 'Guru berhasil ditambahkan.')
        );
});

it('form config fields have names and each select has exactly one empty placeholder', function () {
    $admin = makeBugFixAdmin();

    $this->actingAs($admin)
        ->get('/master-data')
        ->assertOk()
        ->assertInertia(function ($page) {
            $formConfig = $page->toArray()['props']['formConfig'] ?? [];

            expect($formConfig)->not->toBeEmpty();

            foreach ($formConfig as $entity => $fields) {
                expect($fields)->not->toBeEmpty("formConfig.{$entity} kosong");

                foreach ($fields as $field) {
                    expect($field['name'] ?? null)->not->toBeEmpty("Field tanpa name di {$entity}");

                    if (($field['type'] ?? null) === 'select') {
                        $emptyOptions = array_values(array_filter(
                            $field['options'] ?? [],
                            fn ($option) => ($option['value'] ?? null) === ''
                        ));

                        expect($emptyOptions)->toHaveCount(
                            1,
                            "Select {$entity}.{$field['name']} harus punya tepat satu placeholder value=\"\""
                        );
                    }
                }
            }

            return $page;
        });
});

it('form markup wires name, id, and label htmlFor', function () {
    $source = file_get_contents(resource_path('js/Pages/MasterData/Index.jsx'));

    expect($source)
        ->toContain('<label htmlFor={f.name}')
        ->toContain('id={f.name}')
        ->toContain('name={f.name}');
});
