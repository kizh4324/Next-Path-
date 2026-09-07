import React, { createContext, useContext, useEffect, useState } from 'react';

export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'mr';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  native: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)', native: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ் (Tamil)', native: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు (Telugu)', native: 'తెలుగు' },
  { code: 'mr', label: 'मराठी (Marathi)', native: 'मराठी' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    for_parents: 'For Parents & Guardians',
    print_save: 'Print / Save',
    page_title: "Your child's progress",
    page_subtitle: 'A simple view of learning, assessment and career exploration.',
    student: 'Student',
    current_focus: 'Current focus',
    assessment: 'Assessment',
    completed: 'Completed',
    in_progress: 'In progress',
    assessment_overview: 'Assessment Overview',
    assessment_subtitle: 'Qualitative indicators based on profile activity',
    no_test_scores: 'No test scores',
    not_completed_yet: 'Assessment not completed yet.',
    continue_assessment: 'Continue assessment',
    view_full_assessment: 'View full assessment',
    strong: 'Strong',
    moderate: 'Moderate',
    developing: 'Developing',
    insufficient_evidence: 'Insufficient evidence',
    progress_title: 'Progress',
    milestones_complete: 'milestones complete',
    complete: 'complete',
    upcoming: 'Upcoming',
    no_milestones_yet: 'No progress milestones completed yet.',
    view_roadmap: 'View roadmap',
    career_options: 'Career Options',
    career_options_subtitle: 'Currently relevant pathways based on student evidence',
    continue_exploring: 'Continue exploring to build your pathway options.',
    compare_options: 'Compare options',
    pathway_feasibility: 'Pathway Feasibility',
    feasibility_subtitle: 'Estimated programme fees and duration in India',
    cheaper_option: 'Cheaper option',
    scholarship_note: 'Scholarship & lower-cost state options available',
    view_costs_routes: 'View costs & routes',
    next_steps: 'Next Steps',
    next_steps_subtitle: "Immediate action items from your child's roadmap",
    roadmap_wait_msg: "Your child's roadmap will appear after the assessment and pathway exploration are completed.",
    family_priorities: 'Family Priorities',
    priorities_subtitle: "Shared family criteria — informs guidance without overriding your child's choices.",
    family_discussion: 'Family Discussion',
    view_discussion_guide: 'View discussion guide',
    guidance_title: 'Guidance, not a prediction.',
    guidance_desc: 'Interests, skills and plans can change. Review the pathway as your child gains new experience.',
    next_review: 'Next review: 90 days',
    roadmap_dynamic: 'Roadmap updates dynamically',
    discussion_modal_title: 'Family Discussion Guide',
    discussion_modal_sub: 'Constructive conversation starters with',
    core_questions: 'Core Questions to Ask',
    counselor_recommendations: 'Counselor Recommendations',
    close: 'Close',
    try_again: 'Try again',
    access_restricted: 'Access restricted',
    switch_account: 'Switch account',
    unable_to_load: 'Unable to load progress right now',
    check_connection: 'Please check your internet connection and try refreshing the dashboard.',
    discussion_helper: 'Use these prompts to support your child’s decision.',
    prompt_1: 'What interests {name} most?',
    prompt_2: 'Which pathway feels realistic for our family?',
    prompt_3: 'What support is needed right now?',
    tip_1: 'Focus on strengths and curiosity rather than entrance exam marks alone.',
    tip_2: 'Always consider both a primary aspiration and a viable backup plan.',
    tip_3: 'Check scholarships and lower-cost state institutions early.',
  },
  hi: {
    for_parents: 'माता-पिता और अभिभावकों के लिए',
    print_save: 'प्रिंट / सहेजें',
    page_title: 'आपके बच्चे की प्रगति',
    page_subtitle: 'सीखने, मूल्यांकन और करियर अन्वेषण का एक सरल अवलोकन।',
    student: 'विद्यार्थी',
    current_focus: 'वर्तमान फोकस',
    assessment: 'मूल्यांकन',
    completed: 'पूर्ण',
    in_progress: 'प्रगति में',
    assessment_overview: 'मूल्यांकन अवलोकन',
    assessment_subtitle: 'प्रोफ़ाइल गतिविधि पर आधारित गुणात्मक संकेतक',
    no_test_scores: 'कोई परीक्षा अंक नहीं',
    not_completed_yet: 'मूल्यांकन अभी पूरा नहीं हुआ है।',
    continue_assessment: 'मूल्यांकन जारी रखें',
    view_full_assessment: 'पूर्ण मूल्यांकन देखें',
    strong: 'मजबूत',
    moderate: 'मध्यम',
    developing: 'प्रगतिशील',
    insufficient_evidence: 'अपर्याप्त डेटा',
    progress_title: 'प्रगति',
    milestones_complete: 'मील के पत्थर पूरे हुए',
    complete: 'पूर्ण',
    upcoming: 'आगामी',
    no_milestones_yet: 'अभी तक कोई प्रगति मील का पत्थर पूरा नहीं हुआ है।',
    view_roadmap: 'रोडमैप देखें',
    career_options: 'करियर विकल्प',
    career_options_subtitle: 'विद्यार्थी के साक्ष्यों पर आधारित वर्तमान में प्रासंगिक मार्ग',
    continue_exploring: 'अपने मार्ग विकल्प बनाने के लिए अन्वेषण जारी रखें।',
    compare_options: 'विकल्पों की तुलना करें',
    pathway_feasibility: 'मार्ग व्यावहारिकता',
    feasibility_subtitle: 'भारत में अनुमानित कार्यक्रम शुल्क और अवधि',
    cheaper_option: 'किफायती विकल्प',
    scholarship_note: 'छात्रवृत्ति और कम लागत वाले सरकारी विकल्प उपलब्ध',
    view_costs_routes: 'लागत और मार्ग देखें',
    next_steps: 'अगले कदम',
    next_steps_subtitle: 'आपके बच्चे के रोडमैप से तत्काल कार्रवाई योग्य कदम',
    roadmap_wait_msg: 'मूल्यांकन और मार्ग अन्वेषण पूरा होने के बाद रोडमैप दिखाई देगा।',
    family_priorities: 'पारिवारिक प्राथमिकताएं',
    priorities_subtitle: 'साझा पारिवारिक मानदंड — बच्चे की पसंद को बदले बिना मार्गदर्शन।',
    family_discussion: 'पारिवारिक चर्चा',
    view_discussion_guide: 'चर्चा मार्गदर्शिका देखें',
    guidance_title: 'मार्गदर्शन, भविष्यवाणी नहीं।',
    guidance_desc: 'रुचियां, कौशल और योजनाएं बदल सकती हैं। जैसे-जैसे बच्चा नया अनुभव प्राप्त करता है, मार्ग की समीक्षा करें।',
    next_review: 'अगली समीक्षा: ९० दिन',
    roadmap_dynamic: 'रोडमैप गतिशील रूप से अपडेट होता है',
    discussion_modal_title: 'पारिवारिक चर्चा मार्गदर्शिका',
    discussion_modal_sub: 'के साथ रचनात्मक बातचीत की शुरुआत',
    core_questions: 'पूछने योग्य मुख्य प्रश्न',
    counselor_recommendations: 'परामर्शदाता की सिफारिशें',
    close: 'बंद करें',
    try_again: 'पुनः प्रयास करें',
    access_restricted: 'पहुंच प्रतिबंधित है',
    switch_account: 'खाता बदलें',
    unable_to_load: 'प्रगति लोड करने में असमर्थ',
    check_connection: 'कृपया इंटरनेट कनेक्शन जांचें और डैशबोर्ड रीफ़्रेश करें।',
    discussion_helper: 'अपने बच्चे के निर्णय का समर्थन करने के लिए इन बिंदुओं का उपयोग करें।',
    prompt_1: '{name} की सबसे अधिक रुचि किसमें है?',
    prompt_2: 'हमारे परिवार के लिए कौन सा मार्ग व्यावहारिक लगता है?',
    prompt_3: 'अभी किस प्रकार के सहयोग की आवश्यकता है?',
    tip_1: 'केवल प्रवेश परीक्षा के अंकों के बजाय ताकत और जिज्ञासा पर ध्यान दें।',
    tip_2: 'हमेशा एक प्राथमिक आकांक्षा और एक व्यावहारिक बैकअप योजना दोनों पर विचार करें।',
    tip_3: 'छात्रवृत्ति और कम लागत वाले सरकारी संस्थानों की पहले से जांच करें।',
  },
  ta: {
    for_parents: 'பெற்றோர் மற்றும் பாதுகாவலர்களுக்கு',
    print_save: 'அச்சிடு / சேமி',
    page_title: 'உங்கள் குழந்தையின் முன்னேற்றம்',
    page_subtitle: 'கற்றல், மதிப்பீடு மற்றும் தொழில் ஆய்வு பற்றிய எளிய பார்வை.',
    student: 'மாணவர்',
    current_focus: 'தற்போதைய கவனம்',
    assessment: 'மதிப்பீடு',
    completed: 'முடிந்தது',
    in_progress: 'முன்னேற்றத்தில்',
    assessment_overview: 'மதிப்பீட்டு கண்ணோட்டம்',
    assessment_subtitle: 'சுயவிவர நடவடிக்கையின் அடிப்படையிலான குறிகாட்டிகள்',
    no_test_scores: 'தேர்வு மதிப்பெண்கள் இல்லை',
    not_completed_yet: 'மதிப்பீடு இன்னும் முடிக்கப்படவில்லை.',
    continue_assessment: 'மதிப்பீட்டைத் தொடரவும்',
    view_full_assessment: 'முழு மதிப்பீட்டைக் காண்க',
    strong: 'வலுவானது',
    moderate: 'மிதமானது',
    developing: 'வளர்ந்து வருகிறது',
    insufficient_evidence: 'போதுமான ஆதாரமில்லை',
    progress_title: 'முன்னேற்றம்',
    milestones_complete: 'மைல்கற்கள் நிறைவடைந்தன',
    complete: 'நிறைவு',
    upcoming: 'வரவிருக்கும்',
    no_milestones_yet: 'இன்னும் மைல்கற்கள் எதுவும் நிறைவடையவில்லை.',
    view_roadmap: 'வழிகாட்டியைப் பார்',
    career_options: 'தொழில் விருப்பங்கள்',
    career_options_subtitle: 'மாணவர் ஆதாரங்களின் அடிப்படையில் பொருத்தமான பாதைகள்',
    continue_exploring: 'உங்கள் விருப்பங்களை உருவாக்க ஆய்வைத் தொடரவும்.',
    compare_options: 'விருப்பங்களை ஒப்பிடுக',
    pathway_feasibility: 'பாதை சாத்தியக்கூறு',
    feasibility_subtitle: 'இந்தியாவில் உத்தேச கல்வி கட்டணம் மற்றும் காலம்',
    cheaper_option: 'குறைந்த கட்டண மாற்று',
    scholarship_note: 'கல்வி உதவித்தொகை மற்றும் அரசு கல்லூரி வாய்ப்புகள் உள்ளன',
    view_costs_routes: 'செலவு மற்றும் பாதைகளைக் காண்க',
    next_steps: 'அடுத்த படிகள்',
    next_steps_subtitle: 'குழந்தையின் வழிகாட்டியில் உள்ள உடனடி நடவடிக்கைகள்',
    roadmap_wait_msg: 'மதிப்பீடு மற்றும் ஆய்வு முடிந்ததும் வழிகாட்டி தோன்றும்.',
    family_priorities: 'குடும்ப முன்னுரிமைகள்',
    priorities_subtitle: 'பகிர்ந்த குடும்ப விருப்பங்கள் — குழந்தையின் முடிவை பாதிக்காமல் வழிகாட்டுகிறது.',
    family_discussion: 'குடும்ப கலந்துரையாடல்',
    view_discussion_guide: 'கலந்துரையாடல் வழிகாட்டியைப் பார்',
    guidance_title: 'வழிகாட்டுதல், கணிப்பு அல்ல.',
    guidance_desc: 'ஆர்வங்களும் திறன்களும் மாறக்கூடும். அனுபவம் பெறும்போது பாதையை மறுஆய்வு செய்யுங்கள்.',
    next_review: 'அடுத்த ஆய்வு: 90 நாட்கள்',
    roadmap_dynamic: 'வழிகாட்டி தானாகவே புதுப்பிக்கப்படும்',
    discussion_modal_title: 'குடும்ப கலந்துரையாடல் வழிகாட்டி',
    discussion_modal_sub: 'உடன் பயனுள்ள உரையாடலைத் தொடங்குங்கள்',
    core_questions: 'கேட்க வேண்டிய முக்கிய கேள்விகள்',
    counselor_recommendations: 'ஆலோசகர் பரிந்துரைகள்',
    close: 'மூடு',
    try_again: 'மீண்டும் முயற்சிக்கவும்',
    access_restricted: 'அணுகல் கட்டுப்படுத்தப்பட்டுள்ளது',
    switch_account: 'கணக்கை மாற்றுக',
    unable_to_load: 'முன்னேற்றத்தை ஏற்ற முடியவில்லை',
    check_connection: 'இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    discussion_helper: 'உங்கள் குழந்தையின் முடிவை ஆதரிக்க இந்த தலைப்புகளைப் பயன்படுத்தவும்.',
    prompt_1: '{name}-க்கு எதில் அதிக ஆர்வம் உள்ளது?',
    prompt_2: 'எங்கள் குடும்பத்திற்கு எந்தப் பாதை பொருத்தமாக இருக்கும்?',
    prompt_3: 'இப்போது என்ன ஆதரவு தேவைப்படுகிறது?',
    tip_1: 'நுழைவுத் தேர்வு மதிப்பெண்களை விட ஆர்வத்திலும் திறனிலும் கவனம் செலுத்துங்கள்.',
    tip_2: 'எப்போதும் முதன்மை இலக்குடன் ஒரு மாற்றுத் திட்டத்தையும் கருத்தில் கொள்ளுங்கள்.',
    tip_3: 'கல்வி உதவித்தொகை மற்றும் அரசு நிறுவனங்களை முன்கூட்டியே ஆராயுங்கள்.',
  },
  te: {
    for_parents: 'తల్లిదండ్రులు & సంరక్షకుల కోసం',
    print_save: 'ప్రింట్ / సేవ్',
    page_title: 'మీ బిడ్డ పురోగతి',
    page_subtitle: 'అభ్యాసం, అంచనా మరియు కెరీర్ అన్వేషణ యొక్క సాధారణ వీక్షణ.',
    student: 'విద్యార్థి',
    current_focus: 'ప్రస్తుత దృష్టి',
    assessment: 'అంచనా',
    completed: 'పూర్తయింది',
    in_progress: 'పురోగతిలో ఉంది',
    assessment_overview: 'అంచనా అవలోకనం',
    assessment_subtitle: 'ప్రొఫైల్ కార్యాచరణ ఆధారంగా గుణాత్మక సూచికలు',
    no_test_scores: 'పరీక్ష మార్కులు లేవు',
    not_completed_yet: 'అంచనా ఇంకా పూర్తి కాలేదు.',
    continue_assessment: 'అంచనాను కొనసాగించండి',
    view_full_assessment: 'పూర్తి అంచనాను వీక్షించండి',
    strong: 'బలమైనది',
    moderate: 'మితమైనది',
    developing: 'అభివృద్ధి చెందుతోంది',
    insufficient_evidence: 'సరిపోని సాక్ష్యం',
    progress_title: 'పురోగతి',
    milestones_complete: 'మైలురాళ్ళు పూర్తయ్యాయి',
    complete: 'పూర్తయింది',
    upcoming: 'రాబోయేవి',
    no_milestones_yet: 'ఇంకా మైలురాళ్ళు ఏవీ పూర్తి కాలేదు.',
    view_roadmap: 'రోడ్‌మ్యాప్ చూడండి',
    career_options: 'కెరీర్ ఎంపికలు',
    career_options_subtitle: 'విద్యార్థి ఆధారాల ఆధారంగా ప్రస్తుతం సంబంధిత మార్గాలు',
    continue_exploring: 'మీ మార్గాలను రూపొందించడానికి అన్వేషణను కొనసాగించండి.',
    compare_options: 'ఎంపికలను సరిపోల్చండి',
    pathway_feasibility: 'మార్గం సాధ్యాసాధ్యాలు',
    feasibility_subtitle: 'భారతదేశంలో అంచనా వేసిన ఫీజులు మరియు వ్యవధి',
    cheaper_option: 'తక్కువ ఖర్చు ప్రత్యామ్నాయం',
    scholarship_note: 'స్కాలర్‌షిప్‌లు & ప్రభుత్వ కళాశాల అవకాశాలు అందుబాటులో ఉన్నాయి',
    view_costs_routes: 'ఖర్చులు & మార్గాలను చూడండి',
    next_steps: 'తదుపరి దశలు',
    next_steps_subtitle: 'మీ బిడ్డ రోడ్‌మ్యాప్ నుండి తక్షణ చర్యలు',
    roadmap_wait_msg: 'అంచనా మరియు అన్వేషణ పూర్తయిన తర్వాత రోడ్‌మ్యాప్ కనిపిస్తుంది.',
    family_priorities: 'కుటుంబ ప్రాధాన్యతలు',
    priorities_subtitle: 'కుటుంబ ప్రమాణాలు — బిడ్డ ఎంపికను మార్చకుండా మార్గదర్శనం.',
    family_discussion: 'కుటుంబ చర్చ',
    view_discussion_guide: 'చర్చ మార్గదర్శిని వీక్షించండి',
    guidance_title: 'మార్గదర్శనం, జోస్యం కాదు.',
    guidance_desc: 'ఆసక్తులు మరియు నైపుణ్యాలు మారవచ్చు. అనుభవం పెరిగే కొద్దీ మార్గాన్ని సమీక్షించండి.',
    next_review: 'తదుపరి సమీక్ష: 90 రోజులు',
    roadmap_dynamic: 'రోడ్‌మ్యాప్ స్వయంచాలకంగా అప్‌డేట్ అవుతుంది',
    discussion_modal_title: 'కుటుంబ చర్చ మార్గదర్శి',
    discussion_modal_sub: 'తో అర్ధవంతమైన సంభాషణను ప్రారంభించండి',
    core_questions: 'అడగవలసిన ముఖ్యమైన ప్రశ్నలు',
    counselor_recommendations: 'కౌన్సిలర్ సిఫార్సులు',
    close: 'మూసివేయి',
    try_again: 'మళ్లీ ప్రయత్నించండి',
    access_restricted: 'యాక్సెస్ పరిమితం చేయబడింది',
    switch_account: 'ఖాతాను మార్చండి',
    unable_to_load: 'పురోగతిని లోడ్ చేయడం సాధ్యం కాలేదు',
    check_connection: 'ఇంటర్నెట్ కనెక్షన్ తనిఖీ చేసి రీఫ్రెష్ చేయండి.',
    discussion_helper: 'మీ బిడ్డ నిర్ణయానికి మద్దతు ఇవ్వడానికి ఈ అంశాలను ఉపయోగించండి.',
    prompt_1: '{name} దేనిపై ఎక్కువ ఆసక్తి చూపిస్తున్నారు?',
    prompt_2: 'మా కుటుంబానికి ఏ మార్గం ఆచరణాత్మకంగా అనిపిస్తుంది?',
    prompt_3: 'ఇప్పుడు ఎలాంటి మద్దతు అవసరం?',
    tip_1: 'ప్రవేశ పరీక్ష మార్కులపై మాత్రమే కాకుండా బలాలు మరియు ఆసక్తిపై దృష్టి పెట్టండి.',
    tip_2: 'ఎల్లప్పుడూ ప్రాథమిక లక్ష్యంతో పాటు ప్రత్యామ్నాయ ప్రణాళికను కూడా పరిగణించండి.',
    tip_3: 'స్కాలర్‌షిప్‌లు మరియు తక్కువ ఫీజు ఉండే ప్రభుత్వ సంస్థలను ముందుగానే పరిశీలించండి.',
  },
  mr: {
    for_parents: 'पालक आणि संरक्षकांसाठी',
    print_save: 'प्रिंट / सेव्ह',
    page_title: 'तुमच्या पाल्याची प्रगती',
    page_subtitle: 'शिक्षण, मूल्यांकन आणि करिअर शोधाचे सोपे विहंगावलोकन.',
    student: 'विद्यार्थी',
    current_focus: 'सध्याचे लक्ष',
    assessment: 'मूल्यांकन',
    completed: 'पूर्ण',
    in_progress: 'प्रगतीपथावर',
    assessment_overview: 'मूल्यांकन विहंगावलोकन',
    assessment_subtitle: 'प्रोफाइल कृतीवर आधारित गुणात्मक निर्देशक',
    no_test_scores: 'कोणतेही परीक्षा गुण नाहीत',
    not_completed_yet: 'मूल्यांकन अद्याप पूर्ण झालेले नाही.',
    continue_assessment: 'मूल्यांकन सुरू ठेवा',
    view_full_assessment: 'पूर्ण मूल्यांकन पहा',
    strong: 'उत्तम',
    moderate: 'मध्यम',
    developing: 'प्रगतीपथावर',
    insufficient_evidence: 'अपुरा पुरावा',
    progress_title: 'प्रगती',
    milestones_complete: 'टप्पे पूर्ण झाले',
    complete: 'पूर्ण',
    upcoming: 'आगामी',
    no_milestones_yet: 'अद्याप कोणताही टप्पा पूर्ण झालेला नाही.',
    view_roadmap: 'रोडमॅप पहा',
    career_options: 'करिअर पर्याय',
    career_options_subtitle: 'विद्यार्थ्याच्या पुराव्यावर आधारित सध्याचे समर्पक मार्ग',
    continue_exploring: 'पर्याय निवडण्यासाठी शोध सुरू ठेवा.',
    compare_options: 'पर्यायांची तुलना करा',
    pathway_feasibility: 'मार्ग व्यवहार्यता',
    feasibility_subtitle: 'भारतातील अंदाजे अभ्यासक्रम शुल्क आणि कालावधी',
    cheaper_option: 'कमी खर्चाचा पर्याय',
    scholarship_note: 'शिष्यवृत्ती आणि शासकीय महाविद्यालयांचे पर्याय उपलब्ध',
    view_costs_routes: 'खर्च आणि मार्ग पहा',
    next_steps: 'पुढील पायऱ्या',
    next_steps_subtitle: 'तुमच्या पाल्याच्या रोडमॅपमधील तात्काळ कृती',
    roadmap_wait_msg: 'मूल्यांकन आणि शोध पूर्ण झाल्यावर रोडमॅप दिसेल.',
    family_priorities: 'कौटुंबिक प्राधान्यक्रम',
    priorities_subtitle: 'कुटुंबाचे निकष — पाल्याच्या आवडीवर अतिक्रमण न करता मार्गदर्शन.',
    family_discussion: 'कौटुंबिक चर्चा',
    view_discussion_guide: 'चर्चा मार्गदर्शक पहा',
    guidance_title: 'मार्गदर्शन, भाकीत नव्हे.',
    guidance_desc: 'आवड, कौशल्ये आणि योजना बदलू शकतात. नवीन अनुभव आल्यावर मार्गाचा फेरविचार करा.',
    next_review: 'पुढील आढावा: ९० दिवस',
    roadmap_dynamic: 'रोडमॅप आपोआप अद्ययावत होतो',
    discussion_modal_title: 'कौटुंबिक चर्चा मार्गदर्शक',
    discussion_modal_sub: 'सोबत रचनात्मक संभाषणाची सुरुवात',
    core_questions: 'विचारण्यासाठी मुख्य प्रश्न',
    counselor_recommendations: 'सल्लागाराच्या शिफारसी',
    close: 'बंद करा',
    try_again: 'पुन्हा प्रयत्न करा',
    access_restricted: 'प्रवेश प्रतिबंधित आहे',
    switch_account: 'खाते बदला',
    unable_to_load: 'प्रगती लोड करता आली नाही',
    check_connection: 'कृपया इंटरनेट तपासा आणि डॅशबोर्ड रिफ्रेश करा.',
    discussion_helper: 'आपल्या पाल्याच्या निर्णयाला पाठिंबा देण्यासाठी या मुद्द्यांचा वापर करा.',
    prompt_1: '{name} ला सर्वाधिक कशामध्ये रस आहे?',
    prompt_2: 'आमच्या कुटुंबासाठी कोणता मार्ग वास्तववादी वाटतो?',
    prompt_3: 'सध्या कोणत्या आधाराची गरज आहे?',
    tip_1: 'केवळ प्रवेश परीक्षेच्या गुणांऐवजी क्षमता आणि जिज्ञासेवर भर द्या.',
    tip_2: 'नेहमी एका मुख्य ध्येयासोबत योग्य पर्यायी योजनेचा विचार करा.',
    tip_3: 'शिष्यवृत्ती आणि कमी खर्चाच्या शासकीय संस्थांची माहिती आधीच घ्या.',
  },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

const STORAGE_KEY = 'nextpath_interface_language';

export function LanguageProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['en', 'hi', 'ta', 'te', 'mr'].includes(stored)) {
        return stored as SupportedLanguage;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = (newLang: SupportedLanguage) => {
    if (['en', 'hi', 'ta', 'te', 'mr'].includes(newLang)) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
      } catch {
        // ignore
      }
      document.documentElement.lang = newLang;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    const defaultDict = TRANSLATIONS.en;
    if (defaultDict && defaultDict[key]) {
      return defaultDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext);
}
