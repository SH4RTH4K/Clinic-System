<?php

namespace Database\Seeders;

use App\Models\FoodRestriction;
use Illuminate\Database\Seeder;

class FoodRestrictionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $items = [
            // 1. Classical Homeopathic Antidotes
            [
                'category' => 'homeopathic_antidote',
                'text_bn' => 'কাঁচা পেঁয়াজ ও কাঁচা রসুন খাওয়া সম্পূর্ণ নিষেধ (হোমিও ঔষধের প্রতিষেধক)।',
                'text_en' => 'Avoid raw onion and raw garlic (antidotes homeopathic remedies).',
                'is_default' => true,
                'sort_order' => 1,
            ],
            [
                'category' => 'homeopathic_antidote',
                'text_bn' => 'তীব্র বা কড়া কফি পান করা সম্পূর্ণরূপে পরিহার করুন।',
                'text_en' => 'Avoid strong coffee and caffeine stimulants.',
                'is_default' => true,
                'sort_order' => 2,
            ],
            [
                'category' => 'homeopathic_antidote',
                'text_bn' => 'কর্পূর, মেন্থল, কড়া বাম, ইউক্যালিপটাস ও তীব্র সুগন্ধিযুক্ত বস্তু থেকে দূরে থাকুন।',
                'text_en' => 'Avoid camphor, menthol, strong pain balms, and intense perfumes.',
                'is_default' => true,
                'sort_order' => 3,
            ],
            [
                'category' => 'homeopathic_antidote',
                'text_bn' => 'পান, সুপারি, জর্দা, গুল, বিড়ি, সিগারেট ও তামাকজাতীয় দ্রব্য সম্পূর্ণ নিষেধ।',
                'text_en' => 'No betel leaf, nut, zarda, tobacco, or smoking.',
                'is_default' => true,
                'sort_order' => 4,
            ],

            // 2. Sour & Cold Items
            [
                'category' => 'sour_cold',
                'text_bn' => 'ফ্রিজের অতিরিক্ত ঠাণ্ডা পানি, বরফ ও আইসক্রিম খাওয়া সম্পূর্ণরূপে পরিহার করুন।',
                'text_en' => 'Avoid refrigerated cold water, ice, and ice cream.',
                'is_default' => true,
                'sort_order' => 5,
            ],
            [
                'category' => 'sour_cold',
                'text_bn' => 'তেঁতুল, আচার, চালতা ও অতিরিক্ত টক জাতীয় খাবার পরিহার করুন।',
                'text_en' => 'Avoid tamarind, pickles, and excessively sour foods.',
                'is_default' => false,
                'sort_order' => 6,
            ],
            [
                'category' => 'sour_cold',
                'text_bn' => 'টক দই ও লেবুর অতিরিক্ত টক শরবত এড়িয়ে চলুন।',
                'text_en' => 'Avoid sour yogurt and highly acidic lemon juice.',
                'is_default' => false,
                'sort_order' => 7,
            ],

            // 3. Spicy & Oily Foods
            [
                'category' => 'spicy_oily',
                'text_bn' => 'অতিরিক্ত তৈলাক্ত, ভাজাপোড়া, পরোটা ও ফাস্টফুড খাওয়া নিষেধ।',
                'text_en' => 'Avoid deep-fried, oily snacks, parathas, and fast food.',
                'is_default' => true,
                'sort_order' => 8,
            ],
            [
                'category' => 'spicy_oily',
                'text_bn' => 'অতিরিক্ত লাল মরিচ, গরম মশলা ও ঝাঁঝালো তরকারি পরিহার করুন।',
                'text_en' => 'Avoid excess red chili, heavy spices, and pungent curries.',
                'is_default' => false,
                'sort_order' => 9,
            ],
            [
                'category' => 'spicy_oily',
                'text_bn' => 'বাসি, পচা ও খোলা দোকানের খাবার সম্পূর্ণ পরিহার করুন।',
                'text_en' => 'Avoid stale, fermented, or unhygienic street food.',
                'is_default' => false,
                'sort_order' => 10,
            ],

            // 4. Allergenic & High-Histamine Foods
            [
                'category' => 'allergic_histamine',
                'text_bn' => 'চিংড়ি মাছ, কাঁকড়া ও সামুদ্রিক মাছ খাওয়া পরিহার করুন।',
                'text_en' => 'Avoid prawns, shrimp, crab, and shellfish.',
                'is_default' => false,
                'sort_order' => 11,
            ],
            [
                'category' => 'allergic_histamine',
                'text_bn' => 'ইলিশ মাছ, বোয়াল মাছ ও পাঙ্গাশ মাছ খাওয়া নিষেধ।',
                'text_en' => 'Avoid hilsa fish and high-fat oily fish.',
                'is_default' => false,
                'sort_order' => 12,
            ],
            [
                'category' => 'allergic_histamine',
                'text_bn' => 'হাঁসের মাংস এবং হাঁসের ডিম খাওয়া এড়িয়ে চলুন।',
                'text_en' => 'Avoid duck meat and duck eggs.',
                'is_default' => false,
                'sort_order' => 13,
            ],
            [
                'category' => 'allergic_histamine',
                'text_bn' => 'গরু বা খাসির লাল মাংস (Red Meat) সাময়িকভাবে পরিহার করুন।',
                'text_en' => 'Avoid beef and mutton (red meat).',
                'is_default' => false,
                'sort_order' => 14,
            ],
            [
                'category' => 'allergic_histamine',
                'text_bn' => 'বেগুন, পুঁইশাক, কচু ও কচুশাক খাওয়া এড়িয়ে চলুন।',
                'text_en' => 'Avoid brinjal (eggplant), pui shak, and taro.',
                'is_default' => false,
                'sort_order' => 15,
            ],
            [
                'category' => 'allergic_histamine',
                'text_bn' => 'যেসব খাবারে আপনার পূর্বে এলার্জি বা চুলকানি হয়েছে তা সম্পূর্ণ পরিহার করুন।',
                'text_en' => 'Avoid any food that previously triggered personal allergic reactions.',
                'is_default' => true,
                'sort_order' => 16,
            ],

            // 5. Chronic & Metabolic Care
            [
                'category' => 'chronic_metabolic',
                'text_bn' => 'খাবারের সাথে আলাদা কাঁচা লবণ (Table Salt) গ্রহণ সম্পূর্ণরূপে বন্ধ রাখুন।',
                'text_en' => 'Strictly avoid raw/added table salt.',
                'is_default' => true,
                'sort_order' => 17,
            ],
            [
                'category' => 'chronic_metabolic',
                'text_bn' => 'চিনি, মিষ্টি, পায়েস ও মিষ্টিজাতীয় মিষ্টি খাদ্য সম্পূর্ণরূপে পরিহার করুন।',
                'text_en' => 'Avoid direct sugar, sweets, desserts, and confectionery.',
                'is_default' => false,
                'sort_order' => 18,
            ],
            [
                'category' => 'chronic_metabolic',
                'text_bn' => 'বোতলজাত কোমল পানীয়, কার্বনেটেড ড্রিংকস ও কৃত্রিম জুস পরিহার করুন।',
                'text_en' => 'Avoid carbonated soft drinks, sodas, and artificial fruit juices.',
                'is_default' => false,
                'sort_order' => 19,
            ],
            [
                'category' => 'chronic_metabolic',
                'text_bn' => 'অতিরিক্ত চর্বিযুক্ত মাংস, খাসির চর্বি, চামড়াযুক্ত মুরগি ও মগজ পরিহার করুন।',
                'text_en' => 'Avoid animal fat, organ meats, brain, and skin-on poultry.',
                'is_default' => false,
                'sort_order' => 20,
            ],
            [
                'category' => 'chronic_metabolic',
                'text_bn' => 'অতিরিক্ত ডাল, ঘন মসুর ডাল ও লাল মাংস পরিহার করুন (ইউরিক এসিড রোগীর জন্য)।',
                'text_en' => 'Restrict lentils, thick pulses, and red meat (for high uric acid/gout).',
                'is_default' => false,
                'sort_order' => 21,
            ],

            // 6. General Dietary Rules
            [
                'category' => 'general',
                'text_bn' => 'কড়া চা বারবার পান করা থেকে বিরত থাকুন (দিনে ১-২ কাপের বেশি নয়)।',
                'text_en' => 'Avoid frequent strong tea (limit to maximum 1–2 cups daily).',
                'is_default' => false,
                'sort_order' => 22,
            ],
            [
                'category' => 'general',
                'text_bn' => 'খাবার খাওয়ার পরপরই অতিরিক্ত পানি পান করা থেকে বিরত থাকুন।',
                'text_en' => 'Avoid gulping large quantities of water immediately after meals.',
                'is_default' => false,
                'sort_order' => 23,
            ],
            [
                'category' => 'general',
                'text_bn' => 'রাতের খাবার দেরিতে গ্রহণ না করে ঘুমানোর অন্তত ২ ঘণ্টা আগে সম্পন্ন করুন।',
                'text_en' => 'Avoid late-night dinners; finish meals at least 2 hours before bed.',
                'is_default' => false,
                'sort_order' => 24,
            ],
            [
                'category' => 'general',
                'text_bn' => 'প্রক্রিয়াজাত প্যাকেটজাত স্ন্যাকস, চিপস ও কৃত্রিম প্রিজারভেটিভযুক্ত খাদ্য বর্জন করুন।',
                'text_en' => 'Avoid ultra-processed packaged snacks, chips, and foods with preservatives.',
                'is_default' => false,
                'sort_order' => 25,
            ],
        ];

        foreach ($items as $item) {
            FoodRestriction::updateOrCreate(
                ['text_bn' => $item['text_bn']],
                [
                    'text_en' => $item['text_en'],
                    'category' => $item['category'],
                    'is_default' => $item['is_default'],
                    'is_active' => true,
                    'sort_order' => $item['sort_order'],
                ]
            );
        }
    }
}
