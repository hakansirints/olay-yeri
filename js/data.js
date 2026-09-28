// 12 Vaka Verisi - Olay Yeri İnceleme, Pedagojik Dönüt ve Çift-Bakış Moleküler Veritabanı
window.CASES_DATA = [
  {
    "id": 1,
    "slug": "case-1-demirin-paslanmasi",
    "title": "Demirin Paslanması",
    "shortDesc": "Nemli havada bekleyen demir çivi zamanla renk değiştiriyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/><path d=\"m9 12 2 2 4-4\"/></svg>",
    "correctType": "chemical",
    "molecularType": "rust",
    "chemicalEquation": "4Fe(k) + 3O₂(g) + nH₂O(s) ➔ 2Fe₂O₃·nH₂O(k) (Pas)",
    "misconception": "Demirin yalnızca rengi solmaz; demir (Fe) atomları havadaki oksijen (O₂) ve su buharı ile bağ kurarak pas adı verilen bambaşka kimyasal özelliklere sahip yeni bir bileşik oluşturur.",
    "videoUrl": "videos/case-1-demirin-paslanmasi.mp4",
    "thumbnailUrl": "thumbnails/case-1-demirin-paslanmasi.jpg",
    "clues": [
      {
        "id": "c1_1",
        "label": "Renk Değişimi (Kızıl-Kahverengi)",
        "isObserved": true
      },
      {
        "id": "c1_2",
        "label": "Yeni Madde / Pas Tabakası Oluşumu",
        "isObserved": true
      },
      {
        "id": "c1_3",
        "label": "Gaz Çıkışı",
        "isObserved": false
      },
      {
        "id": "c1_4",
        "label": "Sıcaklık / Işık Artışı",
        "isObserved": false
      },
      {
        "id": "c1_5",
        "label": "Çökelme Oluşumu",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "renk",
      "pas",
      "kahverengi",
      "tabaka",
      "kızıl",
      "yüzey",
      "demir"
    ],
    "decisionKeywords": [
      "kimyasal",
      "yeni madde",
      "pas",
      "oksit",
      "özellik"
    ],
    "feedbacks": {
      "correct": "Doğru. Demirin yüzeyinde başlangıçtakinden farklı özelliklere sahip pas tabakası oluştuğunu gözlemledin ve bunu kimyasal değişimle ilişkilendirdin. Yeni bir madde oluşması kimyasal değişimin önemli göstergelerindendir.",
      "incomplete": "Kararın doğru yönde; ancak gerekçeni tamamlamalısın. Demirin yalnızca renginin değiştiğini söylemek yeterli değildir. Yüzeyde pas adı verilen yeni bir maddenin oluştuğunu belirt.",
      "incorrect": "Gözlemini yeniden değerlendir. Burada yalnızca demirin görünümü veya şekli değişmiyor; demirin yüzeyinde pas adı verilen yeni bir madde oluşuyor. Bu nedenle olay fiziksel değil, kimyasal değişimdir."
    },
    "molecularNote": "Demir (Fe) atomları, havadaki oksijen (O₂) ve su buharı ile kimyasal bağ kurarak demir oksit (pas) bileşiğine dönüşür.",
    "acceptedObservations": [
      "Demirin rengi değişti.",
      "Demirin üzerinde kahverengi-kızılımsı bir tabaka oluştu.",
      "Parlak metal yüzeyi paslı hâle geldi.",
      "Yüzeyde yeni bir tabaka oluştu."
    ],
    "acceptedDecisions": [
      "Kimyasal değişimdir.",
      "Kimyasal değişim olduğunu düşünüyorum çünkü demirin yüzeyinde yeni bir madde oluştu.",
      "Pas oluştuğu için kimyasal değişimdir."
    ]
  },
  {
    "id": 2,
    "slug": "case-2-kagidin-yanmasi",
    "title": "Kağıdın Yanması",
    "shortDesc": "Aleve tutulan kâğıt yaprağı kül olana kadar yanıyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\"/></svg>",
    "correctType": "chemical",
    "molecularType": "combustion",
    "chemicalEquation": "(C₆H₁₀O₅)ₙ (Selüloz) + O₂ ➔ CO₂(g) + H₂O(buhar) + Kül + Isı",
    "misconception": "Kağıt küçülüp yok olmuyor; oksijen ile hızlı tepkimeye girerek karbondioksit gazı, su buharı ve kül kalıntıları gibi yeni kimyasal ürünlere dönüşüyor.",
    "videoUrl": "videos/case-2-kagidin-yanmasi.mp4",
    "thumbnailUrl": "thumbnails/case-2-kagidin-yanmasi.jpg",
    "clues": [
      {
        "id": "c2_1",
        "label": "Alev ve Işık Oluşumu",
        "isObserved": true
      },
      {
        "id": "c2_2",
        "label": "Isı Açığa Çıkışı (Ekzotermik)",
        "isObserved": true
      },
      {
        "id": "c2_3",
        "label": "Kül ve Gaz / Duman Oluşumu",
        "isObserved": true
      },
      {
        "id": "c2_4",
        "label": "Renk Kararması",
        "isObserved": true
      },
      {
        "id": "c2_5",
        "label": "Çökelme Oluşumu",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "alev",
      "yan",
      "ışık",
      "ısı",
      "duman",
      "kül",
      "renk",
      "kara"
    ],
    "decisionKeywords": [
      "kimyasal",
      "kül",
      "gaz",
      "yeni madde",
      "yanma",
      "ürün"
    ],
    "feedbacks": {
      "correct": "Doğru. Yanma sırasında ısı ve ışık açığa çıkarken kağıttan farklı özelliklere sahip kül ve gaz ürünleri oluşur. Bu nedenle olay kimyasal değişimdir.",
      "incomplete": "Gözlemin doğru ancak açıklamanı güçlendirmelisin. Alev veya sıcaklık artışının yanında kül, duman ya da gaz gibi yeni maddelerin oluştuğunu da belirt.",
      "incorrect": "Kağıt yalnızca biçim değiştirmiyor. Yanma sonucunda başlangıçtaki kağıttan farklı maddeler oluşuyor. Bu nedenle bu olay fiziksel değişim olarak sınıflandırılamaz."
    },
    "molecularNote": "Kağıttaki selüloz molekülleri oksijenle hızlı bir yanma tepkimesine girerek karbondioksit (CO₂), su buharı ve kül kalıntılarına ayrışır.",
    "acceptedObservations": [
      "Kağıt yanarken alev oluştu.",
      "Işık ve ısı açığa çıktı.",
      "Kağıdın rengi değişti.",
      "Duman ve kül oluştu.",
      "Kağıt yanarak farklı maddelere dönüştü."
    ],
    "acceptedDecisions": [
      "Kimyasal değişimdir.",
      "Kül ve gaz gibi yeni maddeler oluştuğu için kimyasal değişimdir."
    ]
  },
  {
    "id": 3,
    "slug": "case-3-elmanin-curumesi",
    "title": "Elmanın Çürümesi",
    "shortDesc": "Kesilip bekletilen elma zamanla kahverengileşiyor ve yumuşuyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z\"/><path d=\"M10 2c1 .5 2 2 2 5\"/></svg>",
    "correctType": "chemical",
    "molecularType": "decay",
    "chemicalEquation": "Polifenol + O₂ + Enzim ➔ Melanoit Pigmentleri (Esmerleşme)",
    "misconception": "Elmanın çürümesi basit bir şekil veya su kaybı değildir; elma hücrelerindeki polifenol oksidaz enzimleri oksijenle biyokimyasal reaksiyona girerek kalıcı yapı bozulmasına yol açar.",
    "videoUrl": "videos/case-3-elmanin-curumesi.mp4",
    "thumbnailUrl": "thumbnails/case-3-elmanin-curumesi.jpg",
    "clues": [
      {
        "id": "c3_1",
        "label": "Renk Koyulaşması / Kararma",
        "isObserved": true
      },
      {
        "id": "c3_2",
        "label": "Yumuşama ve Yapı Bozulması",
        "isObserved": true
      },
      {
        "id": "c3_3",
        "label": "Koku Değişimi",
        "isObserved": true
      },
      {
        "id": "c3_4",
        "label": "Hâl Değişimi",
        "isObserved": false
      },
      {
        "id": "c3_5",
        "label": "Gaz Kabarcığı",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "kahverengi",
      "koyu",
      "karar",
      "yumuşa",
      "koku",
      "bozul",
      "çürü",
      "leke"
    ],
    "decisionKeywords": [
      "kimyasal",
      "yapı",
      "yeni madde",
      "biyokimyasal",
      "kalıcı",
      "bozul"
    ],
    "feedbacks": {
      "correct": "Doğru. Elmanın çürümesi sırasında maddenin kimyasal yapısında değişiklikler meydana gelir ve başlangıçtaki elmanın özellikleri kalıcı biçimde değişir.",
      "incomplete": "Gözlemlediğin renk veya yapı değişimi doğru; ancak kararının gerekçesini belirtmelisin. Çürümede yalnızca görünüm değil, maddenin kimyasal yapısı da değişir.",
      "incorrect": "Bu olay yalnızca şekil veya hâl değişimi değildir. Elmanın çürümesi sırasında kimyasal süreçler gerçekleştiğinden olay kimyasal değişimdir."
    },
    "molecularNote": "Havadaki oksijen ile elmadaki enzimler tepkimeye girerek polifenolleri melanoit pigmentlerine dönüştürür (enzimatik esmerleşme).",
    "acceptedObservations": [
      "Elmanın rengi koyulaştı/kahverengileşti.",
      "Elma yumuşadı.",
      "Görünümü bozuldu.",
      "Kokusu değişebilir.",
      "Zamanla çürüme belirtileri ortaya çıktı."
    ],
    "acceptedDecisions": [
      "Kimyasal değişimdir.",
      "Elmanın yapısı değişti ve yeni maddeler oluştuğu için kimyasal değişimdir."
    ]
  },
  {
    "id": 4,
    "slug": "case-4-buzun-erimesi",
    "title": "Buzun Erimesi",
    "shortDesc": "Masada bırakılan buz küpü zamanla suya dönüşüyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m10 15 5-3-5-3v6Z\"/><path d=\"M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z\"/></svg>",
    "correctType": "physical",
    "molecularType": "melting",
    "chemicalEquation": "H₂O(katı/buz) + Isı ➔ H₂O(sıvı/su)",
    "misconception": "Buz eridiğinde su molekülünün iç yapısı değişmez. O ve H atomları arasındaki kovalent bağlar aynen kalır; yalnızca moleküller arası hidrojen bağları esneyerek katı kafes düzeninden serbest sıvı akışkanlığına geçer.",
    "videoUrl": "videos/case-4-buzun-erimesi.mp4",
    "thumbnailUrl": "thumbnails/case-4-buzun-erimesi.jpg",
    "clues": [
      {
        "id": "c4_1",
        "label": "Hâl Değişimi (Katıdan Sıvıya)",
        "isObserved": true
      },
      {
        "id": "c4_2",
        "label": "Akışkanlık Kazanma",
        "isObserved": true
      },
      {
        "id": "c4_3",
        "label": "Madde Kimliğinin Korunması (H₂O)",
        "isObserved": true
      },
      {
        "id": "c4_4",
        "label": "Renk / Koku Değişimi",
        "isObserved": false
      },
      {
        "id": "c4_5",
        "label": "Yeni Madde Oluşumu",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "eri",
      "su",
      "sıvı",
      "akışkan",
      "katı",
      "hâl",
      "damla"
    ],
    "decisionKeywords": [
      "fiziksel",
      "hâl değişimi",
      "yeni madde oluşmadı",
      "aynı madde",
      "su kalır"
    ],
    "feedbacks": {
      "correct": "Doğru. Buz erirken suyun kimyasal yapısı değişmez; yalnızca katı hâlden sıvı hâle geçer. Bu nedenle fiziksel değişimdir.",
      "incomplete": "Kararın doğru olabilir ancak nedenini tamamla. Erime sırasında yeni bir madde oluşmadığını ve yalnızca hâl değişimi gerçekleştiğini belirt.",
      "incorrect": "Erime sırasında yeni bir madde oluşmaz. Buz da oluşan sıvı da sudur. Değişen yalnızca fiziksel hâlidir; bu nedenle olay fiziksel değişimdir."
    },
    "molecularNote": "H₂O molekülleri arasındaki hidrojen bağları ısı alarak esner; moleküler yapı aynı kalır fakat katı kafes düzeninden serbest sıvı hareketine geçer.",
    "acceptedObservations": [
      "Buz küçüldü ve sıvı su oluştu.",
      "Katı hâlden sıvı hâle geçti.",
      "Buz eridi.",
      "Maddenin fiziksel hâli değişti."
    ],
    "acceptedDecisions": [
      "Fiziksel değişimdir.",
      "Yalnızca hâl değişimi gerçekleştiği için fiziksel değişimdir.",
      "Madde yine sudur."
    ]
  },
  {
    "id": 5,
    "slug": "case-5-bakir-telin-dovulmesi",
    "title": "Bakır Telin Dövülmesi",
    "shortDesc": "Çekiçle dövülen bakır tel yassılaşıp şekil değiştiriyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9\"/><path d=\"M17.64 15 22 10.64\"/><path d=\"m20.91 3.26-6.5 6.5\"/></svg>",
    "correctType": "physical",
    "molecularType": "metal_hammer",
    "chemicalEquation": "Cu(k) + Mekanik Kuvvet ➔ Cu(k, yassılaşmış)",
    "misconception": "Bakır dövüldüğünde başka bir elemente veya maddeye dönüşmez; metalik bağlar sayesinde elektron denizi içindeki atom katmanları birbiri üzerinden kayarak yeni biçim alır.",
    "videoUrl": "videos/case-5-bakir-telin-dovulmesi.mp4",
    "thumbnailUrl": "thumbnails/case-5-bakir-telin-dovulmesi.jpg",
    "clues": [
      {
        "id": "c5_1",
        "label": "Şekil Değişimi / Yassılaşma",
        "isObserved": true
      },
      {
        "id": "c5_2",
        "label": "Fiziksel Boyut Değişimi",
        "isObserved": true
      },
      {
        "id": "c5_3",
        "label": "Yeni Madde Oluşmaması",
        "isObserved": true
      },
      {
        "id": "c5_4",
        "label": "Renk / Kimlik Değişimi",
        "isObserved": false
      },
      {
        "id": "c5_5",
        "label": "Gaz / Duman Çıkışı",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "şekil",
      "yassı",
      "biçim",
      "ezil",
      "tel",
      "çekiç",
      "bükül"
    ],
    "decisionKeywords": [
      "fiziksel",
      "şekil",
      "yeni madde",
      "bakır",
      "aynı madde",
      "yapı değişmez"
    ],
    "feedbacks": {
      "correct": "Doğru. Dövülme sırasında bakırın kimyasal yapısı değişmez; yalnızca şekli değişir. Bu nedenle fiziksel değişimdir.",
      "incomplete": "Şekil değişimini doğru gözlemledin. Açıklamanı tamamlamak için yeni bir madde oluşmadığını da belirt.",
      "incorrect": "Bakır dövüldüğünde başka bir maddeye dönüşmez. Yalnızca biçimi değiştiği için bu olay kimyasal değil fiziksel değişimdir."
    },
    "molecularNote": "Bakır (Cu) metalik kristal kafesindeki atom katmanları birbiri üzerinde kayar; metalik bağlar kopup yeniden oluşmaz, kimlik korunur.",
    "acceptedObservations": [
      "Bakır telin şekli değişti.",
      "Tel yassılaştı.",
      "Bakırın biçimi değişti.",
      "Madde aynı kaldı, yalnızca şekli değişti."
    ],
    "acceptedDecisions": [
      "Fiziksel değişimdir.",
      "Yeni madde oluşmadığı, yalnızca şekil değiştiği için fiziksel değişimdir."
    ]
  },
  {
    "id": 6,
    "slug": "case-6-suyun-donmasi",
    "title": "Suyun Donması",
    "shortDesc": "Derin dondurucuya konan su, katı buz hâline geçiyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M2 12h20\"/><path d=\"M12 2v20\"/><path d=\"m20 20-4-4\"/><path d=\"m4 4 4 4\"/><path d=\"m4 20 4-4\"/><path d=\"m20 4-4 4\"/></svg>",
    "correctType": "physical",
    "molecularType": "freezing",
    "chemicalEquation": "H₂O(sıvı) ➔ H₂O(katı/buz) + Isı Salınımı",
    "misconception": "Suyun donması yeni bir madde oluşturmaz. Katı buz da sıvı su da aynı H₂O molekülleridir; yalnızca sıcaklık düştükçe hidrojen bağları altıgen kristal kafese kilitlenir.",
    "videoUrl": "videos/case-6-suyun-donmasi.mp4",
    "thumbnailUrl": "thumbnails/case-6-suyun-donmasi.jpg",
    "clues": [
      {
        "id": "c6_1",
        "label": "Hâl Değişimi (Sıvıdan Katıya)",
        "isObserved": true
      },
      {
        "id": "c6_2",
        "label": "Sertleşme / Buz Oluşumu",
        "isObserved": true
      },
      {
        "id": "c6_3",
        "label": "H₂O Moleküler Kimliğinin Sürmesi",
        "isObserved": true
      },
      {
        "id": "c6_4",
        "label": "Renk Değişimi",
        "isObserved": false
      },
      {
        "id": "c6_5",
        "label": "Yeni Madde Oluşumu",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "katı",
      "buz",
      "don",
      "sıvı",
      "hâl",
      "şeffaf"
    ],
    "decisionKeywords": [
      "fiziksel",
      "hâl değişimi",
      "aynı madde",
      "su",
      "yeni madde yok"
    ],
    "feedbacks": {
      "correct": "Doğru. Donma sırasında suyun kimyasal yapısı değişmez; yalnızca sıvı hâlden katı hâle geçer.",
      "incomplete": "Gözlemin doğru. Kararını gerekçelendirirken yeni bir madde oluşmadığını ve yalnızca hâl değişimi gerçekleştiğini de belirt.",
      "incorrect": "Suyun donması yeni bir madde oluşturmaz. Buz da sudan oluşur. Bu nedenle olay fiziksel değişimdir."
    },
    "molecularNote": "Sıvı su ısı kaybedip sıcaklığı 0°C altına düştüğünde hidrojen bağları altıgen kristal bir kafes yapısına kilitlenir.",
    "acceptedObservations": [
      "Su katılaştı.",
      "Sıvı su buza dönüştü.",
      "Sıvı hâlden katı hâle geçti.",
      "Hâl değişimi gerçekleşti."
    ],
    "acceptedDecisions": [
      "Fiziksel değişimdir.",
      "Su aynı madde olarak kaldığı için fiziksel değişimdir."
    ]
  },
  {
    "id": 7,
    "slug": "case-7-betonun-sertlesmesi",
    "title": "Betonun Sertleşmesi (\"Donması\")",
    "shortDesc": "Islak beton karışımı zamanla taş gibi sertleşiyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z\"/><path d=\"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65\"/><path d=\"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65\"/></svg>",
    "correctType": "chemical",
    "molecularType": "concrete",
    "chemicalEquation": "2Ca₃SiO₅ + 7H₂O ➔ 3CaO·2SiO₂·4H₂O (C-S-H) + 3Ca(OH)₂ + Isı",
    "misconception": "DİKKAT KAVRAM TUZAĞI! Betonun \"donması\", suyun donması gibi basit bir hâl değişimi DEĞİLDİR. Çimento bileşenleri ile su kimyasal olarak tepkimeye girer (hidratasyon) ve iğnemsi kristal bağlar oluşturur.",
    "videoUrl": "videos/case-7-betonun-sertlesmesi.mp4",
    "thumbnailUrl": "thumbnails/case-7-betonun-sertlesmesi.jpg",
    "clues": [
      {
        "id": "c7_1",
        "label": "Akışkanlıktan Taşlaşmaya Geçiş",
        "isObserved": true
      },
      {
        "id": "c7_2",
        "label": "Kimyasal Hidratasyon / Yeni Kristal Yapı",
        "isObserved": true
      },
      {
        "id": "c7_3",
        "label": "Sıcaklık Değişimi (Ekzotermik Reaksiyon)",
        "isObserved": true
      },
      {
        "id": "c7_4",
        "label": "Basit Hâl Değişimi Değildir",
        "isObserved": true
      },
      {
        "id": "c7_5",
        "label": "Alev / Işık Oluşumu",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "sertleş",
      "katı",
      "taş",
      "kıvam",
      "don",
      "harç",
      "beton"
    ],
    "decisionKeywords": [
      "kimyasal",
      "tepkime",
      "çimento",
      "hidratasyon",
      "yeni madde",
      "reaksiyon"
    ],
    "feedbacks": {
      "correct": "Doğru. Betonun 'donması', suyun donması gibi basit bir hâl değişimi değildir. Çimento bileşenleri suyla tepkimeye girerek yeni yapılar oluşturur ve beton sertleşir. Bu nedenle kimyasal değişimdir.",
      "incomplete": "Betonun sertleştiğini doğru gözlemledin; ancak yalnızca 'katılaştı' demek karar vermek için yeterli değildir. Sertleşmenin kimyasal tepkimeler sonucunda gerçekleştiğini de belirt.",
      "incorrect": "Buradaki 'donma' sözcüğü yanıltıcı olabilir. Beton su gibi yalnızca sıvıdan katıya geçmez; çimento ile su arasında kimyasal tepkimeler gerçekleşir. Bu nedenle kimyasal değişimdir."
    },
    "molecularNote": "Çimentodaki kalsiyum silikatlar suyla temas ettiğinde hidratasyon reaksiyonu başlar; kalsiyum silikat hidrat (C-S-H) iğnemsi kristalleri oluşarak kilitlenir.",
    "acceptedObservations": [
      "Islak beton zamanla sertleşti.",
      "Başlangıçta akışkan olan karışım katı ve sert bir yapı kazandı.",
      "Betonun kıvamı ve yapısı değişti."
    ],
    "acceptedDecisions": [
      "Kimyasal değişimdir.",
      "Betonun sertleşmesi yalnızca suyun donması değildir; kimyasal tepkimeler gerçekleştiği için kimyasal değişimdir."
    ]
  },
  {
    "id": 8,
    "slug": "case-8-ekmegin-kuflenmesi",
    "title": "Ekmeğin Küflenmesi",
    "shortDesc": "Birkaç gün bekletilen ekmeğin üzerinde yeşil-siyah lekeler beliriyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z\"/><path d=\"M8.5 8.5v.01\"/><path d=\"M16 15.5v.01\"/><path d=\"M12 12v.01\"/><path d=\"M11 17v.01\"/><path d=\"M7 14v.01\"/></svg>",
    "correctType": "chemical",
    "molecularType": "mold",
    "chemicalEquation": "Nişasta + Küf Enzimleri + O₂ ➔ Yeni Organik Ürünler + Koku Bileşikleri",
    "misconception": "Küflenme yalnızca ekmeğin üstündeki bir kirlenme veya leke değildir; küf mantarları ekmekteki nişasta ve proteinleri salgıladıkları enzimlerle kimyasal olarak sindirir ve kalıcı olarak ayrıştırır.",
    "videoUrl": "videos/case-8-ekmegin-kuflenmesi.mp4",
    "thumbnailUrl": "thumbnails/case-8-ekmegin-kuflenmesi.jpg",
    "clues": [
      {
        "id": "c8_1",
        "label": "Küf Tabakası Oluşumu",
        "isObserved": true
      },
      {
        "id": "c8_2",
        "label": "Renk Değişimi (Yeşil/Siyah Lekeler)",
        "isObserved": true
      },
      {
        "id": "c8_3",
        "label": "Koku ve Doku Bozulması",
        "isObserved": true
      },
      {
        "id": "c8_4",
        "label": "Biyokimyasal Ayrışma",
        "isObserved": true
      },
      {
        "id": "c8_5",
        "label": "Gaz Çıkışı / Alev",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "küf",
      "yeşil",
      "siyah",
      "leke",
      "koku",
      "bozul",
      "ekmek",
      "benek"
    ],
    "decisionKeywords": [
      "kimyasal",
      "yapı",
      "biyokimyasal",
      "yeni madde",
      "ayrışma",
      "bozul"
    ],
    "feedbacks": {
      "correct": "Doğru. Küflenme sırasında ekmekte biyokimyasal değişimler gerçekleşir ve başlangıçtaki maddenin özellikleri kalıcı olarak değişir.",
      "incomplete": "Gözlemlediğin küf oluşumu doğru. Kararını daha güçlü hâle getirmek için bunun yalnızca yüzey görünümündeki bir değişim olmadığını, maddenin yapısının da değiştiğini belirt.",
      "incorrect": "Küflenme yalnızca renk değişimi değildir. Ekmeğin yapısında kimyasal değişiklikler meydana geldiğinden olay kimyasal değişimdir."
    },
    "molecularNote": "Küf mantarları (fungi) salgıladıkları enzimlerle ekmekteki nişasta ve karbonhidratları sindirerek yeni organik bileşiklere dönüştürür.",
    "acceptedObservations": [
      "Ekmeğin üzerinde yeşil/mavi/beyaz lekeler oluştu.",
      "Ekmeğin görünümü değişti.",
      "Küf oluştu.",
      "Kokusu ve yapısı değişti."
    ],
    "acceptedDecisions": [
      "Kimyasal değişimdir.",
      "Ekmeğin yapısı değiştiği için kimyasal değişimdir."
    ]
  },
  {
    "id": 9,
    "slug": "case-9-suyun-elektrolizi",
    "title": "Suyun Elektrolizi",
    "shortDesc": "Elektrik akımı verilen suda iki elektrottan gaz kabarcıkları yükseliyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M13 2 3 14h9l-1 8 10-12h-9l1-8z\"/></svg>",
    "correctType": "chemical",
    "molecularType": "electrolysis",
    "chemicalEquation": "2H₂O(s) + Elektrik Enerjisi ➔ 2H₂(g) + O₂(g)",
    "misconception": "Buradaki gaz kabarcıkları suyun kaynaması (buharlaşması) değildir; elektrik enerjisi suyun kovalent bağlarını parçalayarak hidrojen ve oksijen gazı olarak iki yeni maddeye ayrıştırır.",
    "videoUrl": "videos/case-9-suyun-elektrolizi.mp4",
    "thumbnailUrl": "thumbnails/case-9-suyun-elektrolizi.jpg",
    "clues": [
      {
        "id": "c9_1",
        "label": "Gaz Kabarcıkları Çıkışı",
        "isObserved": true
      },
      {
        "id": "c9_2",
        "label": "Suyun Kimyasal Ayrışması",
        "isObserved": true
      },
      {
        "id": "c9_3",
        "label": "Yeni Maddelerin (H₂ ve O₂) Oluşması",
        "isObserved": true
      },
      {
        "id": "c9_4",
        "label": "Renk Değişimi",
        "isObserved": false
      },
      {
        "id": "c9_5",
        "label": "Çökelme Oluşumu",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "kabarcık",
      "gaz",
      "elektrot",
      "elektrik",
      "köpük",
      "baloncuk",
      "çıkış"
    ],
    "decisionKeywords": [
      "kimyasal",
      "ayrışma",
      "hidrojen",
      "oksijen",
      "yeni madde",
      "gaz oluş"
    ],
    "feedbacks": {
      "correct": "Doğru. Elektroliz sırasında su kimyasal olarak ayrışır ve başlangıçtaki sudan farklı maddeler oluşur. Gaz çıkışı da bu değişimin gözlenebilir kanıtlarından biridir.",
      "incomplete": "Gaz kabarcıklarını doğru gözlemledin. Açıklamanı tamamlamak için bunun yeni maddelerin oluştuğunu gösterdiğini belirt.",
      "incorrect": "Buradaki gaz kabarcıkları yalnızca fiziksel bir hareket değildir. Elektrik enerjisi kullanılarak su kimyasal olarak ayrışır. Bu nedenle olay kimyasal değişimdir."
    },
    "molecularNote": "2H₂O + Elektrik enerjisi → 2H₂ (Hidrojen gazı) + O₂ (Oksijen gazı). Kovalent bağlar kırılarak yeni moleküller teşekkül eder.",
    "acceptedObservations": [
      "Elektrotlarda gaz kabarcıkları oluştu.",
      "İki tarafta gaz çıkışı gözlendi.",
      "Elektrik verildiğinde gaz oluşumu başladı."
    ],
    "acceptedDecisions": [
      "Kimyasal değişimdir.",
      "Sudan farklı maddeler/gazlar oluştuğu için kimyasal değişimdir."
    ]
  },
  {
    "id": 10,
    "slug": "case-10-mumun-yanmasi",
    "title": "Mumun Yanması",
    "shortDesc": "Tutuşturulan mumun fitili yanmaya devam ediyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M12 2c.5 1.5 1.5 3 1.5 4.5a1.5 1.5 0 0 1-3 0C10.5 5 11.5 3.5 12 2Z\"/><rect x=\"8\" y=\"9\" width=\"8\" height=\"13\" rx=\"2\"/></svg>",
    "correctType": "chemical",
    "molecularType": "candle",
    "chemicalEquation": "C₂₅H₅₂(katı) ➔ C₂₅H₅₂(sıvı) [Fiziksel]; C₂₅H₅₂ + 38O₂ ➔ 25CO₂ + 26H₂O [Kimyasal]",
    "misconception": "DİKKAT KAVRAM TUZAĞI! Mumun erimesi fiziksel bir hâl değişimidir; ancak fitilde alevle gerçekleşen asıl olay yanmadır. Buharlaşan parafin oksijenle reaksiyona girerek CO₂ ve su buharı üretir (kimyasal).",
    "videoUrl": "videos/case-10-mumun-yanmasi.mp4",
    "thumbnailUrl": "thumbnails/case-10-mumun-yanmasi.jpg",
    "clues": [
      {
        "id": "c10_1",
        "label": "Fitilde Alev ve Işık Oluşumu",
        "isObserved": true
      },
      {
        "id": "c10_2",
        "label": "Isı Açığa Çıkması",
        "isObserved": true
      },
      {
        "id": "c10_3",
        "label": "Yeni Maddelerin (CO₂, H₂O buharı) Oluşumu",
        "isObserved": true
      },
      {
        "id": "c10_4",
        "label": "Mumun Erimesi (Eşlik Eden Fiziksel Olay)",
        "isObserved": true
      },
      {
        "id": "c10_5",
        "label": "Çökelme Oluşumu",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "alev",
      "fitil",
      "ışık",
      "ısı",
      "eri",
      "mum",
      "duman",
      "azal"
    ],
    "decisionKeywords": [
      "kimyasal",
      "yanma",
      "yeni madde",
      "gaz",
      "fitil",
      "ürün"
    ],
    "feedbacks": {
      "correct": "Doğru. Mumun yanması sırasında ısı ve ışık açığa çıkar ve yeni maddeler oluşur. Bu nedenle yanma kimyasal değişimdir.",
      "incomplete": "Mumun eridiğini doğru gözlemledin; ancak bu yalnızca fiziksel değişim kısmıdır. İncelenen olay mumun yanmasıdır. Alev oluşması, enerji açığa çıkması ve yeni maddelerin oluşmasını da değerlendirmelisin.",
      "incorrect": "Mumun erimesi fiziksel değişimdir; fakat mumun yanması farklıdır. Yanma sırasında kimyasal tepkime gerçekleşir ve yeni maddeler oluşur. Bu nedenle incelenen olay kimyasal değişimdir."
    },
    "molecularNote": "Eriyen parafin fitile tırmanarak buharlaşır ve oksijenle kimyasal reaksiyona girerek CO₂ ve H₂O buharına dönüşür.",
    "acceptedObservations": [
      "Mumun fitilinde alev oluştu.",
      "Isı ve ışık açığa çıktı.",
      "Mum yanarken boyu azaldı.",
      "Mumun bir kısmı eridi."
    ],
    "acceptedDecisions": [
      "Mumun yanması kimyasal değişimdir.",
      "Yanma sırasında yeni maddeler oluştuğu için kimyasal değişimdir."
    ]
  },
  {
    "id": 11,
    "slug": "case-11-sekerin-suda-cozunmesi",
    "title": "Şekerin Suda Çözünmesi",
    "shortDesc": "Bardağa atılan şeker küpü karıştırılınca gözden kayboluyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z\"/></svg>",
    "correctType": "physical",
    "molecularType": "dissolving",
    "chemicalEquation": "C₁₂H₂₂O₁₁(katı) + H₂O ➔ C₁₂H₂₂O₁₁(suda çözelti)",
    "misconception": "Şeker suda kaybolmaz veya erimez; çözünür! Şeker molekülleri su molekülleri tarafından çevrelenerek su içinde homojen dağılır. Şekerin kimliği ve tadı aynen korunur.",
    "videoUrl": "videos/case-11-sekerin-suda-cozunmesi.mp4",
    "thumbnailUrl": "thumbnails/case-11-sekerin-suda-cozunmesi.jpg",
    "clues": [
      {
        "id": "c11_1",
        "label": "Şekerin Çözünerek Görünmez Olması",
        "isObserved": true
      },
      {
        "id": "c11_2",
        "label": "Homojen Karışım (Çözelti) Oluşumu",
        "isObserved": true
      },
      {
        "id": "c11_3",
        "label": "Şeker Kimliğinin Korunması (Tadının Kalması)",
        "isObserved": true
      },
      {
        "id": "c11_4",
        "label": "Gaz / Duman Çıkışı",
        "isObserved": false
      },
      {
        "id": "c11_5",
        "label": "Renk Değişimi veya Alev",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "çözün",
      "kaybol",
      "görünmez",
      "dağıl",
      "karış",
      "şeker",
      "berrak"
    ],
    "decisionKeywords": [
      "fiziksel",
      "çözünme",
      "yeni madde yok",
      "şeker aynı",
      "kimlik korundu"
    ],
    "feedbacks": {
      "correct": "Doğru. Şeker suda çözünürken kimyasal kimliğini korur; yeni bir madde oluşmaz. Bu nedenle olay fiziksel değişim olarak değerlendirilir.",
      "incomplete": "Şekerin gözden kaybolduğunu doğru gözlemledin; ancak 'yok oldu' ifadesi doğru değildir. Şeker suda çözünmüştür. Kararını bu bilgiyle gerekçelendir.",
      "incorrect": "Şekerin görünmemesi onun kimyasal olarak yok olduğu anlamına gelmez. Şeker tanecikleri su içinde dağılır ve kimyasal kimliklerini korur. Bu nedenle fiziksel değişimdir."
    },
    "molecularNote": "Sükroz (C₁₂H₂₂O₁₁) molekülleri arasındaki kristal bağlar su molekülleriyle çevrilir ve su içinde ayrışmadan homojen dağılır.",
    "acceptedObservations": [
      "Şeker karıştırıldıkça görünmez hâle geldi.",
      "Şeker suda çözündü.",
      "Kristaller gözden kayboldu.",
      "Homojen bir çözelti oluştu."
    ],
    "acceptedDecisions": [
      "Fiziksel değişimdir.",
      "Şeker yeni bir maddeye dönüşmediği için fiziksel değişimdir.",
      "Çözünme gerçekleşti."
    ]
  },
  {
    "id": 12,
    "slug": "case-12-sutun-eksimesi",
    "title": "Sütün Ekşimesi (Kesilmesi)",
    "shortDesc": "Oda sıcaklığında uzun süre bekleyen süt topaklanıp kesiliyor.",
    "iconSvg": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M8 2h8\"/><path d=\"M9 2v3h6V2\"/><path d=\"M7 5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z\"/><path d=\"M10 12h4\"/></svg>",
    "correctType": "chemical",
    "molecularType": "milk_sour",
    "chemicalEquation": "C₁₂H₂₂O₁₁ (Laktoz) + Bakteri ➔ 4C₃H₆O₃ (Laktik Asit) + Kazein Pıhtısı",
    "misconception": "Sütün kesilmesi basit bir çökme veya fiziksel ayrışma değildir; bakterilerin laktozu laktik aside dönüştürmesiyle asitlik artar ve proteinlerin üç boyutlu yapısı (denatürasyon) kalıcı olarak bozulur.",
    "videoUrl": "videos/case-12-sutun-eksimesi.mp4",
    "thumbnailUrl": "thumbnails/case-12-sutun-eksimesi.jpg",
    "clues": [
      {
        "id": "c12_1",
        "label": "Topaklanma ve Pıhtılaşma (Kesilme)",
        "isObserved": true
      },
      {
        "id": "c12_2",
        "label": "Ekşi Koku ve Tat Oluşumu",
        "isObserved": true
      },
      {
        "id": "c12_3",
        "label": "Kalıcı Yapı Değişimi (Asitlik Artışı)",
        "isObserved": true
      },
      {
        "id": "c12_4",
        "label": "Alev ve Işık Oluşumu",
        "isObserved": false
      },
      {
        "id": "c12_5",
        "label": "Gaz Kabarcığı Çıkışı",
        "isObserved": false
      }
    ],
    "observationKeywords": [
      "kesil",
      "topak",
      "kıvam",
      "ekşi",
      "koku",
      "pıhtı",
      "süt",
      "katımsı"
    ],
    "decisionKeywords": [
      "kimyasal",
      "yapı",
      "asit",
      "laktik",
      "yeni madde",
      "bozul"
    ],
    "feedbacks": {
      "correct": "Doğru. Sütün ekşimesi sırasında kimyasal değişimler meydana gelir; asitlik artar ve süt proteinlerinin yapısı değişerek pıhtılaşma görülebilir. Bu nedenle olay kimyasal değişimdir.",
      "incomplete": "Topaklanma veya koku değişimini doğru gözlemledin; ancak kararını gerekçelendirmen gerekiyor. Bunların sütte gerçekleşen kimyasal değişimlerin sonucu olduğunu belirt.",
      "incorrect": "Sütün kesilmesi yalnızca biçim veya hâl değişimi değildir. Sütün yapısında kimyasal değişiklikler gerçekleştiği için olay kimyasal değişimdir."
    },
    "molecularNote": "Laktik asit bakterileri laktozu laktik aside dönüştürür. Düşen pH kazein proteinlerinin yapısını bozarak (denatürasyon) pıhtılaşmasına yol açar.",
    "acceptedObservations": [
      "Süt kesildi/topaklandı.",
      "Sütün kıvamı değişti.",
      "Ekşi koku oluştu.",
      "Sütte katımsı parçalar oluştu.",
      "Görünümü ve kokusu değişti."
    ],
    "acceptedDecisions": [
      "Kimyasal değişimdir.",
      "Sütün yapısı değiştiği ve yeni maddeler oluştuğu için kimyasal değişimdir."
    ]
  }
];
