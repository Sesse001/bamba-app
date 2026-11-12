// scripts/generate-seed.js
// ONE-TIME generator — writes scripts/seed.js with all 300 items (100 per language, 4 tiers).
//
// Run: node scripts/generate-seed.js
// Then: node scripts/seed.js
//
// This script does NOT connect to Firebase. It only writes a JavaScript file
// to disk that, when run separately, will seed Firestore.

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// LANGUAGES
// ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  { id: 'zu', code: 'zu', name: 'isiZulu', nativeName: 'isiZulu', family: 'Nguni', regions: ['KwaZulu-Natal', 'Gauteng'] },
  { id: 'st', code: 'st', name: 'Sesotho', nativeName: 'Sesotho', family: 'Sotho-Tswana', regions: ['Free State', 'Gauteng', 'Limpopo'] },
  { id: 'ts', code: 'ts', name: 'Xitsonga', nativeName: 'Xitsonga', family: 'Tswa-Ronga', regions: ['Limpopo', 'Mpumalanga'] },
];

// ─────────────────────────────────────────────────────────────
// COMPACT DATA
// Format: [suffix, type, prompt, difficulty, tags, translations]
// translations: [[suffix, text, status, extra?], ...]
// tier is derived from index: 1-25=tier1, 26-50=tier2, 51-75=tier3, 76-100=tier4
// ─────────────────────────────────────────────────────────────

