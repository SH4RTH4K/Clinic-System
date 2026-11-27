<?php

namespace Database\Seeders;

use App\Models\Medicine;
use App\Models\Symptom;
use App\Models\SymptomMedicineMap;
use Illuminate\Database\Seeder;

class SymptomMedicineMapSeeder extends Seeder
{
    public function run(): void
    {
        // Define mapping: Symptom Code => Array of [Medicine Name, Priority (1-3), Note]
        $mappings = [
            // Mind: Anxiety with fear of death
            'MIND-01' => [
                ['Aconitum Napellus', 1, 'Acute sudden panic and fear of death.'],
                ['Arsenicum Album', 1, 'Restlessness, fear of death, worse midnight.'],
                ['Rhus Toxicodendron', 2, 'Physical restlessness, driven to move.'],
            ],
            // Mind: Irritability and impatience
            'MIND-02' => [
                ['Nux Vomica', 1, 'Impatient, easily offended, quarrelsome, oversensitive.'],
                ['Chamomilla', 1, 'Snappish, cannot bear anyone near or talking.'],
                ['Bryonia Alba', 2, 'Wants to be let alone, irritable on motion.'],
            ],
            // Mind: Grief, silent weeping with sighing
            'MIND-03' => [
                ['Ignatia Amara', 1, 'Silent brooding, sighing, emotional shock.'],
                ['Natrum Muriaticum', 1, 'Consolation aggravates, holds grudges.'],
                ['Phosphoric Acid', 2, 'Apathetic indifference from grief.'],
            ],
            // Mind: Mild, timid, weeps easily
            'MIND-04' => [
                ['Pulsatilla Nigricans', 1, 'Craves affection, sympathy, crying easily.'],
                ['Silicea', 2, 'Timid, yielding, lacks grit.'],
                ['Sepia', 2, 'Weeps when telling symptoms, indifference to loved ones.'],
            ],
            // Mind: Anticipatory anxiety with diarrhea
            'MIND-05' => [
                ['Gelsemium Sempervirens', 1, 'Trembling from anticipation or bad news.'],
                ['Argentum Nitricum', 1, 'Hurried, anticipatory diarrhea.'],
                ['Lycopodium Clavatum', 2, 'Lacks self-confidence, dreads public speaking.'],
            ],

            // Head: Throbbing congestive headache
            'HEAD-01' => [
                ['Belladonna', 1, 'Sudden, throbbing, flushed red face, hot head.'],
                ['Glonoinum', 1, 'Surging blood, cannot bear heat of sun.'],
                ['Aconitum Napellus', 2, 'Congestive headache after exposure to cold dry wind.'],
            ],
            // Head: Bursting headache worse motion
            'HEAD-02' => [
                ['Bryonia Alba', 1, 'Worse slightest movement, splitting headache.'],
                ['Nux Vomica', 2, 'Frontal headache with sour taste and nausea.'],
                ['Belladonna', 2, 'Worse jarring, light, noise.'],
            ],
            // Head: Occipital extending to forehead
            'HEAD-03' => [
                ['Gelsemium Sempervirens', 1, 'Occipital pain, heavy eyelids, better copious urination.'],
                ['Silicea', 1, 'Starts in nape of neck, settles over one eye.'],
            ],
            // Head: Right-sided migraine
            'HEAD-04' => [
                ['Sanguinaria Canadensis', 1, 'Right-sided, begins in occiput, settles over eye.'],
                ['Belladonna', 1, 'Right-sided acute throbbing.'],
                ['Lycopodium Clavatum', 2, 'Right-sided temporal headache.'],
            ],

            // ENT: Acrid watery nasal discharge
            'ENT-01' => [
                ['Allium Cepa', 1, 'Acrid nasal discharge burning lip; bland tears.'],
                ['Arsenicum Album', 1, 'Burning water from nose; sneezing.'],
            ],
            // ENT: Bland discharge, acrid tears
            'ENT-02' => [
                ['Euphrasia', 1, 'Acrid lachrymation scalding cheeks; bland coryza.'],
                ['Pulsatilla Nigricans', 2, 'Thick yellow bland discharge.'],
            ],

            // Digestion: Unquenchable thirst for large quantities
            'DIG-01' => [
                ['Bryonia Alba', 1, 'Large drinks at long intervals.'],
                ['Phosphorus', 1, 'Craves ice-cold water in large quantities.'],
            ],
            // Digestion: Thirst for small sips
            'DIG-02' => [
                ['Arsenicum Album', 1, 'Drinks little and often; stomach cannot retain cold.'],
                ['China Officinalis', 2, 'Thirst for small sips during fever stage.'],
            ],
            // Digestion: Thirstlessness
            'DIG-03' => [
                ['Pulsatilla Nigricans', 1, 'Complete absence of thirst despite dry tongue.'],
                ['Apis Mellifica', 1, 'Thirstless in dropsy and fevers.'],
                ['Gelsemium Sempervirens', 2, 'Thirstless in acute influenza.'],
            ],
            // Digestion: Persistent nausea with clean tongue
            'DIG-04' => [
                ['Ipecacuanha', 1, 'Constant nausea, clean tongue, un-relieved by vomiting.'],
                ['Tabacum', 2, 'Nausea, cold sweat, worse motion.'],
            ],
            // Digestion: Acid dyspepsia after meals
            'DIG-05' => [
                ['Nux Vomica', 1, 'Weight in epigastrium 1-2 hours after food.'],
                ['Robinia', 1, 'Excessive acidity, sour vomiting.'],
                ['Lycopodium Clavatum', 2, 'Bloating immediately after few mouthfuls.'],
            ],

            // Abdomen: Colic relieved bending double
            'ABD-01' => [
                ['Colocynthis', 1, 'Violent cramps, relieved by hard pressure and double bending.'],
                ['Magnesia Phosphorica', 1, 'Relieved by warmth and bending double.'],
                ['Chamomilla', 2, 'Colic in irritable teething children.'],
            ],
            // Abdomen: Morning diarrhea at 5 AM
            'ABD-02' => [
                ['Sulphur', 1, 'Drives out of bed at 5 AM; burning stool.'],
                ['Aloe Socotrina', 1, 'Early morning diarrhea with urgency and gurgling.'],
                ['Podophyllum', 2, 'Painless profuse gushing morning stool.'],
            ],
            // Abdomen: Frequent ineffectual urging
            'ABD-03' => [
                ['Nux Vomica', 1, 'Constant ineffectual desire; passes little each time.'],
                ['Lycopodium Clavatum', 2, 'Ineffectual urging with painful constriction.'],
            ],
            // Abdomen: Flatulence & constant fanning
            'ABD-04' => [
                ['Carbo Vegetabilis', 1, 'Upper abdominal gas, air hunger, craves fanning.'],
                ['Lycopodium Clavatum', 1, 'Lower abdomen distended; fermenting gas.'],
                ['China Officinalis', 2, 'Whole abdomen bloated, not relieved by passing gas.'],
            ],

            // Urinary: Burning and cutting pain
            'URI-01' => [
                ['Cantharis', 1, 'Intense burning, constant desire, drop by drop.'],
                ['Mercurius Corrosivus', 1, 'Severe tenesmus of bladder.'],
                ['Apis Mellifica', 2, 'Stinging burning micturition.'],
            ],

            // Respiratory: Suffocative cough after midnight
            'RESP-01' => [
                ['Spongia Tosta', 1, 'Dry barking cough like sawing a board.'],
                ['Aconitum Napellus', 1, 'Croupy cough after exposure to cold dry wind.'],
                ['Drosera Rotundifolia', 2, 'Spasmodic cough in deep paroxysms.'],
            ],
            // Respiratory: Rattling cough, cannot expectorate
            'RESP-03' => [
                ['Antimonium Tartaricum', 1, 'Chest full of mucus, too weak to expectorate.'],
                ['Ipecacuanha', 2, 'Rattling in chest with nausea and vomiting of mucus.'],
            ],

            // Extremities: Worse first motion, better continued movement
            'EXT-01' => [
                ['Rhus Toxicodendron', 1, 'Rusty hinge modality; better continued motion and heat.'],
                ['Ruta Graveolens', 2, 'Stiffness of tendons and periosteum.'],
            ],
            // Extremities: Bruised sore aching as if beaten
            'EXT-03' => [
                ['Arnica Montana', 1, 'Sore bruised feeling; bed feels too hard.'],
                ['Baptisia Tinctoria', 2, 'Bed feels too hard in septic fever.'],
            ],
            // Extremities: Nerve injury pain
            'EXT-04' => [
                ['Hypericum Perforatum', 1, 'Crushed fingertips, falls on coccyx; shooting pains upward.'],
                ['Ledum Palustre', 2, 'Punctured wounds, relieved by cold.'],
            ],
            // Extremities: Burning in soles at night
            'EXT-05' => [
                ['Sulphur', 1, 'Puts feet out of bed covers to cool them.'],
                ['Chamomilla', 2, 'Burning in soles at night with irritability.'],
                ['Medorrhinum', 2, 'Burning hands and feet; must uncover them.'],
            ],

            // Skin: Intense itching worse bed warmth
            'SKIN-01' => [
                ['Sulphur', 1, 'Voluptuous itching, burning after scratching; worse washing.'],
                ['Psorinum', 1, 'Intolerable itching, unwashed look of skin.'],
                ['Mezereum', 2, 'Itching worse in bed, thick scabs with pus beneath.'],
            ],
            // Skin: Warts and condylomata
            'SKIN-03' => [
                ['Thuja Occidentalis', 1, 'Specific for fig-warts, cauliflower excrescences.'],
                ['Nitric Acid', 1, 'Splinter-like pains in warts; bleeding easily.'],
                ['Causticum', 2, 'Warts on eyelids, face, near nails.'],
            ],
            // Skin: Urticaria with stinging pain
            'SKIN-04' => [
                ['Apis Mellifica', 1, 'Rosy red swellings with stinging burning, better cold water.'],
                ['Urtica Urens', 1, 'Itching nettle-rash with burning heat.'],
            ],

            // Fever: Sudden acute high fever with anxiety
            'FEV-01' => [
                ['Aconitum Napellus', 1, 'Sudden dry fever, restlessness, agony.'],
                ['Belladonna', 1, 'Sudden violent fever, hot dry skin, dilated pupils.'],
            ],
            // Fever: Profound soreness, apathy, heavy limbs
            'FEV-02' => [
                ['Gelsemium Sempervirens', 1, 'Dull, drowsy, dizzy; trembling and thirstless.'],
                ['Eupatorium Perfoliatum', 1, 'Deep bone-breaking ache before fever.'],
            ],

            // Generalities: Burning pains relieved by heat
            'GEN-02' => [
                ['Arsenicum Album', 1, 'Burning pains like hot coals, relieved by heat and hot drinks.'],
                ['Capsicum', 2, 'Burning pains in mucous membranes.'],
            ],
            // Generalities: Worse 4 PM to 8 PM
            'GEN-04' => [
                ['Lycopodium Clavatum', 1, 'Aggravation 4 PM - 8 PM; right to left direction.'],
                ['Helleborus', 2, 'Drop-sy and stupor worse 4-8 PM.'],
            ],
        ];

        $remediesCache = Medicine::pluck('id', 'name')->toArray();
        $symptomsCache = Symptom::pluck('id', 'code')->toArray();

        foreach ($mappings as $symptomCode => $remedyList) {
            $symptomId = $symptomsCache[$symptomCode] ?? null;
            if (! $symptomId) {
                continue;
            }

            foreach ($remedyList as [$remedyName, $priority, $note]) {
                // Find medicine id (case-insensitive search if exact not found)
                $medicineId = $remediesCache[$remedyName] ?? null;
                if (! $medicineId) {
                    $found = Medicine::where('name', 'like', "%{$remedyName}%")->first();
                    $medicineId = $found?->id;
                }

                if ($medicineId) {
                    SymptomMedicineMap::updateOrCreate(
                        [
                            'symptom_id' => $symptomId,
                            'medicine_id' => $medicineId,
                        ],
                        [
                            'priority' => $priority,
                            'note' => $note,
                            'source_title' => 'Kent Repertory of Homeopathic Materia Medica',
                            'source_author' => 'Dr. James Tyler Kent',
                            'review_status' => 'approved',
                            'is_approved' => true,
                            'reviewed_at' => now(),
                        ]
                    );
                }
            }
        }
    }
}
