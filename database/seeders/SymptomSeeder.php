<?php

namespace Database\Seeders;

use App\Models\Symptom;
use Illuminate\Database\Seeder;

class SymptomSeeder extends Seeder
{
    public function run(): void
    {
        $rubrics = [
            // Chapter: Mind & Disposition (মন ও আবেগ) 🧠
            [
                'name_en' => 'Anxiety with restless tossing and fear of death',
                'name_bn' => 'মৃত্যুভয় ও তীব্র মানসিক অস্থিরতা সহ ছটফটানি',
                'category' => 'mind',
                'code' => 'MIND-01',
                'modalities' => '< Midnight (12 AM - 2 AM), solitary; > Company, warm drinks',
            ],
            [
                'name_en' => 'Irritability and impatience; cannot bear contradiction or noise',
                'name_bn' => 'অসহিষ্ণুতা, খিটখিটে মেজাজ ও সামান্য শব্দে বিরক্তি',
                'category' => 'mind',
                'code' => 'MIND-02',
                'modalities' => '< Morning, stimulants, mental exertion; > Evening, rest',
            ],
            [
                'name_en' => 'Grief, silent weeping with sighing and emotional shock',
                'name_bn' => 'নীরব শোক, দীর্ঘশ্বাস ফেলা ও মানসিক আঘাতের কুফল',
                'category' => 'mind',
                'code' => 'MIND-03',
                'modalities' => '< Consolation, morning, tobacco smoke; > Changing position, swallowing',
            ],
            [
                'name_en' => 'Mild, timid and yielding disposition; weeps easily, craves sympathy',
                'name_bn' => 'নম্র স্বভাব, সহজে কান্না ও সহানুভূতি প্রত্যাশী',
                'category' => 'mind',
                'code' => 'MIND-04',
                'modalities' => '< Warm close room, rich food; > Open cool air, gentle walking, sympathy',
            ],
            [
                'name_en' => 'Anticipatory anxiety with diarrhea and trembling before events',
                'name_bn' => 'পরীক্ষা বা যেকোনো কাজের আগে উৎকণ্ঠা, কাঁপুনি ও পাতলা পায়খানা',
                'category' => 'mind',
                'code' => 'MIND-05',
                'modalities' => '< Bad news, excitement, tobacco; > Profuse urination, motion',
            ],

            // Chapter: Head & Vertigo (মাথা ও মাথাঘোরা) 🤕
            [
                'name_en' => 'Throbbing congestive headache with hot red face and dilated pupils',
                'name_bn' => 'রক্তাধিক্য দপদপানি মাথাব্যথা, লালচে উত্তপ্ত মুখমণ্ডল',
                'category' => 'head',
                'code' => 'HEAD-01',
                'modalities' => '< Touch, noise, light, jarring, lying flat; > Semi-erect posture, bending backward',
            ],
            [
                'name_en' => 'Bursting headache worse slightest motion or opening eyes',
                'name_bn' => 'মাথা ফেটে যাওয়ার মতো ব্যথা যা সামান্য নড়াচড়া বা চোখ খুললে বৃদ্ধি',
                'category' => 'head',
                'code' => 'HEAD-02',
                'modalities' => '< Motion, coughing, morning; > Absolute rest, lying on painful side, firm pressure',
            ],
            [
                'name_en' => 'Occipital headache extending to forehead with heavy drooping eyelids',
                'name_bn' => 'ঘাড়ের পেছন থেকে কপাল পর্যন্ত বিস্তৃত ভারি মাথাব্যথা ও চোখের পাতা ঝুলে পড়া',
                'category' => 'head',
                'code' => 'HEAD-03',
                'modalities' => '< Damp weather, mental anticipation, heat of sun; > Copious urination, stimulants',
            ],
            [
                'name_en' => 'Right-sided migraine beginning in occiput spreading over right eye',
                'name_bn' => 'ডানপাশের আধকপালি মাথাব্যথা যা ঘাড় থেকে শুরু হয়ে ডান চোখে ছড়ায়',
                'category' => 'head',
                'code' => 'HEAD-04',
                'modalities' => '< Morning, sun, noise, motion; > Sleep, darkness, resting head on pillows',
            ],
            [
                'name_en' => 'Vertigo on rising from bed or turning head quickly',
                'name_bn' => 'বিছানা থেকে উঠলে বা মাথা ঘোরালে মাথাঘোরা',
                'category' => 'head',
                'code' => 'HEAD-05',
                'modalities' => '< Looking down, rising, motion; > Lying down, keeping still',
            ],

            // Chapter: Eyes, Ears, Nose & Throat (চোখ, কান, নাক ও গলা) 👃
            [
                'name_en' => 'Acrid watery nasal discharge with bland lachrymation and frequent sneezing',
                'name_bn' => 'নাক দিয়ে ক্ষয়কারী সর্দি এবং চোখ দিয়ে জ্বালাহীন জল ও হাঁচি',
                'category' => 'eyes_ent',
                'code' => 'ENT-01',
                'modalities' => '< Warm room, evening; > Open fresh cold air',
            ],
            [
                'name_en' => 'Bland profuse nasal discharge with acrid burning tears',
                'name_bn' => 'নাক দিয়ে নির্দোষ সর্দি কিন্তু চোখ দিয়ে তীব্র জ্বালাকর অশ্রুক্ষরণ',
                'category' => 'eyes_ent',
                'code' => 'ENT-02',
                'modalities' => '< Sunlight, wind, indoors; > Darkness, wiping eyes',
            ],
            [
                'name_en' => 'Sore throat worse swallowing liquids, better swallowing solids',
                'name_bn' => 'গলাব্যথা যা তরল গিলার সময় বৃদ্ধি কিন্তু শক্ত খাবার গিললে উপশম',
                'category' => 'eyes_ent',
                'code' => 'ENT-03',
                'modalities' => '< Swallowing liquids, warm drinks, after sleep; > Swallowing solids',
            ],
            [
                'name_en' => 'Loss of smell and taste with thick yellow-green non-irritating discharge',
                'name_bn' => 'ঘ্রাণ ও স্বাদহীনতা সহ ঘন হলদে-সবুজ ক্ষতহীন নাকের স্রাব',
                'category' => 'eyes_ent',
                'code' => 'ENT-04',
                'modalities' => '< Warm close room, evening; > Open cool air',
            ],

            // Chapter: Stomach, Thirst & Appetite (পাকস্থলী, পিপাসা ও ক্ষুধা) 🍽️
            [
                'name_en' => 'Unquenchable thirst for large quantities of cold water at long intervals',
                'name_bn' => 'দীর্ঘ বিরতিতে প্রচুর পরিমাণে ঠাণ্ডা পানি পানের তীব্র পিপাসা',
                'category' => 'digestion',
                'code' => 'DIG-01',
                'modalities' => '< Warmth, motion; > Cold drinks, absolute quiet',
            ],
            [
                'name_en' => 'Intense thirst for small sips of cold water at frequent intervals',
                'name_bn' => 'ঘন ঘন সামান্য পরিমাণে পানি পানের তৃষ্ণা যা পেটে বেশিক্ষণ থাকে না',
                'category' => 'digestion',
                'code' => 'DIG-02',
                'modalities' => '< Cold drinks, midnight (12-2 AM); > Warm drinks, warm applications',
            ],
            [
                'name_en' => 'Complete thirstlessness with dry mouth and dry tongue',
                'name_bn' => 'মুখ ও জিহ্বা শুষ্ক থাকা সত্ত্বেও কোনো পানির পিপাসা না থাকা',
                'category' => 'digestion',
                'code' => 'DIG-03',
                'modalities' => '< Warm room, rich greasy food; > Open cool air, gentle motion',
            ],
            [
                'name_en' => 'Persistent nausea with clean tongue, un-relieved by vomiting',
                'name_bn' => 'পরিষ্কার জিহ্বাসহতীব্র অবিরত বমিভাব যা বমি হলেও উপশম হয় না',
                'category' => 'digestion',
                'code' => 'DIG-04',
                'modalities' => '< Lying down, moist warm wind, movement; > Open air',
            ],
            [
                'name_en' => 'Acid dyspepsia, sour belching and burning in epigastrium after meals',
                'name_bn' => 'টক ঢেকুর, বুক জ্বালাপোড়া ও অ্যাসিড বদহজম',
                'category' => 'digestion',
                'code' => 'DIG-05',
                'modalities' => '< 1-2 hours after eating, coffee, alcohol, spices; > Brief rest, warm drinks',
            ],
            [
                'name_en' => 'Craving for cold drinks and ice creams; vomits as soon as water becomes warm in stomach',
                'name_bn' => 'ঠাণ্ডা পানি ও আইসক্রিমের তীব্র ইচ্ছা; পানি পেটে গরম হলেই বমি হয়ে যায়',
                'category' => 'digestion',
                'code' => 'DIG-06',
                'modalities' => '< Lying on left side, warm food/drink; > Cold food, sleep, rubbing',
            ],

            // Chapter: Abdomen, Rectum & Stool (তলপেট ও মল) 🩺
            [
                'name_en' => 'Severe griping abdominal colic relieved by bending double and hard pressure',
                'name_bn' => 'তীব্র পেট কামড়ানো খিল ধরা ব্যথা যা সামনে কুঁজো হলে ও শক্ত চাপে উপশম',
                'category' => 'abdomen_stool',
                'code' => 'ABD-01',
                'modalities' => '< Anger, slight food intake, upright posture; > Bending double, hard pressure, warmth',
            ],
            [
                'name_en' => 'Early morning diarrhea driving patient out of bed at 5 AM',
                'name_bn' => 'ভোরবেলা (৫টায়) বিছানা ত্যাগে বাধ্যকারী ডায়রিয়া ও মলদ্বারে জ্বালা',
                'category' => 'abdomen_stool',
                'code' => 'ABD-02',
                'modalities' => '< 5 AM, standing, warmth of bed; > Dry warm weather',
            ],
            [
                'name_en' => 'Frequent ineffectual urging for stool with feeling that rectum is never emptied',
                'name_bn' => 'ঘন ঘন নিষ্ফল মলবেগ এবং মনে হয় মলদ্বার সম্পূর্ণ খালি হয়নি',
                'category' => 'abdomen_stool',
                'code' => 'ABD-03',
                'modalities' => '< Morning, stimulants, sedentary life; > After evacuation, rest',
            ],
            [
                'name_en' => 'Excessive tympanitic abdominal distension and flatulence; craves constant fanning',
                'name_bn' => 'পেট অসম্ভব ফাঁপা ও গ্যাস; শরীরে বাতাস করার জন্য ব্যাকুলতা',
                'category' => 'abdomen_stool',
                'code' => 'ABD-04',
                'modalities' => '< Butter, rich fat food, lying down; > Eructation, constant fanning, fresh air',
            ],
            [
                'name_en' => 'Dysentery with tenesmus and burning in rectum; stool mixed with jelly-like mucus',
                'name_bn' => 'জ্বালাময় আমাশয়, কোঁথ দেওয়া ও আঠালো আমযুক্ত মল',
                'category' => 'abdomen_stool',
                'code' => 'ABD-05',
                'modalities' => '< Night, damp weather; > Warmth, quiet rest',
            ],

            // Chapter: Urinary Organs (মূত্রযন্ত্র) 🧪
            [
                'name_en' => 'Violent burning and cutting pain before, during and after urination',
                'name_bn' => 'প্রস্রাবের আগে, চলাকালীন ও পরে অসহ্য জ্বালা ও সূচ ফোটার মতো ব্যথা',
                'category' => 'urinary',
                'code' => 'URI-01',
                'modalities' => '< Urination, drinking cold water; > Gentle warmth, rest',
            ],
            [
                'name_en' => 'Involuntary spurting of urine while coughing, sneezing or laughing',
                'name_bn' => 'কাশি, হাঁচি বা হাসির সময় অনিচ্ছাকৃত প্রস্রাব ফোঁটা ফোঁটা ঝরে পড়া',
                'category' => 'urinary',
                'code' => 'URI-02',
                'modalities' => '< Coughing, sneezing, pregnancy; > Lying quietly',
            ],
            [
                'name_en' => 'Frequent nocturnal urination with red sand-like sediment in urine',
                'name_bn' => 'ঘন ঘন রাতের প্রস্রাব এবং প্রস্রাবের নিচে লাল বালির মতো তলানি জমা',
                'category' => 'urinary',
                'code' => 'URI-03',
                'modalities' => '< 4 PM - 8 PM, cold food; > Warm drinks, passing flatus',
            ],

            // Chapter: Respiratory & Cough (শ্বাসযন্ত্র ও কাশি) 🫁
            [
                'name_en' => 'Suffocative barking cough coming on suddenly after midnight',
                'name_bn' => 'মধ্যরাতের পর হঠাৎ দমবন্ধ করা ঘেউ ঘেউ কাশি ও শ্বাসকষ্ট',
                'category' => 'respiratory',
                'code' => 'RESP-01',
                'modalities' => '< Cold dry wind, midnight, lying with head low; > Warm drinks, bending forward',
            ],
            [
                'name_en' => 'Dry hacking cough worse entering a warm room from cold air',
                'name_bn' => 'ঠাণ্ডা থেকে গরম ঘরে ঢুকলে শুকনো খুসখুসে কাশির তীব্র বৃদ্ধি',
                'category' => 'respiratory',
                'code' => 'RESP-02',
                'modalities' => '< Entering warm room, evening, talking, lying flat; > Sitting up, cold drinks',
            ],
            [
                'name_en' => 'Loose rattling cough with much mucus in chest but inability to expectorate',
                'name_bn' => 'বুকে প্রচুর কফের ঘড়ঘড়ানি শব্দ কিন্তু কফ তুলতে না পারা',
                'category' => 'respiratory',
                'code' => 'RESP-03',
                'modalities' => '< Warm room, lying flat, eating; > Sitting upright, expectoration, cool air',
            ],
            [
                'name_en' => 'Asthmatic wheezing worse 2 AM to 4 AM; must sit bent forward to breathe',
                'name_bn' => 'রাত ২টা থেকে ৪টার মধ্যে হাঁপানির টান বৃদ্ধি; সামনে ঝুঁকে বসে থাকতে হয়',
                'category' => 'respiratory',
                'code' => 'RESP-04',
                'modalities' => '< 2 AM - 4 AM, cold air, exertion; > Sitting bent forward, resting elbows on knees',
            ],
            [
                'name_en' => 'Paroxysmal spasmodic cough ending in retching or vomiting of stringy mucus',
                'name_bn' => 'আক্ষেপিক হুপিং কাশি যা শেষে বমি বা লম্বা তারের মতো আঠালো কফ উঠে শেষ হয়',
                'category' => 'respiratory',
                'code' => 'RESP-05',
                'modalities' => '< After midnight, lying down, warmth of bed; > Walking in cool air',
            ],

            // Chapter: Extremities & Locomotor (হাত-পা ও বাতের ব্যথা) 🦵
            [
                'name_en' => 'Joint pain worse on first beginning motion, but relieved by continued gentle movement',
                'name_bn' => 'প্রথম নড়াচড়ায় তীব্র বাতের ব্যথা কিন্তু কিছুক্ষণ হাঁটাচলা করলে উপশম',
                'category' => 'extremities',
                'code' => 'EXT-01',
                'modalities' => '< Initial motion, cold damp weather, rest; > Continued motion, warm applications, dry weather',
            ],
            [
                'name_en' => 'Stitching arthritic pain worse slightest motion, better absolute rest and firm pressure',
                'name_bn' => 'সুচ ফোটার মতো বাতের ব্যথা যা সামান্য নড়াচড়ায় বৃদ্ধি কিন্তু পূর্ণ বিশ্রামে উপশম',
                'category' => 'extremities',
                'code' => 'EXT-02',
                'modalities' => '< Motion, deep breathing, warmth; > Absolute rest, lying on affected side, pressure',
            ],
            [
                'name_en' => 'Sore bruised aching in all limbs as if beaten after injury or physical strain',
                'name_bn' => 'আঘাত বা অতিরিক্ত পরিশ্রমে সমস্ত শরীরে থেঁতলে যাওয়ার মতো ব্যথা',
                'category' => 'extremities',
                'code' => 'EXT-03',
                'modalities' => '< Touch, jarring, damp cold, lying on hard bed; > Lying with head low, gentle rest',
            ],
            [
                'name_en' => 'Severe nerve injury pain, shooting upward along nerve path after crushed fingers/toes',
                'name_bn' => 'আঙুল চাপা পড়া বা স্নায়ুর আঘাতে তীব্র তীরবিদ্ধ যন্ত্রণা যা ওপরের দিকে ধাবিত হয়',
                'category' => 'extremities',
                'code' => 'EXT-04',
                'modalities' => '< Touch, cold, damp, fog; > Gentle rubbing, quiet warmth',
            ],
            [
                'name_en' => 'Burning pain in soles of feet at night; must stick feet out of bed covers',
                'name_bn' => 'রাতে পায়ের তলায় অসহ্য জ্বালাপোড়া; বিছানার চাদরের বাইরে পা বের করে রাখতে হয়',
                'category' => 'extremities',
                'code' => 'EXT-05',
                'modalities' => '< Warmth of bed, standing, washing; > Putting feet on cool floor, open air',
            ],
            [
                'name_en' => 'Stiffness and bruising of tendons after sprains, strains or lifting heavy weights',
                'name_bn' => 'ভারী জিনিস তোলা বা মচকে যাওয়ার পর রগ ও সন্ধির আড়ষ্টতা ও ব্যথা',
                'category' => 'extremities',
                'code' => 'EXT-06',
                'modalities' => '< Cold wet weather, rest, sprains; > Warmth, continued motion',
            ],

            // Chapter: Skin & Eruptions (চর্মরোগ ও চুলকানি) 🩹
            [
                'name_en' => 'Intense voluptuous itching worse warmth of bed and washing with water',
                'name_bn' => 'বিছানার গরমে ও পানিতে ধুলে তীব্র চুলকানি বৃদ্ধি',
                'category' => 'skin',
                'code' => 'SKIN-01',
                'modalities' => '< Warmth of bed, bathing/washing, evening; > Scratching until it bleeds, open air',
            ],
            [
                'name_en' => 'Dry, scaly, cracked eczema bleeding easily, especially on hands and skin folds',
                'name_bn' => 'হাত ও ত্বকের ভাঁজে শুষ্ক, ফাটা, খসখসে একজিমা যা থেকে সহজে রক্ত পড়ে',
                'category' => 'skin',
                'code' => 'SKIN-02',
                'modalities' => '< Winter, washing, cold air; > Warm wrapping, dry atmosphere',
            ],
            [
                'name_en' => 'Warts on hands, face and anogenital region; fig-warts and condylomata',
                'name_bn' => 'হাত, মুখ ও মলদ্বারে আঁচিল ও মাংসাঙ্কুর',
                'category' => 'skin',
                'code' => 'SKIN-03',
                'modalities' => '< Cold damp air, vaccination, 3 AM / 3 PM; > Warm dry weather',
            ],
            [
                'name_en' => 'Urticarial eruptions with stinging burning pain, worse warmth and heat',
                'name_bn' => 'মৌমাছি হুল ফোটানোর মতো জ্বালাকর আমবাত যা তাপে তীব্র বৃদ্ধি পায়',
                'category' => 'skin',
                'code' => 'SKIN-04',
                'modalities' => '< Heat, warm room, touch, right side; > Cold water applications, open air',
            ],
            [
                'name_en' => 'Pustular unhealthy skin where every little scratch suppurates and turns into sore',
                'name_bn' => 'ক্ষুদ্র আঁচড় বা চোটেই পুঁজ জমে ঘা হয়ে যাওয়া অপুষ্ট ত্বক',
                'category' => 'skin',
                'code' => 'SKIN-05',
                'modalities' => '< Cold air, uncovered body, winter; > Warmth, warm wrapping to head',
            ],

            // Chapter: Fever, Chills & Sweat (জ্বর, শীতভাব ও ঘাম) 🌡️
            [
                'name_en' => 'Sudden acute high fever with dry burning skin, restlessness and agonizing fear',
                'name_bn' => 'হঠাৎ তীব্র জ্বর, চামড়া শুষ্ক ও উত্তপ্ত, ছটফটানি ও ভীতি',
                'category' => 'fever',
                'code' => 'FEV-01',
                'modalities' => '< Evening/night, cold dry wind; > Uncovering, open room',
            ],
            [
                'name_en' => 'Fever with profound muscular soreness, apathy, heavy limbs and absence of thirst',
                'name_bn' => 'পিপাসাহীন জ্বর, সমস্ত শরীর ভারি ও ম্যাজম্যাজ করা, অসাড়তা ও অবসাদ',
                'category' => 'fever',
                'code' => 'FEV-02',
                'modalities' => '< Damp warm weather, thunderstorm, motion; > Copious urination, rest',
            ],
            [
                'name_en' => 'Periodic inter-current chills beginning in back, followed by high heat with sweat',
                'name_bn' => 'পিঠে কাঁপুনি দিয়ে শুরু হওয়া পর্যায়বৃত্ত শীতভাব ও পরবর্তী ঘর্মযুক্ত জ্বর',
                'category' => 'fever',
                'code' => 'FEV-03',
                'modalities' => '< Periodic interval, draft of air; > External warmth, drinking warm liquids',
            ],

            // Chapter: Generalities & Modalities (সাধারণ লক্ষণ ও উপশম/বৃদ্ধি) ⚡
            [
                'name_en' => 'Aggravation from cold damp weather, fog and living in basements',
                'name_bn' => 'স্যাঁতসেঁতে ভেজা আবহাওয়া, কুয়াশা ও স্যাঁতসেঁতে ঘরে থাকার কুফল',
                'category' => 'generalities',
                'code' => 'GEN-01',
                'modalities' => '< Damp weather, getting wet, before storms; > Dry warm weather',
            ],
            [
                'name_en' => 'Burning pains throughout body relieved by warm applications and hot drinks',
                'name_bn' => 'শরীরের বিভিন্ন অঙ্গে তীব্র জ্বালাপোড়া যা গরম সেঁক বা গরম পানীয়ে উপশম',
                'category' => 'generalities',
                'code' => 'GEN-02',
                'modalities' => '< Cold applications, midnight; > Warmth, hot drinks, heat',
            ],
            [
                'name_en' => 'Left-sided complaints or symptoms beginning on left side spreading to right',
                'name_bn' => 'বামপাশের রোগলক্ষণ বা রোগ বামপাশ থেকে শুরু হয়ে ডানপাশে ছড়ানো',
                'category' => 'generalities',
                'code' => 'GEN-03',
                'modalities' => '< After sleep, tight neck collar, hot bath; > Onset of discharges, cool air',
            ],
            [
                'name_en' => 'Right-sided complaints or symptoms spreading from right to left; worse 4 PM to 8 PM',
                'name_bn' => 'ডানপাশের রোগলক্ষণ যা বামপাশে ছড়ায়; বিকাল ৪টা থেকে রাত ৮টায় বৃদ্ধি',
                'category' => 'generalities',
                'code' => 'GEN-04',
                'modalities' => '< 4 PM - 8 PM, cold food, pressure of clothes; > Warm food/drink, motion',
            ],
        ];

        foreach ($rubrics as $rubric) {
            Symptom::updateOrCreate(
                ['name_en' => $rubric['name_en']],
                [
                    ...$rubric,
                    'is_active' => true,
                ]
            );
        }
    }
}
