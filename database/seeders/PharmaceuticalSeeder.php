<?php

namespace Database\Seeders;

use App\Models\Pharmaceutical;
use Illuminate\Database\Seeder;

class PharmaceuticalSeeder extends Seeder
{
    public function run(): void
    {
        $drugs = [
            // Generic: Paracetamol
            ['generic_name' => 'Paracetamol', 'brand_name' => 'Napa', 'dosage_form' => 'Tablet', 'strength' => '500mg', 'manufacturer' => 'Beximco Pharmaceuticals'],
            ['generic_name' => 'Paracetamol', 'brand_name' => 'Napa Extra', 'dosage_form' => 'Tablet', 'strength' => '500mg + 65mg', 'manufacturer' => 'Beximco Pharmaceuticals'],
            ['generic_name' => 'Paracetamol', 'brand_name' => 'Napa Syrup', 'dosage_form' => 'Syrup', 'strength' => '120mg/5ml', 'manufacturer' => 'Beximco Pharmaceuticals'],
            ['generic_name' => 'Paracetamol', 'brand_name' => 'Ace', 'dosage_form' => 'Tablet', 'strength' => '500mg', 'manufacturer' => 'Square Pharmaceuticals'],
            ['generic_name' => 'Paracetamol', 'brand_name' => 'Ace Plus', 'dosage_form' => 'Tablet', 'strength' => '500mg + 65mg', 'manufacturer' => 'Square Pharmaceuticals'],
            // Generic: Omeprazole
            ['generic_name' => 'Omeprazole', 'brand_name' => 'Seclo', 'dosage_form' => 'Capsule', 'strength' => '20mg', 'manufacturer' => 'Square Pharmaceuticals'],
            ['generic_name' => 'Omeprazole', 'brand_name' => 'Losectil', 'dosage_form' => 'Capsule', 'strength' => '20mg', 'manufacturer' => 'SK+F'],
            // Generic: Esomeprazole
            ['generic_name' => 'Esomeprazole', 'brand_name' => 'Nexum', 'dosage_form' => 'Tablet', 'strength' => '20mg', 'manufacturer' => 'Square Pharmaceuticals'],
            ['generic_name' => 'Esomeprazole', 'brand_name' => 'Maxpro', 'dosage_form' => 'Capsule', 'strength' => '20mg', 'manufacturer' => 'Renata Limited'],
            // Generic: Amoxicillin
            ['generic_name' => 'Amoxicillin', 'brand_name' => 'Moxacil', 'dosage_form' => 'Capsule', 'strength' => '500mg', 'manufacturer' => 'Square Pharmaceuticals'],
            ['generic_name' => 'Amoxicillin', 'brand_name' => 'Moxacil Suspension', 'dosage_form' => 'Suspension', 'strength' => '125mg/5ml', 'manufacturer' => 'Square Pharmaceuticals'],
            // Generic: Azithromycin
            ['generic_name' => 'Azithromycin', 'brand_name' => 'Zimax', 'dosage_form' => 'Tablet', 'strength' => '500mg', 'manufacturer' => 'Square Pharmaceuticals'],
            ['generic_name' => 'Azithromycin', 'brand_name' => 'Tridosil', 'dosage_form' => 'Capsule', 'strength' => '500mg', 'manufacturer' => 'Beximco Pharmaceuticals'],
            // Generic: Cetirizine
            ['generic_name' => 'Cetirizine', 'brand_name' => 'Alatrol', 'dosage_form' => 'Tablet', 'strength' => '10mg', 'manufacturer' => 'Square Pharmaceuticals'],
            ['generic_name' => 'Cetirizine', 'brand_name' => 'Alatrol Syrup', 'dosage_form' => 'Syrup', 'strength' => '5mg/5ml', 'manufacturer' => 'Square Pharmaceuticals'],
            // Generic: Fexofenadine
            ['generic_name' => 'Fexofenadine', 'brand_name' => 'Fexo', 'dosage_form' => 'Tablet', 'strength' => '120mg', 'manufacturer' => 'Square Pharmaceuticals'],
            // Generic: Metformin
            ['generic_name' => 'Metformin HCl', 'brand_name' => 'Commet', 'dosage_form' => 'Tablet', 'strength' => '500mg', 'manufacturer' => 'Square Pharmaceuticals'],
            // Generic: Amlodipine
            ['generic_name' => 'Amlodipine', 'brand_name' => 'Camlodin', 'dosage_form' => 'Tablet', 'strength' => '5mg', 'manufacturer' => 'Square Pharmaceuticals'],
            // Generic: Ciprofloxacin
            ['generic_name' => 'Ciprofloxacin', 'brand_name' => 'Ciprocin', 'dosage_form' => 'Tablet', 'strength' => '500mg', 'manufacturer' => 'Square Pharmaceuticals'],
            // Generic: Salbutamol
            ['generic_name' => 'Salbutamol', 'brand_name' => 'Ventolin Inhaler', 'dosage_form' => 'Inhaler', 'strength' => '100mcg/puff', 'manufacturer' => 'GlaxoSmithKline'],
        ];

        foreach ($drugs as $drug) {
            Pharmaceutical::firstOrCreate(
                ['brand_name' => $drug['brand_name'], 'strength' => $drug['strength']],
                [
                    ...$drug,
                    'is_active' => true,
                ]
            );
        }
    }
}
