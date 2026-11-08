/**
 * Smriti AI Cognitive Assessment Prompts
 * Exact multilingual demonstration prompts for English, Hindi, and Marathi
 * as specified in Section 7 of the Master Prompt.
 */

import type { ActivityLocale } from './instruments.ts';

export interface SpokenItemPrompt {
  instruction: string;
  stimulus?: string;
  expectedKeywords?: string[];
  repetitionAllowed: boolean;
}

export const ORIGINAL_DEMO_WORD_SETS: Record<ActivityLocale, string[]> = {
  'en-IN': ['ladder', 'coconut', 'pillow', 'kite', 'stream'],
  'hi-IN': ['सीढ़ी', 'नारियल', 'तकिया', 'पतंग', 'झरना'],
  'mr-IN': ['शिडी', 'नारळ', 'उशी', 'पतंग', 'ओढा']
};

export const ORIGINAL_DEMO_ADDRESS: Record<ActivityLocale, { full: string; components: string[] }> = {
  'en-IN': {
    full: 'John Smith, 42 High Street, Bedford',
    components: ['John', 'Smith', '42', 'High Street', 'Bedford']
  },
  'hi-IN': {
    full: 'मोहन शर्मा, 42 गांधी मार्ग, भोपाल',
    components: ['मोहन', 'शर्मा', '42', 'गांधी मार्ग', 'भोपाल']
  },
  'mr-IN': {
    full: 'आनंद जोशी, 42 टिळक रस्ता, पुणे',
    components: ['आनंद', 'जोशी', '42', 'टिळक रस्ता', 'पुणे']
  }
};

export const DEMO_PROMPTS_BY_TASK: Record<string, Record<ActivityLocale, string>> = {
  year: {
    'en-IN': 'What year is it today?',
    'hi-IN': 'आज कौन सा साल चल रहा है?',
    'mr-IN': 'सध्या कोणते वर्ष चालू आहे?'
  },
  month: {
    'en-IN': 'Which month are we in?',
    'hi-IN': 'अभी कौन सा महीना चल रहा है?',
    'mr-IN': 'आता कोणता महिना चालू आहे?'
  },
  time: {
    'en-IN': 'Roughly what time is it now?',
    'hi-IN': 'अभी लगभग कितने बजे हैं?',
    'mr-IN': 'आता साधारण किती वाजले आहेत?'
  },
  backward_count: {
    'en-IN': 'Please count backwards from twenty to one.',
    'hi-IN': 'कृपया बीस से एक तक उल्टी गिनती कीजिए।',
    'mr-IN': 'कृपया वीसपासून एकपर्यंत उलटी मोजणी करा.'
  },
  reverse_months: {
    'en-IN': 'Tell me the months starting from December, backwards.',
    'hi-IN': 'दिसंबर से शुरू करके महीनों के नाम उल्टे क्रम में बताइए।',
    'mr-IN': 'डिसेंबरपासून महिन्यांची नावे उलट क्रमाने सांगा.'
  },
  word_learning: {
    'en-IN': 'Listen to these five words, then repeat what you remember: ladder, coconut, pillow, kite, stream.',
    'hi-IN': 'ये पाँच शब्द सुनिए, फिर जो याद रहे उन्हें दोहराइए: सीढ़ी, नारियल, तकिया, पतंग, झरना।',
    'mr-IN': 'हे पाच शब्द ऐका आणि आठवतील ते पुन्हा सांगा: शिडी, नारळ, उशी, पतंग, ओढा.'
  },
  delayed_recall: {
    'en-IN': 'Which words from earlier do you remember?',
    'hi-IN': 'पहले सुनाए गए कौन से शब्द आपको याद हैं?',
    'mr-IN': 'आधी सांगितलेले कोणते शब्द तुम्हाला आठवतात?'
  },
  digits_forward: {
    'en-IN': 'Listen to these digits and repeat them in the same order: 2, 1, 8, 5, 4.',
    'hi-IN': 'ये अंक सुनिए और उसी क्रम में दोहराइए: 2, 1, 8, 5, 4.',
    'mr-IN': 'हे अंक ऐका आणि त्याच क्रमाने पुन्हा सांगा: 2, 1, 8, 5, 4.'
  },
  digits_backward: {
    'en-IN': 'Repeat these digits in reverse order: 7, 4, 2.',
    'hi-IN': 'इन अंकों को उल्टे क्रम में बताइए: 7, 4, 2.',
    'mr-IN': 'हे अंक उलट क्रमाने सांगा: 7, 4, 2.'
  },
  category_fluency: {
    'en-IN': 'Name different animals until I say stop. You have one minute.',
    'hi-IN': 'जब तक मैं रोकूँ, अलग-अलग जानवरों के नाम बताइए। आपके पास एक मिनट है।',
    'mr-IN': 'मी थांबवेन तोपर्यंत वेगवेगळ्या प्राण्यांची नावे सांगा. तुमच्याकडे एक मिनिट आहे.'
  },
  sentence_repetition: {
    'en-IN': 'Repeat the sentence I say: The morning sun was bright and warm across the valley.',
    'hi-IN': 'मैं जो वाक्य बोलूँ उसे दोहराइए: सुबह का सूरज घाटी में तेज और चमकदार था।',
    'mr-IN': 'मी जे वाक्य सांगेन ते पुन्हा सांगा: सकाळचे ऊन दरीमध्ये सुंदर आणि उबदार होते.'
  },
  abstraction: {
    'en-IN': 'How are a spoon and a fork alike?',
    'hi-IN': 'चम्मच और काँटे में क्या समानता है?',
    'mr-IN': 'चमचा आणि काटा यांच्यात काय साम्य आहे?'
  }
};

