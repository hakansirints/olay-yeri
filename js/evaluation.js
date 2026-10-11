// Yerel ve açıklanabilir ön değerlendirme. Bilinmeyen anlam kesin yanlış sayılmaz.
(function () {
  'use strict';
  function normalize(text) {
    return String(text || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var NEGATIVE = /\b(?:degil\w*|yok(?:tur)?|(?:olus|olustur|ol|degis|donus|gercekles|eri|don|cozun|ayris|ayril|gozlen|gozlemlen|gorul|yan|cik|korun|koru|kal|katilas|sertles|curu|kesil|topaklan|pihtilas|yumus|yassilas|koyulas|kahverengiles|azal|basla|degistir|paslan|kuflen|bozul|gec|yuksel|kucul)(?:ma|me)(?:di\w*|mis\w*|z\w*|yan\w*|yen\w*|dan\w*|den\w*)|(?:olus|degis|donus|ayris|cozun|korun|yan|cik|don|paslan|kuflen|gec)(?:mi|mu)yor\w*)\b/;
  var ACTION = /\b(?:olus\w*|olustur\w*|oldu\w*|olur\w*|var|yok|cik\w*|meydana\s+gel\w*|gozlen\w*|gor\w*|belir\w*|degis\w*|donus\w*|gercekles\w*|kazandi\w*|ayris\w*|ayril\w*|girdi\w*|girip|koru\w*|kal\w*)\b/;
  var UNCERTAIN = /\b(?:belki|olabilir|sanirim|emin\s+degil\w*|tahmin\w*|\w+(?:ebilir|abilir|saydi|seydi|ursa|irse))\b/;
  function negative(p) { return NEGATIVE.test(p); }
  function parts(text) {
    var source = String(text || '');
    source = source.replace(/\s+ve\s+(?=(?:demir\w*|kağı\w*|kagit\w*|ekme\w*|şeker\w*|seker\w*|beton\w*|mum\w*|suyun|su\s|atom\w*|proton\w*|molekül\w*|molekul\w*|aynı\s|ayni\s))/gi, '; ');
    return source.split(/[.!?;,\n]|\b(?:ama|ancak|fakat|oysa|cunku|çünkü)\b/i).map(function (raw) { return { text: raw.trim(), normalized: normalize(raw) }; }).filter(function (p) {
      var s = p.normalized;
      var rejectedClaim = /\bdemek\s+(?:yanlis|hatali)\b/.test(s) || /[“"«].*[”"»]/.test(p.text) && /(?:diyenler\s+)?(?:yanlis|hatali)\b/.test(s);
      var correctedBelief = /^(?:once|ilk\s+basta)\b.*\b(?:sandim|dusundum|zannettim)\b/.test(s) && /\bama\b/.test(normalize(source));
      return s && !rejectedClaim && !correctedBelief && !/\b(?:sistem|cevabi|cevap)\b.*\b(?:kabul\s+etsin|puan\s+ver|dogru\s+say)/.test(s);
    });
  }
  function facts(claims, subject, action, key) {
    var result = { positive: false, negative: false, evidence: [] };
    claims.forEach(function (claim) {
      var p = claim.normalized, matches = Array.from(p.matchAll(new RegExp('\\b(?:' + subject.source + ')\\b', 'g')));
      matches.forEach(function (m, i) {
        var end = i + 1 < matches.length ? matches[i + 1].index : p.length, tail = p.slice(m.index + m[0].length, end);
        var conjunction = tail.search(/\bve\b/);
        if (conjunction >= 0 && action.test(tail.slice(0, conjunction))) tail = tail.slice(0, conjunction);
        if (!action.test(tail) && !action.test(m[0])) return;
        var denied = negative(m[0] + ' ' + tail) || /\b(?:hic|hicbir)\b/.test(p.slice(Math.max(0, m.index - 12), m.index));
        result[denied ? 'negative' : 'positive'] = true;
        result.evidence.push({ concept: key, polarity: denied ? 'negative' : 'positive', process: claim.process || 'main', text: claim.text, predicate: m[0] + ' ' + tail });
      });
    });
    return result;
  }
  function processParts(c, list) {
    var process = 'main';
    return list.map(function (p) {
      var copy = Object.assign({}, p);
      if (c.id === 10) {
        if (/\byan\w*/.test(p.normalized)) process = 'burning';
        else if (/\beri(?:me\w*|rken|di\w*)/.test(p.normalized)) process = 'melting';
      }
      copy.process = process; return copy;
    });
  }
  function wrongClaims(c, list) {
    var rubric = window.AnswerRubrics.cases[c.id];
    return list.filter(function (p) {
      var s = p.normalized;
      if (negative(s.replace(/yok\s+ol(?:du\w*|ur\w*|mus\w*)/g, ''))) return false;
      var universal = /\b(?:her|butun|tum)\b.*(?:gaz\s+kabarcig\w*.*kimyasal|fiziksel.*(?:mutlaka|daima|her\s+zaman).*geri\s+don)/.test(s);
      var destruction = /\b(?:atom\w*|madde\w*|seker\w*)\b.*\byok\s+ol(?:du\w*|ur\w*|mus\w*)/.test(s);
      var transformation = rubric.wrongMechanism.test(s) && /\b(?:oldu\w*|donus\w*|gec\w*|ayris\w*|parcalan\w*|buhar\w*|yan\w*|eridi\w*)\b/.test(s);
      return universal || destruction || transformation;
    });
  }
  function classification(c, selected, list) {
    return list.some(function (p) {
      var s = p.normalized;
      if (/\bhem\s+fiziksel\s+hem\s+kimyasal/.test(s)) return false;
      return Array.from(s.matchAll(/\b(kimyasal|fiziksel)(?:dir)?\b/g)).some(function (m) {
        var tail = s.slice(m.index + m[0].length);
        if (!/dir$/.test(m[0]) && tail && !/^\s+(?:(?:bir|olarak)\s+)?(?:degisim\w*|tepkime\w*|olay\w*|degil\w*|oldug\w*)\b/.test(tail)) return false;
        if (c.id === 10 && p.process === 'melting') return false;
        var denied = /^\s*(?:degisim\w*\s+)?degil\w*/.test(tail) || /oldug\w*\s+dusunmu\w*/.test(tail);
        var kind = m[1] === 'kimyasal' ? 'chemical' : 'physical';
        return (!denied && kind !== selected) || (denied && kind === selected);
      });
    });
  }
  function unknownAssertion(part) {
    // Bilinen bir doğru ifade ek bir bilimsel iddiayı otomatik doğrulamaz.
    if (/molekul\w*\s+(?:duzen\w*|arasindaki\s+uzaklik\w*)\s+degis\w*/.test(part.normalized)) return false;
    return /\b(?:atom\w*|proton\w*|notron\w*|elektron\w*|kutle\w*|molekul\w*|tanecik\w*|kimlig\w*|bag\w*)\b/.test(part.normalized) &&
      /\b(?:art\w*|azal\w*|degis\w*|donus\w*|yok\w*|parcalan\w*|oldu\w*)\b/.test(part.normalized);
  }
  function observe(c, text) {
    var rubric = window.AnswerRubrics.cases[c.id], list = parts(text), s = normalize(text);
    if (!s) return { status: 'empty', evidence: [] };
    var all = [], positive = false, denied = false, conflict = false, polarities = {};
    rubric.observations.forEach(function (rule) {
      var f = facts(list, rule[1], rule[2], rule[0]);
      f.evidence.forEach(function (e) {
        var noun = e.predicate.split(' ')[0];
        var key = /^(?:reng|renk)/.test(noun) ? 'color' : /^tabaka/.test(noun) ? 'layer' : /^yuzey/.test(noun) ? 'surface' : rule[0];
        polarities[key] = polarities[key] || {}; polarities[key][e.polarity] = true;
      });
      all = all.concat(f.evidence); positive = positive || f.positive; denied = denied || f.negative;
    });
    conflict = Object.keys(polarities).some(function (key) { return polarities[key].positive && polarities[key].negative; });
    var shortEvents = { 1: /^paslan\w*$/, 2: /^yandi\w*$/, 3: /^(?:kahverengiles|yumus)\w*$/, 4: /^eridi\w*$/, 5: /^yassilas\w*$/, 6: /^dondu\w*$/, 7: /^sertles\w*$/, 8: /^kuflen\w*$/, 10: /^yandi\w*$/, 12: /^(?:topaklan|kesil)\w*$/ };
    positive = positive || !!(shortEvents[c.id] && shortEvents[c.id].test(s));
    var wrong = wrongClaims(c, list), conditional = UNCERTAIN.test(s) || /\?/.test(text);
    var reference = !conditional && (c.acceptedObservations || []).some(function (t) { return normalize(t) === s; });
    var status = conflict ? 'contradiction' : wrong.length || denied ? 'incorrect' : conditional ? 'incomplete' : positive || reference ? 'correct' :
      /\bbilmiyorum\b|\b(?:degisim|olay|degis\w*|oldu|var|kotu|gaz)\b/.test(s) || rubric.link.test(s) ? 'incomplete' : 'irrelevant';
    if (status === 'correct' && list.some(function (p) { return !all.some(function (a) { return a.text === p.text; }) && (/\b(?:donus\w*|kimlig\w*|parcalan\w*)/.test(p.normalized) || unknownAssertion(p)); })) status = 'review';
    if (status === 'incomplete' && list.some(unknownAssertion)) status = 'review';
    if (/(?:video\w*|ekran\w*)\b.*\b(?:kok\w*|sicaklig\w*|isi\b).*\b(?:hisset\w*|koklad\w*|tatt\w*)/.test(s)) status = 'review';
    return { status: status, evidence: all, wrong: wrong.map(function (p) { return p.text; }) };
  }
  function reason(c, text, selected) {
    var rubric = window.AnswerRubrics.cases[c.id], list = processParts(c, parts(text)), s = normalize(text);
    if (!s) return { status: 'empty', evidence: [] };
    if (/^bilmiyorum$/.test(s)) return { status: 'incomplete', evidence: [] };
    var main = list.filter(function (p) { return p.process !== 'melting'; });
    var formed = facts(main, /(?:yeni|farkli|baska)\s+(?:ozellik\w*\s+)?(?:bir\s+)?(?:kimyasal\s+)?madd\w*/, ACTION, 'newMatter');
    var chemical = facts(main, /kimyasal\s+(?:yapi\w*|kimlig\w*|kimlik\w*|ozellik\w*)|kimlig\w*|kimlik\w*|(?:elma\w*|ekme\w*)\s+madd\w*/, /degis\w*|koru\w*|ayni|kal\w*|bozul\w*/, 'identity');
    var preserved = main.some(function (p) { return /(?:ayni\s+(?:madde|bakir|seker)|madde\s+(?:yine\s+su|ayni\s+kal)|hala\s+(?:bakir|seker)|molekul\w*\s+(?:yine\s+)?h2o|h2o\s+molekul\w*\s+ayni|tanecik\w*\s+ayni)/.test(p.normalized) && !negative(p.normalized); }) || chemical.negative || chemical.evidence.some(function (e) { return e.polarity === 'positive' && /koru|ayni/.test(e.predicate); });
    var changed = chemical.evidence.some(function (e) { return e.polarity === 'positive' && /degis|bozul/.test(e.predicate); }) || main.some(function (p) { return /kimyasal\s+olarak\s+degis\w*|kimyasal\s+degisime\s+ugra\w*|farkli\s+(?:kimyasal\s+)?(?:bir\s+)?madde\w*\s+donus\w*|kimyasal\s+olarak\s+suya\s+donus\w*|artik\s+(?:bakir|seker)\s+degil/.test(p.normalized) && !negative(p.normalized.replace(/artik\s+(?:bakir|seker)\s+degil/, '')); });
    var productSubjects = { 1: /pas\w*|oksit\w*/, 2: /kul\w*|gaz\w*|urun\w*/, 9: /su\w*/, 12: /asit\w*|asitlik\w*/ };
    var product = facts(main, productSubjects[c.id] || /a^/, c.id === 9 ? /ayris\w*|ayril\w*/ : ACTION, 'caseProduct');
    var reaction = facts(main, /tepkime\w*|reaksiyon\w*|hidratasyon\w*/, /gir\w*|girdi\w*|gercekles\w*|oldu\w*|olus\w*/, 'reaction');
    var nominalProduct = main.some(function (p) { return /(?:pas|kul)\b.*\bfarkli\s+(?:bir\s+)?madde/.test(p.normalized) && !negative(p.normalized); });
    var sameFactConflict = formed.positive && formed.negative || product.positive && product.negative;
    var identityConflict = preserved && (formed.positive || changed || nominalProduct) || formed.negative && (product.positive || changed);
    if (c.correctType === 'physical') identityConflict = preserved && (formed.positive || changed) || formed.negative && changed;
    if (c.id === 7 && reaction.positive && /hicbir\s+kimyasal\s+degisim\s+olma/.test(s)) identityConflict = true;
    if (c.id === 3 && formed.positive && /kimyasal\s+olarak\s+hicbir\s+sey\s+degisme/.test(s)) identityConflict = true;
    var contradiction = selected && classification(c, selected, list), wrong = wrongClaims(c, list);
    var wrongMelting = c.id === 10 && list.some(function (p) { return /erime\w*/.test(p.normalized) && /yeni\s+madde\w*\s+olustur\w*|erime\w*\s+kimyasal/.test(p.normalized) && !negative(p.normalized); });
    var wrongIdentity = c.correctType === 'chemical' ? formed.negative || preserved || product.negative : formed.positive || changed;
    var chemicalDenial = c.correctType === 'chemical' && main.some(function (p) { return /kimyasal\s+olarak\s+hicbir\s+sey\s+degisme/.test(p.normalized); });
    var defendedText = main.map(function (p) { return p.normalized; }).join(' ');
    var core = c.correctType === 'physical' ? formed.negative || preserved : formed.positive && rubric.link.test(defendedText) || changed || product.positive && [1, 2, 9, 12].indexOf(c.id) >= 0 || reaction.positive && rubric.link.test(defendedText);
    var ambiguous = /\b(?:yapi\w*|ozellik\w*|bag\w*)\s+(?:degis\w*|bozul\w*)/.test(s) && !/(?:kimyasal|fiziksel)\s+(?:yapi|ozellik|bag)/.test(s) || c.id === 11 && /seker\w*\s+eridi/.test(s) || c.id === 7 && /beton\w*\s+(?:dondu|kurudu)/.test(s) || c.id === 9 && /su\s+gaz\s+oldu/.test(s) || c.id === 2 && /kagit\w*\s+kayboldu/.test(s) || /hem\s+fiziksel\s+hem\s+kimyasal/.test(s);
    var doubleNegative = list.some(function (p) { return negative(p.normalized) && /dusunmu\w*|sanmi\w*|inanmi\w*/.test(p.normalized) && !/kimyasal\s+degisim\s+oldug/.test(p.normalized); });
    var uncertain = UNCERTAIN.test(s.replace(/geri\s+dondurulebilir/g, 'geri donen')) || /\?/.test(text) || doubleNegative;
    var status = sameFactConflict || identityConflict || contradiction ? 'contradiction' : wrong.length || wrongMelting || chemicalDenial || wrongIdentity && !doubleNegative ? 'incorrect' : uncertain || ambiguous && !core ? 'review' : core ? 'correct' : /degisim|kimyasal|fiziksel|madde|olus|pas|oksit|kuf|eridi|cozun|seker|reng|renk|alev|isik|isi|kabarcik|sertles|topaklan|sogudu|geri\s+don/.test(s) || rubric.link.test(s) ? 'incomplete' : 'irrelevant';
    var evidence = formed.evidence.concat(chemical.evidence, product.evidence, reaction.evidence);
    if (status === 'correct' && main.some(function (p) { var t = p.normalized; return (/\b(?:donus\w*|parcalan\w*|ayris\w*|tepkime\w*|kimlig\w*)/.test(t) || unknownAssertion(p)) && !evidence.some(function (e) { return e.text === p.text; }) && !/koru\w*|ayni|yok\s+olma/.test(t) && !/kimyasal\s+degisim\s+oldug/.test(t); })) status = 'review';
    if (status === 'incomplete' && main.some(unknownAssertion)) status = 'review';
    return { status: status, evidence: evidence, wrong: wrong.map(function (p) { return p.text; }), selectionConflict: !!contradiction };
  }
  function clarification(c, text, field) {
    var s = normalize(text);
    if (field === 'observation') return 'Bu ifadeyi videoda gördüğün hangi somut değişime veya vaka açıklamasındaki hangi bilgiye dayandırıyorsun?';
    if (/\b(?:ozellik\w*|yapi\w*)\s+(?:degis\w*|bozul\w*)/.test(s)) return 'Fiziksel görünüşü veya dokuyu mu, maddenin kimyasal kimliğini mi kastediyorsun?';
    if (/\bbag\w*\s+degis/.test(s)) return 'Molekül içindeki bağları mı, moleküller arasındaki etkileşimleri mi kastediyorsun?';
    if (c.id === 11 && /eridi/.test(s)) return 'Şekerin suda dağılmasını mı, ısı alıp katıdan sıvıya geçmesini mi kastediyorsun?';
    if (c.id === 7 && /dondu|kurudu/.test(s)) return 'Betonun sertleşmesini mi, suyun donmasını veya yalnızca buharlaşmasını mı kastediyorsun?';
    if (c.id === 9 && /su\s+gaz/.test(s)) return '“Gaz oldu” derken yalnızca hâlin değişmesini mi, maddenin kimliğinin değişmesini mi kastediyorsun? Bunu hangi bilgiye dayandırıyorsun?';
    if (c.id === 2 && /kayboldu/.test(s)) return 'Kağıdın görünümünün değişmesini mi, maddenin tamamen yok olmasını mı kastediyorsun?';
    if (c.id === 10 && /hem\s+fiziksel\s+hem\s+kimyasal/.test(s)) return 'Erime ve yanmadan hangisi fiziksel, hangisi kimyasal? Her süreçte madde kimliğini açıkla.';
    if (/dusunmu|sanmi|inanmi/.test(s)) return 'Olgunun gerçekleştiğini mi, gerçekleşmediğini mi savunuyorsun? Görüşünü tek bir açık cümleyle yaz.';
    return window.AnswerRubrics.cases[c.id].question;
  }
  function reconsider(c, text, field) {
    var s = normalize(text);
    if (/yok\s+ol|kaybol|yok\s+et/.test(s)) return 'Görünmez olmak ile var olmamak aynı şey mi? Sistemin görünmeyen kısımlarını da düşünerek iddianı yeniden incele.';
    if (/geri\s+don|tersine|dondurul/.test(s)) return 'Bir olayın geri çevrilebilmesi, maddenin kimliği hakkında tek başına ne söyler? Kararını başka hangi kanıtla sınayabilirsin?';
    if (/her|daima|kesin|butun/.test(s) && /kabarcik|gaz|reng|renk/.test(s)) return 'Tek bir belirti bütün olayların türünü belirlemeye yeter mi? Aynı belirtinin görülebildiği başka bir olayı düşünerek kuralını sınayabilir misin?';
    if (field === 'observation') return 'Videonun başı ve sonunu yeniden karşılaştır. Yazdığın iddiayı destekleyen somut bir değişim gösterebilir misin?';
    return window.AnswerRubrics.cases[c.id].question;
  }
  function completeHint(c, text, field) {
    var s = normalize(text);
    if (field === 'observation') {
      if (UNCERTAIN.test(s) || /\?/.test(text)) return 'Gözlemini henüz kesinleştirmemişsin. Videoyu yeniden inceleyip gerçekten gördüğün değişimi, tahmininden ayırarak yazabilir misin?';
      return 'Gözlemin ayrıntı bekliyor. Neyi inceledin; başlangıç ve son arasında ne fark ettin? Gördüğün somut değişimi bir cümleyle belirt.';
    }
    if (/^bilmiyorum$/.test(s)) return 'Önce başlangıçtaki ve son durumdaki maddeyi karşılaştır. Karar vermek için hangi bilgiye ihtiyacın var?';
    if (/geri\s+don|tersine|dondurul/.test(s)) return 'Geri çevrilebilirliği ölçüt olarak kullanmışsın. Maddenin kimliği hakkında da bir kanıt ekleyebilir misin?';
    if (/reng|renk|gorunum|kivam|sekil|sekli|duman|kabarcik|alev|isik|isi\b/.test(s)) return 'Görünüm veya belirti üzerinden bir açıklama kurmuşsun. Bu gözlem, maddenin kimliği hakkındaki kararını nasıl destekliyor?';
    if (/yeni|farkli|baska/.test(s) && /madde/.test(s)) return 'Bir değerlendirme ölçütü belirtmişsin. Bu olayda hangi gözlem veya bilgi, yazdığın iddiayı destekliyor?';
    if (/eridi|erime|dondu|donma|cozun|sertles/.test(s)) return 'Bir süreç belirtmişsin. Başlangıç ve sonuçtaki maddeyi karşılaştırınca gerekçene hangi bilgiyi ekleyebilirsin?';
    if (/kimyasal|fiziksel/.test(s)) return 'Değişim türünü adlandırmışsın. Bu kararı destekleyen gözlem ile madde hakkındaki çıkarımını nasıl ilişkilendirirsin?';
    return 'Açıklamanın kararını destekleyen kısmı eksik. ' + window.AnswerRubrics.cases[c.id].question;
  }
  function feedback(c, result, field, text) {
    var status = result.status, prompt = field === 'observation' ? 'Olayda gördüğün somut değişimi belirt.' : window.AnswerRubrics.cases[c.id].question;
    if (status === 'correct') return field === 'observation' ? 'Gözlemin olayın somut değişimiyle uyumlu.' : 'Gerekçen olayın madde kimliğiyle ilişkisini açıklıyor.';
    if (status === 'empty') return (field === 'observation' ? 'Gözlem' : 'Gerekçe') + ' alanı boş. ' + prompt;
    if (status === 'irrelevant') return 'Bu metin soruyu yanıtlamıyor. ' + prompt;
    if (status === 'contradiction') return (result.selectionConflict ? 'Seçtiğin tür ile gerekçendeki tür uyuşmuyor. Hangisini savunuyorsun; bu görüşü hangi kanıt destekliyor?' : 'Aynı süreç için birbiriyle uyuşmayan iddialar yazmışsın. İddialarını karşılaştırıp gözleminle destekleyebildiğin görüşü açıkça yazabilir misin?');
    if (status === 'incorrect') return 'İddianı yeniden incelemelisin. ' + reconsider(c, result.wrong && result.wrong.length ? result.wrong.join(' ') : text, field);
    if (status === 'review') return 'Bu ifadede neyi kastettiğin net değil; kesin doğru veya yanlış sayılmadı. ' + clarification(c, text, field);
    return completeHint(c, text, field);
  }
  // Kayıtlı notlar ve puanlar yeniden değerlendirilmez; eski kayıtlar da güncel
  // dönüt politikasıyla gösterilir. Önceki hazır cevaplar ekrana taşınmaz.
  function feedbackMessages(c, ev, observation, type, text) {
    observation = observation || ''; text = text || ''; ev = ev || {};
    var typeStatus = ev.typeStatus || (type !== 'physical' && type !== 'chemical' ? 'empty' : type === c.correctType ? 'correct' : 'incorrect');
    var obsStatus = ev.obsStatus || (!observation.trim() ? 'empty' : ev.hasObs ? 'correct' : 'incomplete');
    var reaStatus = ev.reaStatus || (!text.trim() ? 'empty' : ev.isContradiction ? 'contradiction' : ev.hasRea ? 'correct' : ev.status === 'incorrect' ? 'incorrect' : 'incomplete');
    var obs = { status: obsStatus }, rea = { status: reaStatus };
    if (reaStatus === 'contradiction') rea.selectionConflict = !!classification(c, type, processParts(c, parts(text)));
    if (obsStatus === 'incorrect') obs.wrong = wrongClaims(c, parts(observation)).map(function (p) { return p.text; });
    if (reaStatus === 'incorrect') rea.wrong = wrongClaims(c, processParts(c, parts(text))).map(function (p) { return p.text; });
    var typeMessage = typeStatus === 'correct' ? 'Seçimin bu olayla uyumlu.' : typeStatus === 'empty' ? 'Henüz bir tür seçmedin. Başlangıç ve sonuçtaki maddeyi karşılaştırarak seçimini yap.' : 'Seçimini yeniden düşün. Görünümdeki değişim ile madde kimliğindeki değişimi ayırt etmek için hangi kanıta bakarsın?';
    return { feedbackVersion: '2026.10.10.2', obsMessage: feedback(c, obs, 'observation', observation), reaMessage: feedback(c, rea, 'reasoning', text), typeMessage: typeMessage,
      reviewReasons: [obsStatus === 'review' ? { field: 'observation', question: clarification(c, observation, 'observation') } : null, reaStatus === 'review' ? { field: 'reasoning', question: clarification(c, text, 'reasoning') } : null].filter(Boolean) };
  }
  function evaluateAnswer(c, observation, type, text) {
    var obs = observe(c, observation), rea = reason(c, text, type);
    var typeStatus = type !== 'chemical' && type !== 'physical' ? 'empty' : type === c.correctType ? 'correct' : 'incorrect';
    var review = obs.status === 'review' || rea.status === 'review', bad = [obs.status, rea.status, typeStatus].some(function (v) { return ['incorrect', 'contradiction', 'irrelevant'].indexOf(v) >= 0; });
    var status = review ? 'review' : bad ? 'incorrect' : obs.status === 'correct' && rea.status === 'correct' && typeStatus === 'correct' ? 'correct' : 'incomplete';
    var hints = feedbackMessages(c, { obsStatus: obs.status, reaStatus: rea.status, typeStatus: typeStatus }, observation, type, text);
    return { criteriaVersion: window.AnswerRubrics.version, feedbackVersion: hints.feedbackVersion, status: status, title: status === 'correct' ? 'Yanıtın Tamamlandı' : review ? 'Açıklama Gerekiyor' : bad ? 'Yanıtını Yeniden İncele' : 'Yanıtını Tamamla',
      score: review ? null : (obs.status === 'correct' ? 30 : 0) + (typeStatus === 'correct' ? 30 : 0) + (rea.status === 'correct' ? 40 : 0),
      message: status === 'correct' ? c.feedbacks.correct : hints.obsMessage + ' ' + hints.typeMessage + ' ' + hints.reaMessage,
      obsStatus: obs.status, reaStatus: rea.status, typeStatus: typeStatus, obsMessage: hints.obsMessage, reaMessage: hints.reaMessage, typeMessage: hints.typeMessage,
      hasObs: obs.status === 'correct', hasRea: rea.status === 'correct', isTypeCorrect: typeStatus === 'correct', isContradiction: obs.status === 'contradiction' || rea.status === 'contradiction', isShallowOrTrap: rea.status === 'incomplete', needsReview: review,
      reviewReasons: hints.reviewReasons,
      evidence: { observation: obs.evidence, reasoning: rea.evidence }
    };
  }
  window.evaluateAnswer = evaluateAnswer;
  window.AnswerFeedback = { messages: feedbackMessages };
})();
