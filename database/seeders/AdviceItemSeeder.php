<?php

namespace Database\Seeders;

use App\Models\AdviceItem;
use Illuminate\Database\Seeder;

class AdviceItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $items = [
            // 1. Core Homeopathic Administration (Prescription Pad Standard)
            [
                'category' => 'homeopathic',
                'text_bn' => 'নিয়মিত ঔষধ খাবেন এবং খাবার আগে শিশি ১০ বার ঝাঁকিয়ে নিবেন।',
                'text_en' => 'Take medicine regularly and shake the bottle 10 times before each dose/meal.',
                'is_default' => true,
                'sort_order' => 1,
            ],
            [
                'category' => 'homeopathic',
                'text_bn' => 'ঔষধ সেবনের ৩০ মিনিট পূর্বে ও পরে যেকোনো খাবার বা পানীয় পরিহার করুন।',
                'text_en' => 'Avoid food, drinks, or smoking 30 minutes before and after taking medicine.',
                'is_default' => true,
                'sort_order' => 2,
            ],
            [
                'category' => 'homeopathic',
                'text_bn' => 'ঔষধ জিহ্বায় রেখে ধীরে ধীরে চুষে সেবন করবেন, হাত দিয়ে স্পর্শ করবেন না।',
                'text_en' => 'Dissolve medicine on the tongue slowly; do not touch globules with bare hands.',
                'is_default' => true,
                'sort_order' => 3,
            ],
            [
                'category' => 'homeopathic',
                'text_bn' => 'ঔষধ কড়া গন্ধযুক্ত বস্তু (যেমন কর্পূর, মেন্থল, আতর, কফি, কাঁচা পেঁয়াজ) থেকে দূরে রাখুন।',
                'text_en' => 'Keep homeopathic remedy away from strong odors (camphor, menthol, coffee, perfume).',
                'is_default' => true,
                'sort_order' => 4,
            ],
            [
                'category' => 'homeopathic',
                'text_bn' => 'কাঁচের বা পরিষ্কার পাত্রে ঔষধের ড্রপ বা পানি মিশিয়ে সেবন করুন।',
                'text_en' => 'Take dilution drops mixed in pure water using a clean glass or porcelain cup.',
                'is_default' => false,
                'sort_order' => 5,
            ],
            [
                'category' => 'homeopathic',
                'text_bn' => 'লক্ষণ সম্পূর্ণ উপশম হলে চিকিৎসকের পরামর্শ ব্যতিরেকে অতিরিক্ত ডোজ সেবন করবেন না।',
                'text_en' => 'Discontinue remedy once symptoms resolve completely unless advised otherwise.',
                'is_default' => false,
                'sort_order' => 6,
            ],

            // 2. General Health, Hydration & Follow-Up Instructions
            [
                'category' => 'general',
                'text_bn' => 'বিশুদ্ধ পানি পান করবেন এবং নিয়মিত বিশ্রাম নিবেন।',
                'text_en' => 'Drink pure boiled water and ensure adequate regular rest.',
                'is_default' => true,
                'sort_order' => 7,
            ],
            [
                'category' => 'general',
                'text_bn' => 'পরবর্তী সাক্ষাতের সময় ব্যবস্থাপত্র অবশ্যই সঙ্গে আনিবেন।',
                'text_en' => 'Please bring this prescription along with you on your next follow-up visit.',
                'is_default' => true,
                'sort_order' => 8,
            ],

            // 2. General Health & Medication Adherence
            [
                'category' => 'general',
                'text_bn' => 'প্রতিদিন পর্যাপ্ত পরিমাণে (অন্তত ২.৫ থেকে ৩ লিটার) বিশুদ্ধ পানি পান করুন।',
                'text_en' => 'Drink adequate pure water daily (at least 2.5 to 3 liters).',
                'is_default' => true,
                'sort_order' => 6,
            ],
            [
                'category' => 'general',
                'text_bn' => 'চিকিৎসকের নির্দেশিত নিয়ম অনুযায়ী নির্দিষ্ট সময়ে নিয়মিত ঔষধ সেবন করুন।',
                'text_en' => 'Take all prescribed medications regularly at designated scheduled times.',
                'is_default' => true,
                'sort_order' => 7,
            ],
            [
                'category' => 'general',
                'text_bn' => 'ঔষধ ঠাণ্ডা, শুষ্ক ও সূর্যের আলো থেকে দূরে নিরাপদ স্থানে সংরক্ষণ করুন।',
                'text_en' => 'Store medicines in a cool, dry place away from direct sunlight.',
                'is_default' => false,
                'sort_order' => 8,
            ],
            [
                'category' => 'general',
                'text_bn' => 'পরবর্তী সাক্ষাতের দিন পূর্বের সমস্ত প্রেসক্রিপশন ও টেস্টের রিপোর্ট সাথে নিয়ে আসবেন।',
                'text_en' => 'Bring all previous prescriptions and diagnostic reports on your follow-up visit.',
                'is_default' => false,
                'sort_order' => 9,
            ],

            // 3. Lifestyle & Rest
            [
                'category' => 'lifestyle',
                'text_bn' => 'পর্যাপ্ত বিশ্রাম গ্রহণ করুন এবং প্রতিদিন অন্তত ৭-৮ ঘণ্টা নিরবচ্ছিন্ন ঘুমান।',
                'text_en' => 'Ensure adequate physical rest and maintain 7-8 hours of sound sleep daily.',
                'is_default' => true,
                'sort_order' => 10,
            ],
            [
                'category' => 'lifestyle',
                'text_bn' => 'প্রতিদিন অন্তত ২০-৩০ মিনিট মুক্ত বাতাসে হালকা হাঁটাচলা বা ব্যায়াম করুন।',
                'text_en' => 'Engage in light walking or physical exercise for 20-30 minutes daily in fresh air.',
                'is_default' => false,
                'sort_order' => 11,
            ],
            [
                'category' => 'lifestyle',
                'text_bn' => 'অতিরিক্ত মানসিক চাপ, দুঃশ্চিন্তা ও রাত জাগার অভ্যাস পরিহার করুন।',
                'text_en' => 'Avoid chronic mental stress, anxiety, and late-night awakening.',
                'is_default' => false,
                'sort_order' => 12,
            ],
            [
                'category' => 'lifestyle',
                'text_bn' => 'ঠাণ্ডা বাতাস, ধুলোবালি ও ধোঁয়াটে পরিবেশ থেকে নিজেকে সুরক্ষিত রাখুন।',
                'text_en' => 'Protect yourself from cold drafts, dust exposure, and smoke-filled environments.',
                'is_default' => false,
                'sort_order' => 13,
            ],

            // 4. Diet & Nutrition
            [
                'category' => 'diet',
                'text_bn' => 'অতিরিক্ত তৈলাক্ত, ভাজাপোড়া, ফাস্টফুড ও গুরুপাক খাবার সম্পূর্ণ পরিহার করুন।',
                'text_en' => 'Avoid excessively oily, fried, fast foods, and heavy meals.',
                'is_default' => true,
                'sort_order' => 14,
            ],
            [
                'category' => 'diet',
                'text_bn' => 'সহজপাচ্য, পুষ্টিকর ও ঘরে তৈরি তাজা খাবার সময়মত গ্রহণ করুন।',
                'text_en' => 'Consume easily digestible, nutrient-dense, and freshly cooked home meals on time.',
                'is_default' => false,
                'sort_order' => 15,
            ],
            [
                'category' => 'diet',
                'text_bn' => 'অতিরিক্ত কাঁচা লবণ, চিনি এবং কোমল পানীয় (সফট ড্রিংকস) পরিহার করুন।',
                'text_en' => 'Limit raw table salt, refined sugars, and carbonated soft drinks.',
                'is_default' => false,
                'sort_order' => 16,
            ],
            [
                'category' => 'diet',
                'text_bn' => 'প্রচুর পরিমাণে তাজা মৌসুমি ফলমূল ও শাকসবজি আহারে অন্তর্ভুক্ত করুন।',
                'text_en' => 'Include abundant fresh seasonal fruits and green vegetables in daily diet.',
                'is_default' => false,
                'sort_order' => 17,
            ],
            [
                'category' => 'diet',
                'text_bn' => 'খাবার ধীরে ধীরে ভালো করে চিবিয়ে আহার করুন।',
                'text_en' => 'Chew food thoroughly and slowly during every meal.',
                'is_default' => false,
                'sort_order' => 18,
            ],

            // 5. Hygiene & Sanitation
            [
                'category' => 'hygiene',
                'text_bn' => 'খাবার গ্রহণের পূর্বে ও শৌচাগার ব্যবহারের পর সাবান দিয়ে হাত ভালোভাবে পরিষ্কার করুন।',
                'text_en' => 'Wash hands thoroughly with soap before eating and after using the restroom.',
                'is_default' => true,
                'sort_order' => 19,
            ],
            [
                'category' => 'hygiene',
                'text_bn' => 'দাঁত ও মুখের স্বাস্থ্য সুরক্ষায় প্রতিদিন সকালে ও রাতে আহারের পর দাঁত ব্রাশ করুন।',
                'text_en' => 'Brush teeth twice daily (morning and before bedtime) for optimal oral hygiene.',
                'is_default' => false,
                'sort_order' => 20,
            ],
            [
                'category' => 'hygiene',
                'text_bn' => 'রোগীর ব্যবহৃত পোশাক, বিছানার চাদর ও তোয়ালে নিয়মিত ধুয়ে পরিষ্কার রাখুন।',
                'text_en' => 'Maintain personal cleanliness and wash patient clothing and bed linens regularly.',
                'is_default' => false,
                'sort_order' => 21,
            ],

            // 6. Warnings, Safety & Emergency
            [
                'category' => 'warning',
                'text_bn' => 'কোনো তীব্র পার্শ্বপ্রতিক্রিয়া, তীব্র শ্বাসকষ্ট বা তীব্র বুকে ব্যথা অনুভূত হলে অবিলম্বে জরুরি বিভাগে যোগাযোগ করুন।',
                'text_en' => 'In case of severe shortness of breath or acute chest pain, seek immediate emergency care.',
                'is_default' => true,
                'sort_order' => 22,
            ],
            [
                'category' => 'warning',
                'text_bn' => 'ঔষধ সেবনের পর কোনো ধরনের অ্যালার্জি দেখা দিলে তাৎক্ষণিক ঔষধ বন্ধ করে ক্লিনিকে জানান।',
                'text_en' => 'Stop medication immediately and inform the clinic if any allergic reaction occurs.',
                'is_default' => false,
                'sort_order' => 23,
            ],
            [
                'category' => 'warning',
                'text_bn' => 'লক্ষণ অপরিবর্তিত থাকলে বা নতুন উপসর্গ দেখা দিলে চিকিৎসকের পুনর্মূল্যায়ন গ্রহণ করুন।',
                'text_en' => 'Seek physician re-evaluation promptly if symptoms persist without improvement or worsen.',
                'is_default' => false,
                'sort_order' => 24,
            ],
            [
                'category' => 'warning',
                'text_bn' => 'কোনো ওষুধ শেষ হওয়ার পর চিকিৎসকের পরামর্শ ব্যতীত নিজে থেকে পুনরায় ক্রয় করে সেবন করবেন না।',
                'text_en' => 'Do not refill or continue medications without doctor review and authorization.',
                'is_default' => false,
                'sort_order' => 25,
            ],
        ];

        foreach ($items as $item) {
            AdviceItem::updateOrCreate(
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