export function getItemPrompt(instrumentCode: string, itemId: string, locale: ActivityLocale): SpokenItemPrompt {
  const lang: ActivityLocale = locale === 'hi-IN' || locale === 'mr-IN' ? locale : 'en-IN';

  // 6CIT Items
  if (instrumentCode === 'six_cit_v1') {
    switch (itemId) {
      case '6cit_item_1':
        return { instruction: DEMO_PROMPTS_BY_TASK.year[lang], repetitionAllowed: false };
      case '6cit_item_2':
        return { instruction: DEMO_PROMPTS_BY_TASK.month[lang], repetitionAllowed: false };
      case '6cit_stimulus':
        const addr = ORIGINAL_DEMO_ADDRESS[lang];
        return {
          instruction: lang === 'hi-IN'
            ? `कृपया यह पता ध्यान से सुनिए और याद रखिए: ${addr.full}। इसे दोहराने की कोशिश कीजिए।`
            : lang === 'mr-IN'
            ? `कृपया हा पत्ता नीट ऐका आणि लक्षात ठेवा: ${addr.full}. हा पत्ता पुन्हा सांगण्याचा प्रयत्न करा.`
            : `Please remember this name and address: ${addr.full}. Try repeating it back to me.`,
          stimulus: addr.full,
          repetitionAllowed: true
        };
      case '6cit_item_3':
        return { instruction: DEMO_PROMPTS_BY_TASK.time[lang], repetitionAllowed: false };
      case '6cit_item_4':
        return { instruction: DEMO_PROMPTS_BY_TASK.backward_count[lang], repetitionAllowed: false };
      case '6cit_item_5':
        return { instruction: DEMO_PROMPTS_BY_TASK.reverse_months[lang], repetitionAllowed: false };
      case '6cit_item_6':
        return {
          instruction: lang === 'hi-IN'
            ? 'मैंने थोड़ी देर पहले जो नाम और पता याद रखने को कहा था, वह बताइए।'
            : lang === 'mr-IN'
            ? 'मी मघाशी जो पत्ता लक्षात ठेवायला सांगितला होता, तो आठवून सांगा.'
            : 'What was the name and address I asked you to remember earlier?',
          repetitionAllowed: false
        };
    }
  }

  // TICS Items
  if (instrumentCode === 'tics_v1') {
    switch (itemId) {
      case 'tics_01':
        return {
          instruction: lang === 'hi-IN'
            ? 'कृपया अपना पूरा नाम और अपनी उम्र बताइए।'
            : lang === 'mr-IN'
            ? 'कृपया तुमचे पूर्ण नाव आणि तुमचे वय सांगा.'
            : 'Please state your full legal name and your age.',
          repetitionAllowed: false
        };
      case 'tics_02':
        return {
          instruction: lang === 'hi-IN'
            ? 'आज की तारीख, दिन, महीना और साल क्या है?'
            : lang === 'mr-IN'
            ? 'आजची तारीख, वार, महिना आणि वर्ष काय आहे?'
            : 'What is today’s date, day of the week, month, and year?',
          repetitionAllowed: false
        };
      case 'tics_03':
        return {
          instruction: lang === 'hi-IN'
            ? 'आप इस समय किस शहर और राज्य में हैं?'
            : lang === 'mr-IN'
            ? 'तुम्ही सध्या कोणत्या शहरात आणि राज्यात आहात?'
            : 'What city and state are you currently in?',
          repetitionAllowed: false
        };
      case 'tics_04':
        return { instruction: DEMO_PROMPTS_BY_TASK.backward_count[lang], repetitionAllowed: false };
      case 'tics_05':
        return { instruction: DEMO_PROMPTS_BY_TASK.word_learning[lang], repetitionAllowed: false };
      case 'tics_06':
        return {
          instruction: lang === 'hi-IN'
            ? 'सौ में से सात घटाइए, फिर जो आए उसमें से सात घटाते जाइए।'
            : lang === 'mr-IN'
            ? 'शंभरामधून सात वजा करा, आणि आलेल्या संख्येतून पुन्हा सात वजा करत जा.'
            : 'Take away 7 from 100, and keep taking away 7 from each new number.',
          repetitionAllowed: false
        };
      case 'tics_07':
        return {
          instruction: lang === 'hi-IN'
            ? 'जिस वस्तु से हम समय देखते हैं उसे क्या कहते हैं?'
            : lang === 'mr-IN'
            ? 'ज्या वस्तूने आपण वेळ पाहतो त्याला काय म्हणतात?'
            : 'What do you call the thing on your wrist that tells time?',
          repetitionAllowed: false
        };
      case 'tics_08':
        return { instruction: DEMO_PROMPTS_BY_TASK.sentence_repetition[lang], repetitionAllowed: false };
      case 'tics_09':
        return {
          instruction: lang === 'hi-IN'
            ? 'भारत के वर्तमान प्रधानमंत्री का नाम क्या है?'
            : lang === 'mr-IN'
            ? 'भारताच्या सध्याच्या पंतप्रधानांचे नाव काय आहे?'
            : 'Who is the current Prime Minister of India?',
          repetitionAllowed: false
        };
      case 'tics_10':
        return {
          instruction: lang === 'hi-IN'
            ? 'अगर मैं कहूँ "नमस्ते", तो आप क्या जवाब देंगे?'
            : lang === 'mr-IN'
            ? 'मी जर "नमस्कार" म्हटले, तर तुम्ही काय उत्तर द्याल?'
            : 'If someone asks you for directions to the post office, what would you say?',
          repetitionAllowed: false
        };
      case 'tics_11':
        return { instruction: DEMO_PROMPTS_BY_TASK.delayed_recall[lang], repetitionAllowed: false };
    }
  }

  // MoCA Blind Items
  if (instrumentCode === 'moca_blind_v1') {
    switch (itemId) {
      case 'moca_mem_learn':
        return { instruction: DEMO_PROMPTS_BY_TASK.word_learning[lang], repetitionAllowed: false };
      case 'moca_attn_digits_fwd':
        return { instruction: DEMO_PROMPTS_BY_TASK.digits_forward[lang], repetitionAllowed: false };
      case 'moca_attn_digits_bwd':
        return { instruction: DEMO_PROMPTS_BY_TASK.digits_backward[lang], repetitionAllowed: false };
      case 'moca_attn_vigilance':
        return {
          instruction: lang === 'hi-IN'
            ? 'जब भी आप अक्षर "अ" सुनें, तो "हाँ" बोलिए।'
            : lang === 'mr-IN'
            ? 'जेव्हाही तुम्हाला "अ" अक्षर ऐकू येईल, तेव्हा "हो" म्हणा.'
            : 'Say "yes" every time you hear the letter A.',
          repetitionAllowed: false
        };
      case 'moca_attn_subtraction':
        return {
          instruction: lang === 'hi-IN'
            ? 'सौ में से सात घटाइए, और लगातार पाँच बार सात घटाते जाइए।'
            : lang === 'mr-IN'
            ? 'शंभरामधून सात वजा करा, आणि पाच वेळा सलग सात वजा करा.'
            : 'Count backwards from 100 by sevens, five times.',
          repetitionAllowed: false
        };
      case 'moca_lang_repeat_1':
      case 'moca_lang_repeat_2':
        return { instruction: DEMO_PROMPTS_BY_TASK.sentence_repetition[lang], repetitionAllowed: false };
      case 'moca_lang_fluency':
        return { instruction: DEMO_PROMPTS_BY_TASK.category_fluency[lang], repetitionAllowed: false };
      case 'moca_abstraction':
        return { instruction: DEMO_PROMPTS_BY_TASK.abstraction[lang], repetitionAllowed: false };
      case 'moca_delayed_recall':
        return { instruction: DEMO_PROMPTS_BY_TASK.delayed_recall[lang], repetitionAllowed: false };
      case 'moca_orientation':
        return {
          instruction: lang === 'hi-IN'
            ? 'आज की तारीख, महीना, साल, दिन, शहर और जगह का नाम बताइए।'
            : lang === 'mr-IN'
            ? 'आजची तारीख, महिना, वर्ष, वार, शहर आणि ठिकाणाचे नाव सांगा.'
            : 'Tell me today’s date, month, year, day of the week, this place, and city.',
          repetitionAllowed: false
        };
    }
  }

  // Trial activities
  if (instrumentCode === 'smriti_word_repeat_v1') {
    return {
      instruction: lang === 'hi-IN'
        ? 'कृपया ध्यान से सुनिए: कप, नदी, बगीचा, कुर्सी, आम। अब ये पाँच शब्द किसी भी क्रम में दोहराइए।'
        : lang === 'mr-IN'
        ? 'कृपया नीट ऐका: कप, नदी, बाग, खुर्ची, आंबा. आता हे पाच शब्द कोणत्याही क्रमाने पुन्हा सांगा.'
        : 'Please listen carefully: cup, river, garden, chair, mango. Now repeat the five words in any order.',
      repetitionAllowed: true
    };
  }

  if (instrumentCode === 'smriti_category_fluency_v1') {
    return {
      instruction: DEMO_PROMPTS_BY_TASK.category_fluency[lang],
      repetitionAllowed: false
    };
  }

  if (instrumentCode === 'smriti_orientation_v1') {
    return {
      instruction: lang === 'hi-IN'
        ? 'आपके हिसाब से आज कौन सा दिन है? क्या आप बता सकते हैं कि अभी आप कहाँ हैं?'
        : lang === 'mr-IN'
        ? 'तुमच्या मते आज कोणता वार आहे? आणि तुम्ही आत्ता कुठे आहात ते सांगू शकाल का?'
        : 'What day do you think it is today? Can you tell me where you are right now?',
      repetitionAllowed: true
    };
  }

  return { instruction: 'Please listen and respond clearly.', repetitionAllowed: false };
}
