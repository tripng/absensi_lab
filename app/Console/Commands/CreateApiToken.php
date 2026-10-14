<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\File;
use App\Models\User;

class CreateApiToken extends Command
{
    protected $signature = 'api:token {name : Token name} {--user-email= : User email to attach token to} {--save-to-env= : Env key name to save token (e.g. SCAN_APP_TOKEN)}';
    protected $description = 'Create a Sanctum API token for external apps. Optionally save to .env.';

    public function handle()
    {
        $email = $this->option('user-email') ?: 'admin@absensi_lab.test';

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->info("No user found with email {$email}. Creating one...");
            $user = User::create([
                'name' => 'Admin Absensi',
                'email' => $email,
                'password' => Hash::make('password'),
            ]);
            $this->info("User created: {$email}");
        }

        $tokenName = $this->argument('name');
        $token = $user->createToken($tokenName);

        $plainToken = $token->plainTextToken;

        $this->info("API Token for user {$user->email}:");
        $this->line($plainToken);
        $this->info("Use as: Authorization: Bearer ***");

        // Optionally save to .env
        $envKey = $this->option('save-to-env');
        if ($envKey) {
            $this->saveTokenToEnv($envKey, $plainToken);
        }
    }

    private function saveTokenToEnv(string $key, string $token): void
    {
        $envPath = base_path('.env');
        $content = File::get($envPath);
        $pattern = "/^" . preg_quote($key, '/') . "=(.*)$/m";
        $replacement = $key . "=\"" . $token . "\"";

        if (preg_match($pattern, $content)) {
            $content = preg_replace($pattern, $replacement, $content);
        } else {
            $content .= "\n" . $replacement . "\n";
        }

        File::put($envPath, $content);
        $this->info(".env updated: {$key}=\"***\"");
        $this->info("Token tersimpan otomatis — gunakan env('{$key}') di config.");
    }
}