const DATA = {
  zu: [
    // ─── Tier 1 (1-25) ───
    ['greeting_hello','word','Hello',1,['greeting'],[['sawubona','Sawubona','reviewed',{register:'formal'}],['sanibonani','Sanibonani','reviewed',{register:'formal'}]]],
    ['greeting_hi_casual','word','Hi (casual)',1,['greeting'],[['he','He','community_supported',{register:'casual'}]]],
    ['greeting_thank_you','phrase','Thank you',1,['greeting'],[['ngiyabonga','Ngiyabonga','reviewed']]],
    ['greeting_goodbye','word','Goodbye',1,['greeting'],[['sala_kahle','Sala kahle','reviewed',{region:'KwaZulu-Natal'}],['hamba_kahle','Hamba kahle','reviewed',{region:'KwaZulu-Natal'}]]],
    ['phrase_how_are_you','phrase','How are you?',1,['greeting'],[['unjeni','Unjani?','reviewed']]],
    ['phrase_i_am_fine','phrase',"I'm fine",1,['greeting'],[['ngiyaphila','Ngiyaphila','reviewed']]],
    ['word_water','word','Water',1,['food'],[['amanzi','Amanzi','reviewed']]],
    ['word_food','word','Food',1,['food'],[['ukudla','Ukudla','reviewed']]],
    ['phrase_go_home','sentence',"I'm going home now",1,['daily'],[['ngiya_ehaya','Ngiya ekhaya manje','reviewed']]],
    ['word_yes','word','Yes',1,['daily'],[['yebo','Yebo','reviewed']]],
    ['word_no','word','No',1,['daily'],[['cha','Cha','reviewed']]],
    ['phrase_good_morning','phrase','Good morning',1,['greeting'],[['sawubona_ekuseni','Sawubona ekuseni','reviewed']]],
    ['phrase_good_night','phrase','Good night',1,['greeting'],[['lala_kahle','Lala kahle','reviewed']]],
    ['phrase_please','phrase','Please',1,['polite'],[['ngicela','Ngicela','reviewed']]],
    ['word_dog','word','Dog',1,['animals'],[['inja','Inja','reviewed']]],
    ['word_cat','word','Cat',1,['animals'],[['ikati','Ikati','reviewed']]],
    ['word_house','word','House',1,['daily'],[['indlu','Indlu','reviewed']]],
    ['word_car','word','Car',1,['daily'],[['imoto','Imoto','reviewed']]],
    ['word_friend','word','Friend',1,['social'],[['umngane','Umngane','reviewed']]],
    ['word_book','word','Book',1,['objects'],[['incwadi','Incwadi','reviewed']]],
    ['word_school','word','School',1,['places'],[['isikole','Isikole','reviewed']]],
    ['word_sun','word','Sun',1,['nature'],[['ilanga','Ilanga','reviewed']]],
    ['word_moon','word','Moon',1,['nature'],[['inyanga','Inyanga','reviewed']]],
    ['word_fire','word','Fire',1,['nature'],[['umlilo','Umlilo','reviewed']]],
    ['word_rain','word','Rain',1,['nature'],[['imvula','Imvula','reviewed']]],
    // ─── Tier 2 (26-50) ───
    ['word_one','word','One',2,['numbers'],[['kunye','Kunye','reviewed']]],
    ['word_two','word','Two',2,['numbers'],[['kubili','Kubili','reviewed']]],
    ['word_three','word','Three',2,['numbers'],[['kuthathu','Kuthathu','reviewed']]],
    ['word_four','word','Four',2,['numbers'],[['kune','Kune','reviewed']]],
    ['word_five','word','Five',2,['numbers'],[['kuhlanu','Kuhlanu','reviewed']]],
    ['word_six','word','Six',2,['numbers'],[['isithupha','Isithupha','reviewed']]],
    ['word_seven','word','Seven',2,['numbers'],[['isikhombisa','Isikhombisa','reviewed']]],
    ['word_eight','word','Eight',2,['numbers'],[['isishiyagalombili','Isishiyagalombili','reviewed']]],
    ['word_nine','word','Nine',2,['numbers'],[['isishiyagalolunye','Isishiyagalolunye','reviewed']]],
    ['word_ten','word','Ten',2,['numbers'],[['ishumi','Ishumi','reviewed']]],
    ['word_red','word','Red',2,['colors'],[['bomvu','Bomvu','reviewed']]],
    ['word_blue','word','Blue',2,['colors'],[['luhlaza','Luhlaza','reviewed']]],
    ['word_green','word','Green',2,['colors'],[['luhlaza_okusalayo','Luhlaza (okusalayo)','reviewed']]],
    ['word_yellow','word','Yellow',2,['colors'],[['phuzi','Phuzi','reviewed']]],
    ['word_black','word','Black',2,['colors'],[['mnyama','Mnyama','reviewed']]],
    ['word_white','word','White',2,['colors'],[['mhlophe','Mhlophe','reviewed']]],
    ['word_mother','word','Mother',2,['family'],[['umama','Umama','reviewed']]],
    ['word_father','word','Father',2,['family'],[['ubaba','Ubaba','reviewed']]],
    ['word_child','word','Child',2,['family'],[['ingane','Ingane','reviewed']]],
    ['word_brother','word','Brother',2,['family'],[['umfowethu','Umfowethu','reviewed']]],
    ['word_sister','word','Sister',2,['family'],[['udade_wethu','Udade wethu','reviewed']]],
    ['word_grandmother','word','Grandmother',2,['family'],[['ugogo','Ugogo','reviewed']]],
    ['word_grandfather','word','Grandfather',2,['family'],[['umkhulu','Umkhulu','reviewed']]],
    ['phrase_excuse_me','phrase','Excuse me',2,['polite'],[['uxolo','Uxolo','reviewed']]],
    ['phrase_youre_welcome','phrase',"You're welcome",2,['polite'],[['ku_hle','Ku hle','reviewed']]],
    // ─── Tier 3 (51-75) ───
    ['word_happy','word','Happy',3,['emotions'],[['jabulile','Jabulile','reviewed']]],
    ['word_sad','word','Sad',3,['emotions'],[['phathekile','Phathekile','reviewed']]],
    ['word_tired','word','Tired',3,['emotions'],[['khathele','Khathele','reviewed']]],
    ['word_hungry','word','Hungry',3,['emotions'],[['lambile','Lambile','reviewed']]],
    ['word_angry','word','Angry',3,['emotions'],[['thukuthele','Thukuthele','reviewed']]],
    ['word_bread','word','Bread',3,['food'],[['isinkwa','Isinkwa','reviewed']]],
    ['word_meat','word','Meat',3,['food'],[['inyama','Inyama','reviewed']]],
    ['word_milk','word','Milk',3,['food'],[['ubisi','Ubisi','reviewed']]],
    ['word_tea','word','Tea',3,['food'],[['itiye','Itiye','reviewed']]],
    ['word_left','word','Left',3,['directions'],[['kwesobunxele','Kwesobunxele','reviewed']]],
    ['word_right','word','Right',3,['directions'],[['kwesokudla','Kwesokudla','reviewed']]],
    ['word_here','word','Here',3,['directions'],[['lapha','Lapha','reviewed']]],
    ['word_there','word','There',3,['directions'],[['laphaya','Laphaya','reviewed']]],
    ['word_up','word','Up',3,['directions'],[['phezulu','Phezulu','reviewed']]],
    ['word_down','word','Down',3,['directions'],[['phansi','Phansi','reviewed']]],
    ['word_head','word','Head',3,['body'],[['ikhanda','Ikhanda','reviewed']]],
    ['word_hand','word','Hand',3,['body'],[['isandla','Isandla','reviewed']]],
    ['word_eye','word','Eye',3,['body'],[['iso','Iso','reviewed']]],
    ['word_foot','word','Foot',3,['body'],[['unyawo','Unyawo','reviewed']]],
    ['word_heart','word','Heart',3,['body'],[['inhliziyo','Inhliziyo','reviewed']]],
    ['word_mountain','word','Mountain',3,['nature'],[['intaba','Intaba','reviewed']]],
    ['word_river','word','River',3,['nature'],[['umfula','Umfula','reviewed']]],
    ['word_tree','word','Tree',3,['nature'],[['isihlahla','Isihlahla','reviewed']]],
    ['word_flower','word','Flower',3,['nature'],[['imbali','Imbali','reviewed']]],
    ['word_bird','word','Bird',3,['animals'],[['inyoni','Inyoni','reviewed']]],
    // ─── Tier 4 (76-100) ───
    ['word_today','word','Today',4,['time'],[['namuhla','Namuhla','reviewed']]],
    ['word_tomorrow','word','Tomorrow',4,['time'],[['kusasa','Kusasa','reviewed']]],
    ['word_yesterday','word','Yesterday',4,['time'],[['izolo','Izolo','reviewed']]],
    ['word_morning','word','Morning',4,['time'],[['ekuseni','Ekuseni','reviewed']]],
    ['word_evening','word','Evening',4,['time'],[['kusihlwa','Kusihlwa','reviewed']]],
    ['word_hot','word','Hot',4,['weather'],[['shisayo','Shisayo','reviewed']]],
    ['word_cold','word','Cold',4,['weather'],[['bandayo','Bandayo','reviewed']]],
    ['word_to_go','word','To go',4,['verbs'],[['ukuhamba','Ukuhamba','reviewed']]],
    ['word_to_come','word','To come',4,['verbs'],[['ukuza','Ukuza','reviewed']]],
    ['word_to_eat','word','To eat',4,['verbs'],[['ukudla_verb','Ukudla','reviewed']]],
    ['word_to_sleep','word','To sleep',4,['verbs'],[['ukulala','Ukulala','reviewed']]],
    ['word_to_work','word','To work',4,['verbs'],[['ukusebenza','Ukusebenza','reviewed']]],
    ['word_to_read','word','To read',4,['verbs'],[['ukufunda','Ukufunda','reviewed']]],
    ['word_to_write','word','To write',4,['verbs'],[['ukubhala','Ukubhala','reviewed']]],
    ['word_to_speak','word','To speak',4,['verbs'],[['ukukhuluma','Ukukhuluma','reviewed']]],
    ['word_what','word','What',4,['questions'],[['ini','Ini','reviewed']]],
    ['word_who','word','Who',4,['questions'],[['ubani','Ubani','reviewed']]],
    ['word_where','word','Where',4,['questions'],[['kuphi','Kuphi','reviewed']]],
    ['word_when','word','When',4,['questions'],[['nini','Nini','reviewed']]],
    ['word_why','word','Why',4,['questions'],[['kungani','Kungani','reviewed']]],
    ['word_love','word','Love',4,['emotions'],[['uthando','Uthando','reviewed']]],
    ['word_hope','word','Hope',4,['emotions'],[['ithemba','Ithemba','reviewed']]],
    ['word_peace','word','Peace',4,['abstract'],[['ukuthula','Ukuthula','reviewed']]],
    ['word_truth','word','Truth',4,['abstract'],[['iqiniso','Iqiniso','reviewed']]],
    ['word_life','word','Life',4,['abstract'],[['impilo','Impilo','reviewed']]],
  ],

  st: [
    // ─── Tier 1 ───
    ['greeting_hello','word','Hello',1,['greeting'],[['dumela','Dumela','reviewed'],['lumela','Lumela','regional_variant',{region:'Lesotho'}]]],
    ['greeting_thank_you','phrase','Thank you',1,['greeting'],[['kea_lebohela','Kea leboha','reviewed']]],
    ['greeting_goodbye','phrase','Goodbye',1,['greeting'],[['sala_hantle','Sala hantle','reviewed']]],
    ['phrase_how_are_you','phrase','How are you?',1,['greeting'],[['o_kae','O kae?','reviewed']]],
    ['phrase_i_am_fine','phrase',"I'm fine",1,['greeting'],[['ke_teng','Ke teng','reviewed']]],
    ['word_water','word','Water',1,['food'],[['metsi','Metsi','reviewed']]],
    ['word_food','word','Food',1,['food'],[['lijo','Lijo','reviewed']]],
    ['phrase_go_home','sentence',"I'm going home now",1,['daily'],[['ke_ya_hae','Ke ya hae jwale','reviewed']]],
    ['word_yes','word','Yes',1,['daily'],[['e','E','reviewed']]],
    ['word_no','word','No',1,['daily'],[['che','Che','reviewed']]],
    ['greeting_hi_casual','word','Hi (casual)',1,['greeting'],[['hele','Hele','community_supported',{register:'casual'}]]],
    ['phrase_good_morning','phrase','Good morning',1,['greeting'],[['dumela_hoseng','Dumela hoseng','reviewed']]],
    ['phrase_good_night','phrase','Good night',1,['greeting'],[['robala_hantle','Roballa hantle','reviewed']]],
    ['phrase_please','phrase','Please',1,['polite'],[['ka_kopo','Ka kopo','reviewed']]],
    ['word_dog','word','Dog',1,['animals'],[['ntja','Ntja','reviewed']]],
    ['word_cat','word','Cat',1,['animals'],[['katse','Katse','reviewed']]],
    ['word_house','word','House',1,['daily'],[['ntlo','Ntlo','reviewed']]],
    ['word_car','word','Car',1,['daily'],[['koloi','Koloi','reviewed']]],
    ['word_friend','word','Friend',1,['social'],[['motswalle','Motswalle','reviewed']]],
    ['word_book','word','Book',1,['objects'],[['buka','Buka','reviewed']]],
    ['word_school','word','School',1,['places'],[['sekolo','Sekolo','reviewed']]],
    ['word_sun','word','Sun',1,['nature'],[['letsatsi','Letsatsi','reviewed']]],
    ['word_moon','word','Moon',1,['nature'],[['kgwedi','Kgwedi','reviewed']]],
    ['word_fire','word','Fire',1,['nature'],[['mollo','Mollo','reviewed']]],
    ['word_rain','word','Rain',1,['nature'],[['pula','Pula','reviewed']]],
    // ─── Tier 2 ───
    ['word_one','word','One',2,['numbers'],[['ngoe','Ngoe','reviewed']]],
    ['word_two','word','Two',2,['numbers'],[['pedi','Pedi','reviewed']]],
    ['word_three','word','Three',2,['numbers'],[['tharo','Tharo','reviewed']]],
    ['word_four','word','Four',2,['numbers'],[['nne','Nne','reviewed']]],
    ['word_five','word','Five',2,['numbers'],[['hlano','Hlano','reviewed']]],
    ['word_six','word','Six',2,['numbers'],[['tshelela','Tshelela','reviewed']]],
    ['word_seven','word','Seven',2,['numbers'],[['supa','Supa','reviewed']]],
    ['word_eight','word','Eight',2,['numbers'],[['robedi','Robedi','reviewed']]],
    ['word_nine','word','Nine',2,['numbers'],[['robong','Robong','reviewed']]],
    ['word_ten','word','Ten',2,['numbers'],[['leshome','Leshome','reviewed']]],
    ['word_red','word','Red',2,['colors'],[['khubelu','Khubelu','reviewed']]],
    ['word_blue','word','Blue',2,['colors'],[['talama','Talama','reviewed']]],
    ['word_green','word','Green',2,['colors'],[['talamane','Talamane','reviewed']]],
    ['word_yellow','word','Yellow',2,['colors'],[['tsehla','Tsehla','reviewed']]],
    ['word_black','word','Black',2,['colors'],[['ntsho','Ntsho','reviewed']]],
    ['word_white','word','White',2,['colors'],[['tshweu','Tshweu','reviewed']]],
    ['word_mother','word','Mother',2,['family'],[['mme','Mme','reviewed']]],
    ['word_father','word','Father',2,['family'],[['ntate','Ntate','reviewed']]],
    ['word_child','word','Child',2,['family'],[['ngwana','Ngwana','reviewed']]],
    ['word_brother','word','Brother',2,['family'],[['moena','Moena','reviewed']]],
    ['word_sister','word','Sister',2,['family'],[['ausi','Ausi','reviewed']]],
    ['word_grandmother','word','Grandmother',2,['family'],[['nkgono','Nkgono','reviewed']]],
    ['word_grandfather','word','Grandfather',2,['family'],[['ntatemoholo','Ntatemoholo','reviewed']]],
    ['phrase_excuse_me','phrase','Excuse me',2,['polite'],[['tshwarelo','Tshwarelo','reviewed']]],
    ['phrase_youre_welcome','phrase',"You're welcome",2,['polite'],[['ho_lokile','Ho lokile','reviewed']]],
    // ─── Tier 3 ───
    ['word_happy','word','Happy',3,['emotions'],[['thabileng','Thabileng','reviewed']]],
    ['word_sad','word','Sad',3,['emotions'],[['hlomohile','Hlomohile','reviewed']]],
    ['word_tired','word','Tired',3,['emotions'],[['kgathetse','Kgathetse','reviewed']]],
    ['word_hungry','word','Hungry',3,['emotions'],[['lapile','Lapile','reviewed']]],
    ['word_angry','word','Angry',3,['emotions'],[['halefile','Halefile','reviewed']]],
    ['word_bread','word','Bread',3,['food'],[['bohobe','Bohobe','reviewed']]],
    ['word_meat','word','Meat',3,['food'],[['nama','Nama','reviewed']]],
    ['word_milk','word','Milk',3,['food'],[['lebese','Lebese','reviewed']]],
    ['word_tea','word','Tea',3,['food'],[['tee','Tee','reviewed']]],
    ['word_left','word','Left',3,['directions'],[['letshehadi','Letshehadi','reviewed']]],
    ['word_right','word','Right',3,['directions'],[['letoneng','Letoneng','reviewed']]],
    ['word_here','word','Here',3,['directions'],[['mona','Mona','reviewed']]],
    ['word_there','word','There',3,['directions'],[['moo','Moo','reviewed']]],
    ['word_up','word','Up',3,['directions'],[['hodimo','Hodimo','reviewed']]],
    ['word_down','word','Down',3,['directions'],[['tlase','Tlase','reviewed']]],
    ['word_head','word','Head',3,['body'],[['hlooho','Hlooho','reviewed']]],
    ['word_hand','word','Hand',3,['body'],[['letsoho','Letsoho','reviewed']]],
    ['word_eye','word','Eye',3,['body'],[['leihlo','Leihlo','reviewed']]],
    ['word_foot','word','Foot',3,['body'],[['leoto','Leoto','reviewed']]],
    ['word_heart','word','Heart',3,['body'],[['pelo','Pelo','reviewed']]],
    ['word_mountain','word','Mountain',3,['nature'],[['thaba','Thaba','reviewed']]],
    ['word_river','word','River',3,['nature'],[['noka','Noka','reviewed']]],
    ['word_tree','word','Tree',3,['nature'],[['sefate','Sefate','reviewed']]],
    ['word_flower','word','Flower',3,['nature'],[['palesa','Palesa','reviewed']]],
    ['word_bird','word','Bird',3,['animals'],[['nonyana','Nonyana','reviewed']]],
    // ─── Tier 4 ───
    ['word_today','word','Today',4,['time'],[['kajeno','Kajeno','reviewed']]],
    ['word_tomorrow','word','Tomorrow',4,['time'],[['hosane','Hosane','reviewed']]],
    ['word_yesterday','word','Yesterday',4,['time'],[['maobane','Maobane','reviewed']]],
    ['word_morning','word','Morning',4,['time'],[['hoseng','Hoseng','reviewed']]],
    ['word_evening','word','Evening',4,['time'],[['mantsiboya','Mantsiboya','reviewed']]],
    ['word_hot','word','Hot',4,['weather'],[['chesa','Chesa','reviewed']]],
    ['word_cold','word','Cold',4,['weather'],[['batang','Batang','reviewed']]],
    ['word_to_go','word','To go',4,['verbs'],[['ho_tsamaya','Ho tsamaya','reviewed']]],
    ['word_to_come','word','To come',4,['verbs'],[['ho_tla','Ho tla','reviewed']]],
    ['word_to_eat','word','To eat',4,['verbs'],[['ho_ja','Ho ja','reviewed']]],
    ['word_to_sleep','word','To sleep',4,['verbs'],[['ho_robala','Ho robala','reviewed']]],
    ['word_to_work','word','To work',4,['verbs'],[['ho_sebetsa','Ho sebetsa','reviewed']]],
    ['word_to_read','word','To read',4,['verbs'],[['ho_bala','Ho bala','reviewed']]],
    ['word_to_write','word','To write',4,['verbs'],[['ho_ngola','Ho ngola','reviewed']]],
    ['word_to_speak','word','To speak',4,['verbs'],[['ho_buoa','Ho buoa','reviewed']]],
    ['word_what','word','What',4,['questions'],[['eng','Eng','reviewed']]],
    ['word_who','word','Who',4,['questions'],[['mang','Mang','reviewed']]],
    ['word_where','word','Where',4,['questions'],[['kae','Kae','reviewed']]],
    ['word_when','word','When',4,['questions'],[['neng','Neng','reviewed']]],
    ['word_why','word','Why',4,['questions'],[['hobaneng','Hobaneng','reviewed']]],
    ['word_love','word','Love',4,['emotions'],[['lerato','Lerato','reviewed']]],
    ['word_hope','word','Hope',4,['emotions'],[['tshepo','Tshepo','reviewed']]],
    ['word_peace','word','Peace',4,['abstract'],[['kgotso','Kgotso','reviewed']]],
    ['word_truth','word','Truth',4,['abstract'],[['nnete','Nnete','reviewed']]],
    ['word_life','word','Life',4,['abstract'],[['bophelo','Bophelo','reviewed']]],
  ],

  ts: [
    // ─── Tier 1 ───
    ['greeting_hello','word','Hello',1,['greeting'],[['avuxeni','Avuxeni','reviewed']]],
    ['greeting_thank_you','phrase','Thank you',1,['greeting'],[['ndza_khensa','Ndza khensa','reviewed']]],
    ['greeting_goodbye','phrase','Goodbye',1,['greeting'],[['salani_kahle','Salani kahle','reviewed']]],
    ['phrase_how_are_you','phrase','How are you?',1,['greeting'],[['ku_njani','Ku njhani?','reviewed']]],
    ['phrase_i_am_fine','phrase',"I'm fine",1,['greeting'],[['ndzi_hanya','Ndzi hanya kahle','reviewed']]],
    ['word_water','word','Water',1,['food'],[['mati','Mati','reviewed']]],
    ['word_food','word','Food',1,['food'],[['swakudya','Swakudya','reviewed']]],
    ['phrase_go_home','sentence',"I'm going home now",1,['daily'],[['ndzi_ya_ekaya','Ndzi ya ekaya sweswi','reviewed']]],
    ['word_yes','word','Yes',1,['daily'],[['ina','Ina','reviewed']]],
    ['word_no','word','No',1,['daily'],[['e_e','E-e','reviewed']]],
    ['greeting_hi_casual','word','Hi (casual)',1,['greeting'],[['hai','Hai','community_supported',{register:'casual'}]]],
    ['phrase_good_morning','phrase','Good morning',1,['greeting'],[['avuxeni_mixo','Avuxeni mixo','reviewed']]],
    ['phrase_good_night','phrase','Good night',1,['greeting'],[['etlela_kahle','Etlela kahle','reviewed']]],
    ['phrase_please','phrase','Please',1,['polite'],[['ndzi_kombela','Ndzi kombela','reviewed']]],
    ['word_dog','word','Dog',1,['animals'],[['mbyana','Mbyana','reviewed']]],
    ['word_cat','word','Cat',1,['animals'],[['xinyenyana_xa_katse','Xinyenyana xa katse','reviewed']]],
    ['word_house','word','House',1,['daily'],[['yindlu','Yindlu','reviewed']]],
    ['word_car','word','Car',1,['daily'],[['movha','Movha','reviewed']]],
    ['word_friend','word','Friend',1,['social'],[['munghana','Munghana','reviewed']]],
    ['word_book','word','Book',1,['objects'],[['buku','Buku','reviewed']]],
    ['word_school','word','School',1,['places'],[['xikolo','Xikolo','reviewed']]],
    ['word_sun','word','Sun',1,['nature'],[['dyambu','Dyambu','reviewed']]],
    ['word_moon','word','Moon',1,['nature'],[['nhweti','Nhweti','reviewed']]],
    ['word_fire','word','Fire',1,['nature'],[['ndzilo','Ndzilo','reviewed']]],
    ['word_rain','word','Rain',1,['nature'],[['mpfula','Mpfula','reviewed']]],
    // ─── Tier 2 ───
    ['word_one','word','One',2,['numbers'],[['nwe','Nwe','reviewed']]],
    ['word_two','word','Two',2,['numbers'],[['mbirhi','Mbirhi','reviewed']]],
    ['word_three','word','Three',2,['numbers'],[['nharhu','Nharhu','reviewed']]],
    ['word_four','word','Four',2,['numbers'],[['mune','Mune','reviewed']]],
    ['word_five','word','Five',2,['numbers'],[['ntlhanu','Ntlhanu','reviewed']]],
    ['word_six','word','Six',2,['numbers'],[['ntsevu','Ntsevu','reviewed']]],
    ['word_seven','word','Seven',2,['numbers'],[['nkombo','Nkombo','reviewed']]],
    ['word_eight','word','Eight',2,['numbers'],[['nhungu','Nhungu','reviewed']]],
    ['word_nine','word','Nine',2,['numbers'],[['kaye','Kaye','reviewed']]],
    ['word_ten','word','Ten',2,['numbers'],[['khume','Khume','reviewed']]],
    ['word_red','word','Red',2,['colors'],[['tshuka','Tshuka','reviewed']]],
    ['word_blue','word','Blue',2,['colors'],[['wasibasa','Wasibasa','reviewed']]],
    ['word_green','word','Green',2,['colors'],[['rihlaza','Rihlaza','reviewed']]],
    ['word_yellow','word','Yellow',2,['colors'],[['nyamaza','Nyamaza','reviewed']]],
    ['word_black','word','Black',2,['colors'],[['ntima','Ntima','reviewed']]],
    ['word_white','word','White',2,['colors'],[['basa','Basa','reviewed']]],
    ['word_mother','word','Mother',2,['family'],[['manana','Manana','reviewed']]],
    ['word_father','word','Father',2,['family'],[['tatana','Tatana','reviewed']]],
    ['word_child','word','Child',2,['family'],[['nwana','Nwana','reviewed']]],
    ['word_brother','word','Brother',2,['family'],[['makwerhu','Makwerhu','reviewed']]],
    ['word_sister','word','Sister',2,['family'],[['dadana','Dadana','reviewed']]],
    ['word_grandmother','word','Grandmother',2,['family'],[['kokwana','Kokwana','reviewed']]],
    ['word_grandfather','word','Grandfather',2,['family'],[['kokwana_lonene','Kokwana lonene','reviewed']]],
    ['phrase_excuse_me','phrase','Excuse me',2,['polite'],[['ndzi_lava_ku_tiyisela','Ndzi lava ku tiyisela','reviewed']]],
    ['phrase_youre_welcome','phrase',"You're welcome",2,['polite'],[['swi_lungile','Swi lungile','reviewed']]],
    // ─── Tier 3 ───
    ['word_happy','word','Happy',3,['emotions'],[['ku_tsaka','Ku tsaka','reviewed']]],
    ['word_sad','word','Sad',3,['emotions'],[['ku_hlupheka','Ku hlupheka','reviewed']]],
    ['word_tired','word','Tired',3,['emotions'],[['ku_karhala','Ku karhala','reviewed']]],
    ['word_hungry','word','Hungry',3,['emotions'],[['ndzi_tala_ndlala','Ndzi tala ndlala','reviewed']]],
    ['word_angry','word','Angry',3,['emotions'],[['ku_hlarhuka','Ku hlarhuka','reviewed']]],
    ['word_bread','word','Bread',3,['food'],[['xinkwa','Xinkwa','reviewed']]],
    ['word_meat','word','Meat',3,['food'],[['nyama','Nyama','reviewed']]],
    ['word_milk','word','Milk',3,['food'],[['masi','Masi','reviewed']]],
    ['word_tea','word','Tea',3,['food'],[['tiya','Tiya','reviewed']]],
    ['word_left','word','Left',3,['directions'],[['eximatsini','Eximatsini','reviewed']]],
    ['word_right','word','Right',3,['directions'],[['exinene','Exinene','reviewed']]],
    ['word_here','word','Here',3,['directions'],[['laha','Laha','reviewed']]],
    ['word_there','word','There',3,['directions'],[['kwale','Kwale','reviewed']]],
    ['word_up','word','Up',3,['directions'],[['henhla','Henhla','reviewed']]],
    ['word_down','word','Down',3,['directions'],[['ehansi','Ehansi','reviewed']]],
    ['word_head','word','Head',3,['body'],[['nhloko','Nhloko','reviewed']]],
    ['word_hand','word','Hand',3,['body'],[['voko','Voko','reviewed']]],
    ['word_eye','word','Eye',3,['body'],[['tihlo','Tihlo','reviewed']]],
    ['word_foot','word','Foot',3,['body'],[['milenge','Milenge','reviewed']]],
    ['word_heart','word','Heart',3,['body'],[['mbilu','Mbilu','reviewed']]],
    ['word_mountain','word','Mountain',3,['nature'],[['ntshava','Ntshava','reviewed']]],
    ['word_river','word','River',3,['nature'],[['nambu','Nambu','reviewed']]],
    ['word_tree','word','Tree',3,['nature'],[['murhi','Murhi','reviewed']]],
    ['word_flower','word','Flower',3,['nature'],[['xiluva','Xiluva','reviewed']]],
    ['word_bird','word','Bird',3,['animals'],[['xinyenyana','Xinyenyana','reviewed']]],
    // ─── Tier 4 ───
    ['word_today','word','Today',4,['time'],[['namuntlha','Namuntlha','reviewed']]],
    ['word_tomorrow','word','Tomorrow',4,['time'],[['mundzuku','Mundzuku','reviewed']]],
    ['word_yesterday','word','Yesterday',4,['time'],[['tolo','Tolo','reviewed']]],
    ['word_morning','word','Morning',4,['time'],[['nimixo','Nimixo','reviewed']]],
    ['word_evening','word','Evening',4,['time'],[['nivusiku','Nivusiku','reviewed']]],
    ['word_hot','word','Hot',4,['weather'],[['ku_hisa','Ku hisa','reviewed']]],
    ['word_cold','word','Cold',4,['weather'],[['ku_titimela','Ku titimela','reviewed']]],
    ['word_to_go','word','To go',4,['verbs'],[['ku_famba','Ku famba','reviewed']]],
    ['word_to_come','word','To come',4,['verbs'],[['ku_ta','Ku ta','reviewed']]],
    ['word_to_eat','word','To eat',4,['verbs'],[['ku_dya','Ku dya','reviewed']]],
    ['word_to_sleep','word','To sleep',4,['verbs'],[['ku_etlela','Ku etlela','reviewed']]],
    ['word_to_work','word','To work',4,['verbs'],[['ku_ntirha','Ku ntirha','reviewed']]],
    ['word_to_read','word','To read',4,['verbs'],[['ku_hleta','Ku hleta','reviewed']]],
    ['word_to_write','word','To write',4,['verbs'],[['ku_tsala','Ku tsala','reviewed']]],
    ['word_to_speak','word','To speak',4,['verbs'],[['ku_vula','Ku vula','reviewed']]],
    ['word_what','word','What',4,['questions'],[['yini','Yini','reviewed']]],
    ['word_who','word','Who',4,['questions'],[['mani','Mani','reviewed']]],
    ['word_where','word','Where',4,['questions'],[['kwihi','Kwihi','reviewed']]],
    ['word_when','word','When',4,['questions'],[['rini','Rini','reviewed']]],
    ['word_why','word','Why',4,['questions'],[['hiktokwini','Hiktokwini','reviewed']]],
    ['word_love','word','Love',4,['emotions'],[['rirhandzu','Rirhandzu','reviewed']]],
    ['word_hope','word','Hope',4,['emotions'],[['tshembo','Tshembo','reviewed']]],
    ['word_peace','word','Peace',4,['abstract'],[['ku_xolo','Ku xolo','reviewed']]],
    ['word_truth','word','Truth',4,['abstract'],[['niti','Niti','reviewed']]],
    ['word_life','word','Life',4,['abstract'],[['vutomi','Vutomi','reviewed']]],
  ],
};

