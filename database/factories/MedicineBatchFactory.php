<?php

namespace Database\Factories;

use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Pharmaceutical;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MedicineBatch>
 */
class MedicineBatchFactory extends Factory
{
    protected $model = MedicineBatch::class;

    public function definition(): array
    {
        return [
            'item_type' => 'remedy',
            'medicine_id' => Medicine::factory(),
            'pharmaceutical_id' => null,
            'batch_number' => 'BN-'.$this->faker->unique()->numberBetween(10000, 99999),
            'potency' => '30C',
            'form' => 'dilution_30ml',
            'expiry_date' => now()->addMonths(24)->toDateString(),
            'purchase_date' => now()->subDays(5)->toDateString(),
            'purchase_price' => 150.00,
            'selling_price' => 220.00,
            'initial_quantity' => 20.00,
            'current_quantity' => 20.00,
            'unit' => 'bottle',
            'reorder_level' => 5.00,
            'supplier_name' => 'Dr. Reckeweg & Co.',
            'notes' => 'Direct manufacturer import',
            'is_active' => true,
        ];
    }

    public function pharmaceutical(): static
    {
        return $this->state(fn () => [
            'item_type' => 'pharmaceutical',
            'medicine_id' => null,
            'pharmaceutical_id' => Pharmaceutical::factory(),
            'potency' => null,
            'form' => 'tablet',
            'unit' => 'box',
            'purchase_price' => 80.00,
            'selling_price' => 110.00,
            'supplier_name' => 'Square Pharmaceuticals Ltd.',
        ]);
    }

    public function forRemedy(Medicine $medicine): static
    {
        return $this->state(fn () => [
            'item_type' => 'remedy',
            'medicine_id' => $medicine->id,
            'pharmaceutical_id' => null,
            'potency' => $medicine->potency ?? '30C',
            'form' => 'dilution_30ml',
            'unit' => 'bottle',
        ]);
    }

    public function forPharmaceutical(Pharmaceutical $pharmaceutical): static
    {
        return $this->state(fn () => [
            'item_type' => 'pharmaceutical',
            'medicine_id' => null,
            'pharmaceutical_id' => $pharmaceutical->id,
            'potency' => null,
            'form' => $pharmaceutical->dosage_form ?? 'tablet',
            'unit' => 'box',
        ]);
    }

    public function lowStock(): static
    {
        return $this->state(fn () => [
            'current_quantity' => 2.00,
            'reorder_level' => 5.00,
        ]);
    }

    public function expiringSoon(): static
    {
        return $this->state(fn () => [
            'expiry_date' => now()->addDays(15)->toDateString(),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'expiry_date' => now()->subDays(10)->toDateString(),
        ]);
    }
}
