<?php

namespace Database\Seeders;

use App\Models\Medicine;
use Illuminate\Database\Seeder;

class MedicineSeeder extends Seeder
{
    public function run(): void
    {
        $remedies = [
            // Major Polychrests & Trauma Remedies
            ['name' => 'Arnica Montana', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 3-4 drops with water before meals.'],
            ['name' => 'Nux Vomica', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops at bedtime or after meals.'],
            ['name' => 'Bryonia Alba', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops in water twice daily.'],
            ['name' => 'Belladonna', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 3 drops every 4 hours during acute fever.'],
            ['name' => 'Rhus Toxicodendron', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops morning and night.'],
            ['name' => 'Arsenicum Album', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 3 drops twice daily.'],
            ['name' => 'Aconitum Napellus', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 3 drops immediately at onset of chills.'],
            ['name' => 'Sulphur', 'potency' => '200C', 'form' => 'pills', 'default_instruction' => 'Take 4 globules in the morning on empty stomach.'],
            ['name' => 'Lycopodium Clavatum', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops late afternoon around 4 PM.'],
            ['name' => 'Calcarea Carbonica', 'potency' => '30C', 'form' => 'pills', 'default_instruction' => 'Take 4 globules once daily.'],
            ['name' => 'Pulsatilla Nigricans', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops twice daily.'],
            ['name' => 'Sepia Officinalis', 'potency' => '200C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops once weekly or as directed.'],
            ['name' => 'Silicea (Silica)', 'potency' => '30C', 'form' => 'pills', 'default_instruction' => 'Take 4 globules morning and evening.'],
            ['name' => 'Thuja Occidentalis', 'potency' => '200C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops once weekly.'],
            ['name' => 'Hepar Sulphuris Calcareum', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops three times daily.'],
            ['name' => 'Chamomilla', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 3 drops during acute colic/restlessness.'],
            ['name' => 'Hypericum Perforatum', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for nerve pain/puncture wounds.'],
            ['name' => 'Carbo Vegetabilis', 'potency' => '30C', 'form' => 'pills', 'default_instruction' => 'Take 4 globules during acute bloating/exhaustion.'],
            ['name' => 'Gelsemium Sempervirens', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops during anticipatory anxiety or flu.'],
            ['name' => 'Ignatia Amara', 'potency' => '200C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for emotional grief/shock.'],
            ['name' => 'Natrum Muriaticum', 'potency' => '30C', 'form' => 'pills', 'default_instruction' => 'Take 4 globules once daily.'],
            ['name' => 'Phosphorus', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops twice daily.'],
            ['name' => 'Lachesis Mutus', 'potency' => '200C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops once a week.'],
            ['name' => 'Allium Cepa', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for acrid nasal discharge / allergy.'],
            ['name' => 'Apis Mellifica', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 3 drops for stinging swelling or hives.'],
            ['name' => 'Cantharis Vesicatoria', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for acute burning urinary tract pain.'],
            ['name' => 'Colocynthis', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for severe cramping abdominal pain.'],
            ['name' => 'Drosera Rotundifolia', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for spasmodic nocturnal cough.'],
            ['name' => 'Ipecacuanha', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for persistent nausea with clean tongue.'],
            ['name' => 'Ledum Palustre', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for puncture wounds or insect bites.'],
            ['name' => 'Mercurius Solubilis', 'potency' => '30C', 'form' => 'pills', 'default_instruction' => 'Take 4 globules night and morning.'],
            ['name' => 'Plumbum Metallicum', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops as prescribed.'],
            ['name' => 'Ruta Graveolens', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for tendon strain or eye strain.'],
            ['name' => 'Spongia Tosta', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for barking dry croupy cough.'],
            ['name' => 'Staphysagria', 'potency' => '200C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for post-catheterization or repressed anger.'],
            ['name' => 'Symphytum Officinale', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for bone healing / periosteal injury.'],
            ['name' => 'Urtica Urens', 'potency' => 'Q', 'form' => 'liquid', 'default_instruction' => 'Take 10 drops in water for urticaria / uric acid diathesis.'],
            ['name' => 'Veratrum Album', 'potency' => '30C', 'form' => 'drops', 'default_instruction' => 'Take 4 drops for acute watery diarrhea with cold sweat.'],
            ['name' => 'Berberis Vulgaris', 'potency' => 'Q', 'form' => 'liquid', 'default_instruction' => 'Take 10-15 drops in half glass water for renal colic / stones.'],
            ['name' => 'Crataegus Oxyacantha', 'potency' => 'Q', 'form' => 'liquid', 'default_instruction' => 'Take 12 drops in water as heart tonic.'],
            ['name' => 'Syzygium Jambolanum', 'potency' => 'Q', 'form' => 'liquid', 'default_instruction' => 'Take 10 drops twice daily for blood sugar support.'],
            ['name' => 'Azadirachta Indica (Neem)', 'potency' => 'Q', 'form' => 'liquid', 'default_instruction' => 'Take 10 drops in water for blood purification and skin affections.'],
            ['name' => 'Echinacea Angustifolia', 'potency' => 'Q', 'form' => 'liquid', 'default_instruction' => 'Take 15 drops in warm water for immune defense / septic conditions.'],
            ['name' => 'Thlaspi Bursa Pastoris', 'potency' => 'Q', 'form' => 'liquid', 'default_instruction' => 'Take 10 drops for anti-hemorrhagic support.'],
            ['name' => 'Passiflora Incarnata', 'potency' => 'Q', 'form' => 'liquid', 'default_instruction' => 'Take 20 drops in warm water at bedtime for restful sleep.'],
        ];

        foreach ($remedies as $remedy) {
            Medicine::firstOrCreate(
                ['name' => $remedy['name'], 'potency' => $remedy['potency']],
                [
                    ...$remedy,
                    'stock_qty' => 0,
                    'is_active' => true,
                ]
            );
        }
    }
}