// ─────────────────────────────────────────────────────────────
// BUILD CONTENT ARRAY
// ─────────────────────────────────────────────────────────────

const CONTENT = [];
for (const lang of LANGUAGES) {
  const items = DATA[lang.id];
  items.forEach((item, idx) => {
    const [suffix, type, prompt, difficulty, tags, translations] = item;
    const tier = Math.floor(idx / 25) + 1;
    const order = idx + 1;
    const lessonId = `${lang.id}_lesson_t${tier}`;
    CONTENT.push({
      id: `${lang.id}_${suffix}`,
      languageId: lang.id,
      tier,
      type,
      prompt,
      difficulty,
      tags,
      lessonId,
      order,
      translations: translations.map((t) => {
        const [tSuffix, text, status, extra] = t;
        return {
          id: `${lang.id}_${suffix}_${tSuffix}`,
          text,
          status,
          ...(extra || {}),
        };
      }),
    });
  });
}

// ─────────────────────────────────────────────────────────────
// SERIALIZE TO seed.js FILE
// ─────────────────────────────────────────────────────────────

const langJson = JSON.stringify(LANGUAGES, null, 2);
const contentJson = JSON.stringify(CONTENT, null, 2);

const seedFileContent = `// scripts/seed.js
// Bamba V2 — seed for languages + learning content (4 tiers per language).
// AUTO-GENERATED by scripts/generate-seed.js. Do not edit by hand.
//
// Run: node scripts/seed.js
//
// Uses Firebase Admin SDK (bypasses Firestore rules).
// Requires: serviceAccountKey.json in project root. NEVER commit it.

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error('\\n❌ Could not find serviceAccountKey.json');
  console.error('   Expected at:', serviceAccountPath);
  console.error('\\n   Download from: Firebase Console → Project Settings → Service Accounts');
  console.error('   → Generate new private key\\n');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const LANGUAGES = ${langJson};

const CONTENT = ${contentJson};

async function seedLanguages() {
  console.log('\\n📚 Seeding ' + LANGUAGES.length + ' languages...');
  for (const lang of LANGUAGES) {
    const ref = db.collection('languages').doc(lang.id);
    await ref.set(
      {
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        family: lang.family,
        status: 'demo',
        isOfficial: true,
        writingSystem: 'Latin',
        direction: 'LTR',
        regions: lang.regions,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log('   ✅ ' + lang.id + ' — ' + lang.name);
  }
}

async function seedContent() {
  console.log('\\n📝 Seeding ' + CONTENT.length + ' learning content items...');
  let contentCount = 0;
  let translationCount = 0;

  for (const item of CONTENT) {
    const { id, translations, ...contentData } = item;
    const contentRef = db.collection('learning_content').doc(id);

    await contentRef.set(
      {
        ...contentData,
        isDemo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    contentCount++;

    for (const t of translations) {
      const { id: tId, ...tData } = t;
      const tRef = contentRef.collection('translations').doc(tId);
      await tRef.set(
        {
          ...tData,
          isDemo: true,
          submittedBy: null,
          reviewedBy: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      translationCount++;
    }
  }

  console.log('   ✅ ' + contentCount + ' content items');
  console.log('   ✅ ' + translationCount + ' translations');
}

async function main() {
  console.log('🌱 Bamba V2 — Seed script (Admin SDK)');
  console.log('═══════════════════════════════════════════');
  console.log('Idempotent: safe to re-run. Deterministic IDs.');
  console.log('Structure: 100 items per language, 4 tiers each.');
  console.log('═══════════════════════════════════════════');

  try {
    await seedLanguages();
    await seedContent();
    console.log('\\n🎉 Seed complete.');
    process.exit(0);
  } catch (error) {
    console.error('\\n❌ Seed failed:', error.message || error);
    process.exit(1);
  }
}

main();
`;

const outPath = path.join(__dirname, 'seed.js');
fs.writeFileSync(outPath, seedFileContent, 'utf8');

console.log('✅ Generated:', outPath);
console.log('   Languages:', LANGUAGES.length);
console.log('   Content items:', CONTENT.length);
console.log('   Tier breakdown per language: Tier1=25, Tier2=25, Tier3=25, Tier4=25');
console.log('\nNext: node scripts/seed.js');