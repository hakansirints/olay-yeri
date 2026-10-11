// Vaka bilgisi cevap bankasından bağımsızdır. Kaynak cevap.docx ve vaka bağlamı.
(function () {
  'use strict';
  var definitions = [
    [1, /demir|pas|oksit/, [ ['rust', /pas\w*/, /paslan\w*|olus\w*|cik\w*|var|geldi/], ['surface', /reng\w*|renk\w*|tabaka\w*|yuzey\w*/, /degis\w*|kahvereng\w*|kizil\w*|pasli|olus\w*|cik\w*|don\w*|geldi/] ], /altin\w*|seker\w*/, 'Pasın demirden farklı bir madde olmasıyla kararını ilişkilendir.'],
    [2, /kagit|kul|yanma|yanar/, [ ['burn', /kagit\w*|alev\w*|isik\w*|isi\w*|duman\w*|kul\w*|reng\w*/, /yan\w*|olus\w*|cik\w*|kal\w*|degis\w*|donus\w*/] ], /su\s+oldu/, 'Yanma sırasında kağıttan farklı hangi ürünlerin oluştuğunu açıkla.'],
    [3, /elma|kesilen|esmerles|curu/, [ ['color', /elma\w*|reng\w*|renk\w*|gorunum\w*|koku\w*|belirti\w*/, /koyulas\w*|kahverengiles\w*|yumus\w*|bozul\w*|degis\w*|cik\w*/] ], /katidan\s+siviya/, 'Elmadaki renk değişimini maddelerin kimyasal dönüşümüyle ilişkilendir.'],
    [4, /buz|su\b|suy|h2o|erim|eridi/, [ ['melt', /buz\w*|kati\w*|hal\w*|madde\w*/, /eridi\w*|eri\w*|kucul\w*|sivi\w*|gec\w*|degis\w*/] ], /metal\w*|hidrojen\w*|oksijen\w*/, 'Erimeden önce ve sonra maddenin kimliğinin korunup korunmadığını açıkla.'],
    [5, /bakir|tel|dovul/, [ ['shape', /bakir\w*|tel\w*|sek\w*|bicim\w*/, /yassilas\w*|degis\w*|dovul\w*/] ], /demir\w*|buhar\w*/, 'Telin şekli değişirken hâlâ bakır olup olmadığını açıkla.'],
    [6, /su\b|suy|buz|h2o|donma|donunca/, [ ['freeze', /su\w*|sivi\w*|hal\w*/, /dondu\w*|don\w*|kati\w*|buz\w*|gec\w*|degis\w*|gercekles\w*/] ], /oksijen\w*|hidrojen\w*|yan\w*|kul\w*/, 'Su ve buzun aynı madde olup olmadığını gerekçende belirt.'],
    [7, /beton|cimento|hidratasyon|sertles/, [ ['harden', /beton\w*|karisim\w*|kivam\w*|yapi\w*/, /sertles\w*|kati\w*|degis\w*|kazandi\w*|akmiyor|oldu/] ], /buz\w*|yan\w*|tamamen\s+gaz/, 'Sertleşmeyi çimentonun suyla tepkimesiyle ilişkilendir.'],
    [8, /ekme|kuf|mikroorganiz/, [ ['mold', /ekme\w*|kuf\w*|leke\w*|gorunum\w*|koku\w*|yapi\w*/, /olus\w*|degis\w*|belir\w*|kuflen\w*|cik\w*/] ], /yalnizca\s+boya/, 'Küflenmeyi ekmeğin maddelerindeki kimyasal dönüşümle ilişkilendir.'],
    [9, /su\w*|suy|elektr|elektrot|hidrojen|oksijen|ayris/, [ ['gas', /elektrot\w*|gaz\w*|kabarcik\w*/, /olus\w*|cik\w*|gozlen\w*|yuksel\w*|basla\w*/] ], /buharlas\w*|su\s+buhar\w*/, 'Elektrolizde oluşan gazların sudan farklı maddeler olup olmadığını açıkla.'],
    [10, /mum|yanma|yanar|yanmada|yanarken|fitil/, [ ['burn', /mum\w*|fitil\w*|alev\w*|isi\w*|isik\w*|boy\w*/, /olus\w*|cik\w*|azal\w*|eri\w*|yan\w*|olma\w*/] ], /metal\w*/, 'Erime ve yanmayı ayır; yanma sırasında yeni madde oluşumunu açıkla.'],
    [11, /seker|kristal|cozun/, [ ['dissolve', /seker\w*|kristal\w*|cozelti\w*/, /gorun\w*|kaybol\w*|cozun\w*|olus\w*|dagil\w*/] ], /metal\w*|katidan\s+siviya|kimyasal\s+olarak\s+suya/, 'Şekerin suya dağılırken kimliğinin korunup korunmadığını belirt.'],
    [12, /sut|eksi|asit|laktik/, [ ['curdle', /sut\w*|kivam\w*|koku\w*|gorunum\w*|parca\w*/, /kesil\w*|topaklan\w*|degis\w*|olus\w*|pihtilas\w*/] ], /buz\w*|sadece\s+soguy/, 'Ekşimeyi asit oluşumu veya diğer kimyasal dönüşümlerle ilişkilendir.']
  ];
  // Öğrenciye sunulan sorular sonuç, ürün veya tepkimeyi söylemez.
  // Kaynaktaki açıklayıcı yönlendirmeler yalnızca yazar referansı olarak korunur.
  var questions = [null,
    'Başlangıçtaki metal ile son yüzeyi karşılaştır. Madde hakkında kararını hangi kanıt destekliyor?',
    'Kağıdın başlangıçtaki ve son durumunu karşılaştır. Görünümün ötesinde madde hakkında ne söyleyebilirsin?',
    'Elmanın görünümünün değişmesi tek başına yeterli bir ölçüt mü? Kararını madde hakkında hangi bilgiyle desteklersin?',
    'Erimeden önceki ve sonraki maddeyi karşılaştır. Görünüm ile madde kimliği arasında nasıl bir ayrım yaparsın?',
    'Telin biçimi ile yapıldığı maddeyi ayrı ayrı düşün. Kararını hangi karşılaştırma destekliyor?',
    'Donmadan önceki ve sonraki maddeyi karşılaştır. Hâl bilgisine ek olarak hangi bilgiyi gerekçene eklemelisin?',
    'Günlük dildeki “donma” sözü her zaman aynı süreci mi anlatır? Betonun başlangıç ve son durumunu hangi kanıtlarla karşılaştırırsın?',
    'Ekmeğin başlangıçtaki ve son durumunu karşılaştır. Görünümdeki değişimden madde hakkında hangi çıkarımı yapabilirsin?',
    'Kabarcıkları görmek, içlerindeki maddenin ne olduğunu bilmek için yeterli mi? Kararın için hangi ek bilgiye bakarsın?',
    'Erime ve yanmayı ayrı ayrı düşün. Her birinde başlangıç ve sonuçtaki maddeyi nasıl karşılaştırırsın?',
    'Şekerin görünmemesi, onun ne olduğuna karar vermek için yeterli mi? Kararını hangi bilgiyle desteklersin?',
    'Sütün kıvamının değişmesi tek başına yeterli bir ölçüt mü? Madde hakkında hangi bilgiyi gerekçene eklemelisin?'
  ];
  var rubrics = {};
  definitions.forEach(function (d) { rubrics[d[0]] = { link: d[1], observations: d[2], wrongMechanism: d[3], referencePrompt: d[4], question: questions[d[0]] }; });
  window.AnswerRubrics = { version: '2026.10.10.1', cases: rubrics };
})();
