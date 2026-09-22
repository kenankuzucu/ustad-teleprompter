/* =========================================================================
   ÜSTAD TELEPROMPTER — motor (v2)
   Kenan Kuzucu için · çevrimdışı çalışır · Türkçe arayüz
   ========================================================================= */
var DEPO = "ustad_teleprompter_v2";

var VARSAYILAN = {
  hiz: 60, boyut: 64, satir: 145, kenar: 7, sayac: 3, tema: "gece", font: "sans",
  vurgu: "#fbbf24", dakika: 3, yerlesim: "tam", opak: 70,
  ayna: false, kilavuz: true, dongu: false, uyanik: true, bip: true, medya: true,
  ezber: false, takip: false, sesliKumanda: false, yesilPerde: false, sesKaydet: true,
  bicim: "", mikrofonDuzeltme: true,
  kalite: "1080", oran: "16:9", fps: 30, filtre: "yok", arka: "yok", arkaRenk: "#0b1220", zoom: 100
};

var TEMALAR = [
  { id:"gece",     ad:"Gece",         nokta:"#0b1220" },
  { id:"komur",    ad:"Kömür",        nokta:"#1f1f26" },
  { id:"kagit",    ad:"Kâğıt",        nokta:"#f6f1e4" },
  { id:"mavi",     ad:"Mavi",         nokta:"#0d2050" },
  { id:"yesil",    ad:"Terminal",     nokta:"#04140c" },
  { id:"kan",      ad:"Kan",          nokta:"#2a0d10" },
  { id:"antrasit", ad:"Antrasit",     nokta:"#22262c" },
  { id:"kobalt",   ad:"Kobalt",       nokta:"#0d2050" },
  { id:"mor",      ad:"Mor",          nokta:"#251540" },
  { id:"orman",    ad:"Orman",        nokta:"#12261b" },
  { id:"altin",    ad:"Altın",        nokta:"#1f1a10" },
  { id:"bordo",    ad:"Bordo",        nokta:"#2e0a17" },
  { id:"neon",     ad:"Neon",         nokta:"#22103a" },
  { id:"sis",      ad:"Sis",          nokta:"#ecf0f4" },
  { id:"turkuaz",  ad:"Turkuaz",      nokta:"#08272b" }
];

var FONTLAR = [
  { id:"sans",     ad:"Üstad Sans",     aile:'"Ustad Sans","Segoe UI",sans-serif' },
  { id:"serif",    ad:"Üstad Serif",    aile:'"Ustad Serif",Georgia,"Times New Roman",serif' },
  { id:"mono",     ad:"Üstad Mono",     aile:'"Ustad Mono",Consolas,monospace' },
  { id:"yuvarlak", ad:"Üstad Yuvarlak", aile:'"Ustad Yuvarlak","Ustad Sans",sans-serif' },
  { id:"sistem",   ad:"Sistem",         aile:'"Segoe UI",system-ui,sans-serif' },
  { id:"makine",   ad:"Makine",         aile:'Consolas,"Courier New",monospace' }
];

var V = {};
var KAYITLAR = [];
var METIN = "";
var OK = { calisiyor: false, konum: 0, toplam: 0, son: 0, duraklatildi: false };
var DUR_NOKTA = [], HIZ_NOKTA = [], SATIRLAR = [];
var KAM = { akis: null, kayit: null, parcalar: [], zamanlayici: null, baslangic: 0, acik: false };
var SES = { tanima: null, aktif: false, sonSes: 0, istiyor: false, kapatilsin: false };
var UYANIK = null, KUMANDA = { taban: "", zamanlayici: null };
var SON_EZBER = 0, IPUCU_ZAMAN = 0;
/* APK (Android WebView) köprüsü: kaydı doğrudan telefonun Filmler klasörüne yazar */
var KOPRU = (typeof window.UstadKaydet === "object" && window.UstadKaydet !== null);

/* ------------------------- yardımcılar ------------------------- */
function $(id){ return document.getElementById(id); }
function esc(s){
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function sayi(n, b, s){ n = parseInt(n, 10); if(isNaN(n)) n = b; if(n < b) n = b; if(n > s) n = s; return n; }
function tekMetin(s){ return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
function kelimeSay(s){ var t = tekMetin(s); return t.length ? t.split(" ").length : 0; }
function sureMetni(sn){
  sn = Math.max(0, Math.round(sn));
  var dk = Math.floor(sn / 60), sn2 = sn % 60;
  return dk > 0 ? (dk + " dk " + sn2 + " sn") : (sn2 + " sn");
}
function saatMetni(sn){
  sn = Math.max(0, Math.round(sn));
  var dk = Math.floor(sn / 60), sn2 = sn % 60;
  return dk + ":" + (sn2 < 10 ? "0" : "") + sn2;
}
function imza(s){
  var t = String(s || ""), h = t.length;
  for(var i = 0; i < t.length; i += 37){ h = (h * 31 + t.charCodeAt(i)) % 99999989; }
  return h;
}
function trKucuk(s){ try{ return String(s).toLocaleLowerCase("tr-TR"); }catch(e){ return String(s).toLowerCase(); } }

/* ------------------------- saklama ------------------------- */
function yaz(){
  try{
    localStorage.setItem(DEPO, JSON.stringify({ v: V, kayitlar: KAYITLAR, metin: METIN }));
  }catch(e){}
}
function oku(){
  var ham = null;
  try{ ham = localStorage.getItem(DEPO); }catch(e){ ham = null; }
  V = JSON.parse(JSON.stringify(VARSAYILAN));
  KAYITLAR = []; METIN = "";
  if(!ham) return;
  try{
    var d = JSON.parse(ham);
    if(d && d.v){ for(var k in V){ if(typeof d.v[k] !== "undefined") V[k] = d.v[k]; } }
    if(d && d.kayitlar && d.kayitlar.length) KAYITLAR = d.kayitlar;
    if(d && typeof d.metin === "string") METIN = d.metin;
  }catch(e){}
  /* tek seferlik düzeltme: mikrofonlu kayıt varsayılan olsun (eski ayarlarda kapalı kalıyordu) */
  if(!V.mikrofonDuzeltme){ V.sesKaydet = true; V.mikrofonDuzeltme = true; yaz(); }
}

/* ------------------------- tema / font ------------------------- */
function temaUygula(){
  document.body.setAttribute("data-tema", V.tema);
  document.documentElement.style.setProperty("--vurgu", V.vurgu);
}
function fontUygula(){
  var f = FONTLAR[0];
  for(var i = 0; i < FONTLAR.length; i++){ if(FONTLAR[i].id === V.font) f = FONTLAR[i]; }
  document.documentElement.style.setProperty("--yf", f.aile);
}
function cizgiY(){ return window.innerHeight * ($("sahne").classList.contains("yerlesimUst") ? 0.26 : 0.38); }

/* ------------------------- metin işleme ------------------------- */
function bicimle(s){
  var t = esc(s);
  t = t.replace(/\[DUR\]/gi, '<span class="isaret dur">DUR</span>');
  t = t.replace(/\[YAVA[SŞ]\]/gi, '<span class="isaret hiz" data-hiz="0.6">YAVAŞ</span>');
  t = t.replace(/\[HIZLI\]/gi, '<span class="isaret hiz" data-hiz="1.5">HIZLI</span>');
  t = t.replace(/\[NORMAL\]/gi, '<span class="isaret hiz" data-hiz="1">NORMAL</span>');
  t = t.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b class="kalin">$1</b>');
  t = t.replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
  return t;
}
function metniIsle(ham){
  var satirlar = String(ham == null ? "" : ham).replace(/\r/g, "").split("\n");
  var cikti = [];
  for(var i = 0; i < satirlar.length; i++){
    if(tekMetin(satirlar[i]) === ""){ cikti.push('<span class="sat"> </span>'); continue; }
    cikti.push('<span class="sat">' + bicimle(satirlar[i]) + '</span>');
  }
  return cikti.join("\n");
}

function metniSahneyeKoy(){
  var p = $("prompt"), k = $("kaydiran");
  p.innerHTML = metniIsle($("metinAlani").value);
  /* işaretleri ve satırları ölç (kaydırıcı koordinatında) */
  var kap = k.getBoundingClientRect();
  DUR_NOKTA = []; HIZ_NOKTA = []; SATIRLAR = [];
  var isaretler = p.querySelectorAll(".isaret");
  for(var i = 0; i < isaretler.length; i++){
    var r = isaretler[i].getBoundingClientRect();
    var y = r.top - kap.top;
    if(isaretler[i].classList.contains("dur")) DUR_NOKTA.push({ y: y, gecti: false, el: isaretler[i] });
    else HIZ_NOKTA.push({ y: y, carpan: parseFloat(isaretler[i].getAttribute("data-hiz")) || 1 });
  }
  HIZ_NOKTA.sort(function(a, b){ return a.y - b.y; });
  var satlar = p.querySelectorAll(".sat");
  for(var j = 0; j < satlar.length; j++){
    var rr = satlar[j].getBoundingClientRect();
    SATIRLAR.push({ el: satlar[j], y: rr.top - kap.top, h: rr.height });
  }
  var alt = p.offsetTop + p.offsetHeight;
  OK.toplam = Math.max(0, alt - window.innerHeight * ($("sahne").classList.contains("yerlesimUst") ? 0.30 : 0.45));
}
function olcum(){ metniSahneyeKoy(); konumUygula(); }

/* ------------------------- okuma motoru ------------------------- */
function konumUygula(){
  OK.konum = Math.max(0, OK.konum);
  $("kaydiran").style.transform = "translate3d(0," + (-OK.konum) + "px,0)";
  var o = OK.toplam > 0 ? sayi((OK.konum / OK.toplam) * 100, 0, 100) : 0;
  $("ilerleme").style.width = o.toFixed(1) + "%";
  $("dYer").textContent = "%" + Math.round(o);
  durumYaz();
  if(V.ezber) ezberGuncelle();
}
function durumYaz(){
  var carpan = hizCarpani();
  var etkin = Math.max(1, V.hiz * carpan);
  var gecen = OK.konum / etkin, kalanSn = Math.max(0, (OK.toplam - OK.konum) / etkin);
  $("dSure").textContent = "⏱ " + saatMetni(gecen) + " / " + saatMetni(gecen + kalanSn);
  $("dKalan").textContent = "kalan " + saatMetni(kalanSn);
  $("dHiz").textContent = Math.round(V.hiz * carpan) + " px/sn" + (carpan !== 1 ? " (" + (carpan < 1 ? "yavaş" : "hızlı") + ")" : "");
  $("etHizSahne").textContent = Math.round(V.hiz * carpan) + " px/sn";
}
function hizCarpani(){
  var imlec = OK.konum + cizgiY(), c = 1;
  for(var i = 0; i < HIZ_NOKTA.length; i++){ if(HIZ_NOKTA[i].y <= imlec) c = HIZ_NOKTA[i].carpan; }
  return c;
}
function durKontrol(){
  var imlec = OK.konum + cizgiY();
  for(var i = 0; i < DUR_NOKTA.length; i++){
    var d = DUR_NOKTA[i];
    if(!d.gecti && imlec >= d.y){
      d.gecti = true;
      return true;
    }
  }
  return false;
}
function tik(zaman){
  if(!OK.calisiyor) return;
  var dt = (zaman - OK.son) / 1000;
  OK.son = zaman;
  if(dt > 0.25) dt = 0.25;
  if(V.takip && SES.aktif && (performance.now() - SES.sonSes > 900)){
    durumYaz();
    requestAnimationFrame(tik);
    return;
  }
  OK.konum += V.hiz * hizCarpani() * dt;
  if(durKontrol()){
    konumUygula();
    durdur();
    ipucuGoster("⏸ DUR noktası — devam etmek için dokun ya da boşluğa bas");
    return;
  }
  if(OK.konum >= OK.toplam){
    if(V.dongu){
      OK.konum = 0;
      durNoktalariSifirla();
    }else{
      OK.konum = OK.toplam;
      konumUygula();
      durdur();
      if(V.bip){ bip(880, 0.18); setTimeout(function(){ bip(1180, 0.3); }, 220); }
      ipucuGoster("✅ Metin bitti — baştan okumak için ⏮ düğmesine bas");
      return;
    }
  }
  konumUygula();
  requestAnimationFrame(tik);
}
function baslaKaydirma(){
  if(OK.konum >= OK.toplam && OK.toplam > 0){ OK.konum = 0; durNoktalariSifirla(); }
  OK.calisiyor = true;
  OK.son = performance.now();
  $("dOynat").textContent = "⏸";
  requestAnimationFrame(tik);
}
function durdur(){ OK.calisiyor = false; $("dOynat").textContent = "▶"; }
function durNoktalariSifirla(){ for(var i = 0; i < DUR_NOKTA.length; i++) DUR_NOKTA[i].gecti = false; }
function basaDon(){ OK.konum = 0; durNoktalariSifirla(); konumUygula(); }
function ipucuGoster(m){
  var k = $("ipucu");
  k.textContent = m;
  k.classList.add("acik");
  IPUCU_ZAMAN = performance.now();
  setTimeout(function(){ if(performance.now() - IPUCU_ZAMAN >= 3000) k.classList.remove("acik"); }, 3200);
}

function basla(){
  if(!tekMetin($("metinAlani").value)){ alert("Önce konuşma metnini yaz ya da yapıştır."); return; }
  if(!$("sahne").classList.contains("acik")){
    $("sahne").classList.add("acik");
    if(document.documentElement.requestFullscreen){ try{ document.documentElement.requestFullscreen(); }catch(e){} }
    uyanikKilitle();
    medyaSessionKur();
    if(V.sesliKumanda || V.takip) tanimaBaslat();
  }
  olcum();
  if(V.sayac > 0 && OK.konum === 0) geriSayim(baslaKaydirma);
  else baslaKaydirma();
}
function geriSayim(bitince){
  var kat = $("sayacKat"), n = V.sayac;
  kat.classList.add("acik");
  kat.textContent = n;
  if(V.bip) bip(700, 0.12, 0.2);
  var t = setInterval(function(){
    n--;
    if(n <= 0){
      clearInterval(t);
      kat.classList.remove("acik");
      if(V.bip) bip(1050, 0.4, 0.28);
      bitince();
    }else{
      kat.textContent = n;
      if(V.bip) bip(700, 0.12, 0.2);
    }
  }, 1000);
}
function sahneKapat(){
  durdur();
  $("sahne").classList.remove("acik");
  uyanikBirak();
  tanimaDurdur();
  if(document.fullscreenElement && document.exitFullscreen){ try{ document.exitFullscreen(); }catch(e){} }
}

/* ------------------------- ezber modu ------------------------- */
function ezberGuncelle(){
  var simdi = performance.now();
  if(simdi - SON_EZBER < 140) return;
  SON_EZBER = simdi;
  if(!SATIRLAR.length) return;
  var c = cizgiY(), yukari = -(SATIRLAR[0] ? SATIRLAR[0].h * 1.4 : 90), asagi = c + 150;
  for(var i = 0; i < SATIRLAR.length; i++){
    var s = SATIRLAR[i];
    var ekran = s.y - OK.konum;
    var net = (ekran + s.h >= c - 120) && (ekran <= asagi);
    if(net) s.el.classList.add("net"); else s.el.classList.remove("net");
  }
}

/* ------------------------- ekran uyanık kalsın ------------------------- */
function uyanikKilitle(){
  if(!V.uyanik || !navigator.wakeLock) return;
  try{
    navigator.wakeLock.request("screen").then(function(k){ UYANIK = k; }).catch(function(){});
  }catch(e){}
}
function uyanikBirak(){
  if(UYANIK){ try{ UYANIK.release(); }catch(e){} UYANIK = null; }
}

/* ------------------------- filtreler ve çerçeve (TikTok modu) ------------------------- */
var FILTRELER = {
  yok:        { ad: "Yok",          css: "" },
  canli:      { ad: "Canlı",        css: "saturate(1.35) contrast(1.08)" },
  sicak:      { ad: "Sıcak",        css: "sepia(.22) saturate(1.25) hue-rotate(-8deg)" },
  soguk:      { ad: "Soğuk",        css: "saturate(1.1) hue-rotate(12deg) brightness(1.03)" },
  siyahbeyaz: { ad: "Siyah-beyaz",  css: "grayscale(1) contrast(1.1)" },
  vintage:    { ad: "Vintage",      css: "sepia(.45) contrast(1.05) brightness(1.02)" },
  yumusak:    { ad: "Yumuşak cilt", css: "blur(1.1px) brightness(1.06) saturate(1.05)" },
  keskin:     { ad: "Keskin",       css: "contrast(1.18) saturate(1.12)" },
  sinema:     { ad: "Sinematik",    css: "contrast(1.2) saturate(.92) brightness(.97)" },
  neon:       { ad: "Neon",         css: "saturate(1.8) contrast(1.15) hue-rotate(10deg)" }
};
function filtreCss(){ return (FILTRELER[V.filtre] || FILTRELER.yok).css || "none"; }
function kaliteSay(){ var k = parseInt(V.kalite, 10); return (k === 720 || k === 2160) ? k : 1080; }
/* seçilen oran + kalite -> kayıt ölçüsü (kısa kenar = kalite) */
function hedefOlcu(){
  var k = kaliteSay();
  if(V.oran === "9:16") return [k, Math.round(k * 16 / 9)];
  if(V.oran === "1:1")  return [k, k];
  if(V.oran === "4:5")  return [k, Math.round(k * 5 / 4)];
  return [Math.round(k * 16 / 9), k];
}
/* kroma (yeşil perde) işlemesi ağır olduğu için çalışma ölçüsü sınırlanır */
function islemeOlcu(){
  var h = hedefOlcu();
  var sinir = 1280;
  var buyuk = Math.max(h[0], h[1]);
  if(buyuk <= sinir) return h;
  var oran = sinir / buyuk;
  return [Math.max(2, Math.round(h[0] * oran)), Math.max(2, Math.round(h[1] * oran))];
}
function kanvasGerekli(){
  return V.filtre !== "yok" || V.arka !== "yok" || (parseInt(V.zoom, 10) || 100) > 100 ||
         V.oran !== "16:9" || (parseInt(V.fps, 10) || 30) !== 30;
}
function efektVarMi(){ return V.filtre !== "yok" || V.arka !== "yok" || (parseInt(V.zoom, 10) || 100) > 100; }

/* yeşil perdeyi sil: yeşil baskın piksellerin saydamlığını sıfırlar */
function kromaSil(veri){
  var d = veri.data, silinen = 0;
  for(var i = 0; i < d.length; i += 4){
    var r = d[i], g = d[i + 1], b = d[i + 2];
    if(g > 70 && g > r * 1.3 && g > b * 1.3){
      var baskinlik = Math.min(1, (g - Math.max(r, b)) / 60);
      d[i + 3] = Math.round(255 * (1 - baskinlik));
      if(d[i + 3] < 24) silinen++;
    }
  }
  return silinen;
}

/* ------------------------- kayıt biçimleri (codec) ------------------------- */
/* Sıra önemli: ilk desteklenen varsayılan olur. MP4/H.264 en geniş uyumluluk. */
var KAYIT_BICIMLERI = [
  { etiket: "MP4 — H.264 + AAC (her yerde açılır)", mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    uzanti: "mp4", sesGerekli: true },
  { etiket: "MP4 — H.264 + AAC (kamera sırası)", mime: "video/mp4;codecs=avc1,mp4a",
    uzanti: "mp4", sesGerekli: true },
  { etiket: "WebM — VP9 + Opus (küçük dosya)", mime: "video/webm;codecs=vp9,opus", uzanti: "webm", sesGerekli: true },
  { etiket: "WebM — VP8 + Opus (uyumlu)", mime: "video/webm;codecs=vp8,opus", uzanti: "webm", sesGerekli: true },
  { etiket: "WebM — görüntü (ses yok)", mime: "video/webm", uzanti: "webm", sesGerekli: false },
  { etiket: "Yalnız ses — Opus (mikrofon)", mime: "audio/webm;codecs=opus", uzanti: "webm", sesGerekli: true, yalnizSes: true },
  { etiket: "Yalnız ses — MP4/AAC (mikrofon)", mime: "audio/mp4", uzanti: "m4a", sesGerekli: true, yalnizSes: true }
];
function bicimDestek(b){
  if(typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return false;
  try{ return MediaRecorder.isTypeSupported(b.mime); }catch(e){ return false; }
}
function secilenBicim(){
  var i;
  for(i = 0; i < KAYIT_BICIMLERI.length; i++){
    if(KAYIT_BICIMLERI[i].mime === V.bicim && bicimDestek(KAYIT_BICIMLERI[i])) return KAYIT_BICIMLERI[i];
  }
  for(i = 0; i < KAYIT_BICIMLERI.length; i++){
    if(bicimDestek(KAYIT_BICIMLERI[i])) return KAYIT_BICIMLERI[i];
  }
  return KAYIT_BICIMLERI[KAYIT_BICIMLERI.length - 2];   /* hiçbiri desteklenmezse WebM */
}
function bicimMenusuKur(){
  var sec = $("secBicim");
  if(!sec) return;
  var ilk = null;
  sec.innerHTML = "";
  KAYIT_BICIMLERI.forEach(function(b){
    var d = bicimDestek(b);
    if(d && !ilk) ilk = b.mime;
    var o = document.createElement("option");
    o.value = b.mime;
    o.textContent = b.etiket + (d ? "" : " — bu tarayıcıda yok");
    o.disabled = !d;
    sec.appendChild(o);
  });
  sec.value = (V.bicim && bicimDestek({ mime: V.bicim })) ? V.bicim : ilk;
  V.bicim = sec.value;
}

/* ------------------------- ses (bip) ------------------------- */
var SES_CTX = null;
function bip(frekans, sure, ses){
  if(!V.bip) return;
  try{
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    SES_CTX = SES_CTX || new AC();
    if(SES_CTX.state === "suspended"){ try{ SES_CTX.resume(); }catch(e){} }
    var o = SES_CTX.createOscillator(), g = SES_CTX.createGain();
    o.type = "sine";
    o.frequency.value = frekans;
    o.connect(g); g.connect(SES_CTX.destination);
    var t = SES_CTX.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ses || 0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    o.start(t); o.stop(t + sure + 0.03);
  }catch(e){}
}

/* ------------------------- sesli kumanda / takip ------------------------- */
function tanimaBaslat(){
  var T = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!T){ ipucuGoster("Bu tarayıcı sesli kumandayı desteklemiyor"); return false; }
  if(SES.aktif) return true;
  SES.istiyor = true;
  try{
    var r = new T();
    r.lang = "tr-TR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = function(e){
      SES.sonSes = performance.now();
      var metin = "";
      for(var i = e.resultIndex; i < e.results.length; i++){ metin += e.results[i][0].transcript; }
      if(V.sesliKumanda) komutCoz(metin, false);
    };
    r.onerror = function(){ SES.aktif = false; };
    r.onend = function(){
      SES.aktif = false;
      if(SES.istiyor && !SES.kapatilsin){
        try{ r.start(); SES.aktif = true; }catch(e){}
      }
    };
    r.start();
    SES.tanima = r;
    SES.aktif = true;
    SES.kapatilsin = false;
    $("sesliRozet").classList.remove("gizli");
    return true;
  }catch(e){ return false; }
}
function tanimaDurdur(){
  SES.kapatilsin = true; SES.istiyor = false;
  try{ if(SES.tanima) SES.tanima.stop(); }catch(e){}
  SES.aktif = false;
  $("sesliRozet").classList.add("gizli");
}
function komutCoz(metin, sunucudan){
  var m = trKucuk(metin);
  if(/hızlan|hızlandır|hizlan|çabuk/.test(m)){ hizDegistir(15); return true; }
  if(/yavaşla|yavasla|yavaş/.test(m)){ hizDegistir(-15); return true; }
  if(/duraklat|bekle|kes|durdur|\bdur\b/.test(m)){ durdur(); ipucuGoster("⏸ durduruldu (" + (sunucudan ? "telefon" : "ses") + ")"); return true; }
  if(/devam|başlat|baslat|oynat|oku/.test(m)){ baslaKaydirma(); ipucuGoster("▶ devam (" + (sunucudan ? "telefon" : "ses") + ")"); return true; }
  if(/başa|basa|baştan|bastan|en baş/.test(m)){ basaDon(); return true; }
  if(/büyüt|buyut/.test(m)){ boyutDegistir(8); return true; }
  if(/küçült|kucult/.test(m)){ boyutDegistir(-8); return true; }
  if(/ayna/.test(m)){ aynaDegistir(); return true; }
  if(/kapat|çık|bitir/.test(m)){ sahneKapat(); return true; }
  return false;
}

/* ------------------------- kumanda (medya tuşları) ------------------------- */
function medyaSessionKur(){
  if(!V.medya || !navigator.mediaSession) return;
  try{
    navigator.mediaSession.setActionHandler("play", function(){ baslaKaydirma(); });
    navigator.mediaSession.setActionHandler("pause", function(){ durdur(); });
    navigator.mediaSession.setActionHandler("stop", function(){ durdur(); });
    navigator.mediaSession.setActionHandler("nexttrack", function(){ hizDegistir(15); });
    navigator.mediaSession.setActionHandler("previoustrack", function(){ hizDegistir(-15); });
  }catch(e){}
}

/* ------------------------- kamera ve kayıt ------------------------- */
function kameraAc(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    alert("Bu tarayıcı kamera erişimini desteklemiyor.");
    return;
  }
  var hedef = hedefOlcu();
  navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: hedef[0] }, height: { ideal: hedef[1] }, facingMode: "user" },
    audio: !!V.sesKaydet
  }).then(function(akis){
    /* görüntüyü ekrana bağlama; burada bir hata olursa kamera izninden ayrı bildirilsin */
    try{
      KAM.akis = akis;
      KAM.acik = true;
      var ak = $("kameraAkis"), sk = $("sahneKamera"), kk = $("kameraKutu"), s = $("sahne");
      if(ak) ak.srcObject = akis;
      if(sk) sk.srcObject = akis;
      if(kk) kk.classList.add("acik");
      if(s) s.classList.add("kameraAcik");
      efektOnizleme();
      var vv = $("kameraAkis");
      if(vv && !vv.__olcuKanca){
        vv.__olcuKanca = true;
        vv.addEventListener("loadedmetadata", function(){ kameraOlcuYaz(); });
        vv.addEventListener("resize", function(){ kameraOlcuYaz(); });
      }
    }catch(e){
      alert("Kamera açıldı ama görüntü pencereye bağlanamadı: " + (e && e.message ? e.message : e));
    }
  }).catch(function(e){
    var ad = (e && e.name) ? e.name : "";
    var m = (e && e.message) ? e.message : "izin verilmedi";
    if(ad === "NotAllowedError" || ad === "SecurityError"){
      m = "Kamera izni verilmedi. Adres çubuğundaki kamera simgesine basıp “İzin ver” seçin.";
    }else if(ad === "NotFoundError" || ad === "DevicesNotFoundError"){
      m = "Bu cihazda kamera bulunamadı.";
    }else if(ad === "NotReadableError" || ad === "TrackStartError"){
      m = "Kamera başka bir programda kullanılıyor olabilir; o programı kapatıp tekrar deneyin.";
    }
    alert("Kamera açılamadı: " + m);
  });
}
function kameraKapat(){
  if(KAM.akis){ try{ KAM.akis.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} }
  KAM.akis = null; KAM.acik = false;
  var ak = $("kameraAkis"), sk = $("sahneKamera"), kk = $("kameraKutu"), s = $("sahne");
  if(ak) ak.srcObject = null;
  if(sk) sk.srcObject = null;
  if(kk) kk.classList.remove("acik");
  if(s) s.classList.remove("kameraAcik");
}
/* kalite/oran değişince kamera yeni ölçüyle yeniden açılır */
function kaliteDegisti(){
  ayarlariCiz();
  efektOnizleme();
  if(KAM.acik){ ipucuGoster("🎞️ Kamera yeni ölçüyle açılıyor…"); kameraKapat(); kameraAc(); }
  yaz();
}
function kameraOlcuYaz(){
  var not = $("kaliteNot"), v = $("kameraAkis");
  if(!not) return;
  if(!KAM.acik){ not.textContent = "Kamera kapalı — “Kamerayı aç” dediğinde gerçek çözünürlük burada yazılır."; return; }
  var w = v ? v.videoWidth : 0, h = v ? v.videoHeight : 0;
  var hedef = hedefOlcu();
  var uyar = (kaliteSay() === 2160 && h && h < 1400) ? " ⚠️ Bu kamera 4K vermiyor; cihazın en yükseği kullanılıyor." : "";
  not.textContent = "Kamera: " + (w ? (w + "×" + h) : "…") + "  ·  hedef: " + hedef[0] + "×" + hedef[1] +
    "  ·  " + (parseInt(V.fps, 10) || 30) + " fps  ·  kayıt: " +
    (kanvasGerekli() ? "kanvas hattı (filtre/oran/zoom)" : "doğrudan kamera (en yüksek kalite)") +
    (V.arka !== "yok" ? "  ·  kroma işleme: " + islemeOlcu().join("×") : "") +
    (V.filtre !== "yok" ? "  ·  filtre: " + (FILTRELER[V.filtre] || FILTRELER.yok).ad : "") + uyar;
}
/* önizlemeye filtre/zoom/oran uygula; yeşil perde silme canlı önizleme tuvalinde gösterilir */
function efektOnizleme(){
  var z = (parseInt(V.zoom, 10) || 100) / 100;
  ["kameraAkis", "sahneKamera"].forEach(function(id){
    var v = $(id);
    if(!v) return;
    v.style.filter = (V.filtre === "yok") ? "" : filtreCss();
    v.style.transform = z > 1 ? ("scale(" + z + ")") : "";
    v.style.transformOrigin = "center";
  });
  var kk = $("kameraKutu");
  if(kk){
    kk.classList.remove("oran-16-9", "oran-9-16", "oran-1-1", "oran-4-5");
    kk.classList.add("oran-" + V.oran.replace(":", "-"));
    kk.style.background = (V.arka === "yok") ? "" : (V.arka === "yesil" ? "#00b140" : V.arkaRenk);
  }
  onizlemeDongusu();
  kameraOlcuYaz();
}
/* kroma açıkken kamerayı canlı tuvalde göster (yeşil silinmiş hâliyle) */
function onizlemeDongusu(){
  var tuval = $("kameraOnizleme");
  if(!tuval) return;
  if(V.arka === "yok" || !KAM.acik){
    if(KAM.onizlemeZaman){ clearInterval(KAM.onizlemeZaman); KAM.onizlemeZaman = null; }
    tuval.classList.add("gizli");
    var v0 = $("kameraAkis"); if(v0) v0.style.visibility = "";
    return;
  }
  var hedef = islemeOlcu();
  tuval.width = hedef[0]; tuval.height = hedef[1];
  tuval.classList.remove("gizli");
  var v = $("kameraAkis"); if(v) v.style.visibility = "hidden";
  var ctx = tuval.getContext("2d", { willReadFrequently: true });
  var renk = V.arka === "yesil" ? "#00b140" : V.arkaRenk;
  if(KAM.onizlemeZaman) clearInterval(KAM.onizlemeZaman);
  KAM.onizlemeZaman = setInterval(function(){
    if(!KAM.acik || V.arka === "yok" || !v.videoWidth) return;
    var hedefOran = tuval.width / tuval.height, kaynakOran = v.videoWidth / v.videoHeight;
    var sw, sh, sx, sy;
    if(kaynakOran > hedefOran){ sh = v.videoHeight; sw = v.videoHeight * hedefOran; sx = (v.videoWidth - sw) / 2; sy = 0; }
    else { sw = v.videoWidth; sh = v.videoWidth / hedefOran; sx = 0; sy = (v.videoHeight - sh) / 2; }
    var z = (parseInt(V.zoom, 10) || 100) / 100;
    var cw = sw / z, ch = sh / z;
    sx += (sw - cw) / 2; sy += (sh - ch) / 2;
    ctx.filter = filtreCss();
    ctx.clearRect(0, 0, tuval.width, tuval.height);
    ctx.drawImage(v, sx, sy, cw, ch, 0, 0, tuval.width, tuval.height);
    ctx.filter = "none";
    try{
      var veri = ctx.getImageData(0, 0, tuval.width, tuval.height);
      kromaSil(veri);
      ctx.putImageData(veri, 0, 0);
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = renk; ctx.fillRect(0, 0, tuval.width, tuval.height);
      ctx.globalCompositeOperation = "source-over";
    }catch(e){}
  }, 66);
}
/* kayıt için kanvas akışı: filtre + oran + zoom + kroma */
function kanvasAksiniKur(){
  var kroma = V.arka !== "yok";
  var olcu = kroma ? islemeOlcu() : hedefOlcu();
  var K = document.createElement("canvas");
  K.width = olcu[0]; K.height = olcu[1];
  var ctx = K.getContext("2d", { willReadFrequently: kroma });
  var ara = null, ctxAra = null;
  if(kroma){
    ara = document.createElement("canvas"); ara.width = olcu[0]; ara.height = olcu[1];
    ctxAra = ara.getContext("2d", { willReadFrequently: true });
  }
  var v = $("kameraAkis");
  var fps = parseInt(V.fps, 10) || 30;
  var z = (parseInt(V.zoom, 10) || 100) / 100;
  var renk = V.arka === "yesil" ? "#00b140" : V.arkaRenk;
  function cerceve(){
    if(!v || !v.videoWidth) return;
    var hedefOran = K.width / K.height, kaynakOran = v.videoWidth / v.videoHeight;
    var sw, sh, sx, sy;
    if(kaynakOran > hedefOran){ sh = v.videoHeight; sw = v.videoHeight * hedefOran; sx = (v.videoWidth - sw) / 2; sy = 0; }
    else { sw = v.videoWidth; sh = v.videoWidth / hedefOran; sx = 0; sy = (v.videoHeight - sh) / 2; }
    var cw = sw / z, ch = sh / z;
    sx += (sw - cw) / 2; sy += (sh - ch) / 2;
    if(!kroma){
      ctx.filter = filtreCss();
      ctx.drawImage(v, sx, sy, cw, ch, 0, 0, K.width, K.height);
      ctx.filter = "none";
      return;
    }
    ctxAra.filter = filtreCss();
    ctxAra.clearRect(0, 0, ara.width, ara.height);
    ctxAra.drawImage(v, sx, sy, cw, ch, 0, 0, ara.width, ara.height);
    ctxAra.filter = "none";
    var veri = ctxAra.getImageData(0, 0, ara.width, ara.height);
    KAM.silinenPiksel = kromaSil(veri);
    ctxAra.putImageData(veri, 0, 0);
    ctx.fillStyle = renk;
    ctx.fillRect(0, 0, K.width, K.height);
    ctx.drawImage(ara, 0, 0);
  }
  cerceve();
  var zaman = setInterval(cerceve, Math.max(16, Math.round(1000 / fps)));
  var akis = K.captureStream(fps);
  KAM.akis.getAudioTracks().forEach(function(t){ akis.addTrack(t); });
  KAM.kanvas = { tuval: K, zaman: zaman, olcu: olcu, kroma: kroma };
  return akis;
}

function kayitBasla(){
  if(!KAM.akis){ alert("Önce kamerayı aç."); return; }
  if(typeof MediaRecorder === "undefined"){ alert("Bu tarayıcı kayıt yapamıyor."); return; }
  var bicim = secilenBicim();
  var sesVar = !!(KAM.akis.getAudioTracks && KAM.akis.getAudioTracks().length);
  if(bicim.sesGerekli && !sesVar && bicim.yalnizSes){
    alert("Bu biçim mikrofon ister. “🎙 Kayıtta mikrofonu da al” kutusunu işaretle ve kamerayı yeniden aç.");
    return;
  }
  if(bicim.sesGerekli && !sesVar){
    ipucuGoster("ℹ️ Mikrofon kapalı — kayıt sessiz olacak (mikrofon için kutuyu işaretleyip kamerayı yeniden aç)");
  }
  KAM.bicim = bicim;
  var akis = KAM.akis;
  if(bicim.yalnizSes){
    akis = new MediaStream(KAM.akis.getAudioTracks());
  }else if(kanvasGerekli() && HTMLCanvasElement.prototype.captureStream){
    akis = kanvasAksiniKur();
    gunluk("kanvas hatti kuruldu: " + (KAM.kanvas ? KAM.kanvas.olcu.join("x") : "?") +
           " | filtre=" + V.filtre + " | oran=" + V.oran + " | zoom=" + V.zoom + " | arka=" + V.arka);
  }
  KAM.parcalar = [];
  try{
    KAM.kayit = new MediaRecorder(akis, { mimeType: bicim.mime });
  }catch(e){
    try{ KAM.kayit = new MediaRecorder(akis); }
    catch(e2){ alert("Kayıt başlatılamadı: " + e2.message); return; }
  }
  KAM.kayit.ondataavailable = function(e){ if(e.data && e.data.size) KAM.parcalar.push(e.data); };
  KAM.kayit.onstop = function(){
    var bic = KAM.bicim || secilenBicim();
    var blob = new Blob(KAM.parcalar, { type: bic.mime.split(";")[0] });
    KAM.sonBlob = blob;
    var url = URL.createObjectURL(blob);
    var a = $("indirLink");
    a.href = url; a.download = kayitAdi();
    a.classList.remove("gizli");
    a.textContent = "⬇ Kaydı indir (" + (blob.size / 1048576).toFixed(1) + " MB)";
    /* klasörü ve ismi kendin seçmek istersen (bilgisayar) / telefona kaydet (APK) */
    var fk = $("farkliKaydet");
    fk.textContent = KOPRU ? "📥 Telefona kaydet (Filmler klasörü)"
      : (iosPaylasimVar() ? "📤 Kaydet / Paylaş (Videolar·Dosyalar)" : "📁 Farklı kaydet (klasör ve isim seç)");
    fk.classList.remove("gizli");
  };
  KAM.kayit.start(1000);
  KAM.baslangic = performance.now();
  $("kayitRozet").classList.remove("gizli");
  KAM.zamanlayici = setInterval(function(){
    var s = Math.floor((performance.now() - KAM.baslangic) / 1000);
    $("kayitSure").textContent = saatMetni(s);
  }, 500);
}
function kayitDurdur(){
  if(KAM.kayit && KAM.kayit.state !== "inactive"){ try{ KAM.kayit.stop(); }catch(e){} }
  KAM.kayit = null;
  if(KAM.kanvas && KAM.kanvas.zaman){ clearInterval(KAM.kanvas.zaman); KAM.kanvas = null; }
  if(KAM.zamanlayici){ clearInterval(KAM.zamanlayici); KAM.zamanlayici = null; }
  $("kayitRozet").classList.add("gizli");
}
function kayitAdi(){
  var bic = KAM.bicim || secilenBicim();
  var ek = bic && bic.uzanti ? bic.uzanti : "webm";
  return new Date().toLocaleString("tr-TR").replace(/[.: ]/g, "-") + "-ustad-cekim." + ek;
}
/* iPhone/iPad: kaydı paylaş menüsüyle Videolar'a veya Dosyalar'a kaydet */
function iosPaylasimVar(){
  return !!(navigator.canShare && window.File && /iPhone|iPad|iPod/.test(navigator.userAgent));
}
function iosPaylas(blob, ad){
  try{
    var dosya = new File([blob], ad, { type: (blob && blob.type) || "video/mp4" });
    if(!navigator.canShare({ files: [dosya] })) return false;
    navigator.share({ files: [dosya], title: "ÜSTAD TELEPROMPTER kaydı" })
      .then(function(){ ipucuGoster("✅ Kayıt paylaşıldı / kaydedildi"); })
      .catch(function(e){ if(!e || e.name !== "AbortError") indirYedek(blob); });
    return true;
  }catch(e){ return false; }
}
/* klasörü ve dosya adını kendin seç: Windows'un kaydetme penceresi açılır */
function kaydiFarkliKaydet(){
  var blob = KAM.sonBlob;
  if(!blob){ alert("Önce bir kayıt yap (⏺ Kaydı başlat → ⏹ Kaydı bitir)."); return; }
  if(KOPRU){ kaydiTelefonaKaydet(blob); return; }
  if(iosPaylasimVar() && iosPaylas(blob, kayitAdi())) return;      /* iPhone: paylaş menüsü */
  if(typeof window.showSaveFilePicker !== "function"){
    indirYedek(blob);
    alert("Bu tarayıcı klasör seçme penceresini desteklemiyor; kayıt İndirilenler klasörüne indirildi.\n\n" +
          "Klasörü her seferinde seçmek istersen Chrome'da: Ayarlar → İndirilenler → " +
          "“Dosyaları indirmeden önce nereye kaydedeceğini sor” seçeneğini aç.");
    return;
  }
  window.showSaveFilePicker({
    suggestedName: kayitAdi(),
    types: [{ description: "Video dosyası", accept: { "video/webm": [".webm"], "video/mp4": [".mp4"] } }]
  }).then(function(tut){
    return tut.createWritable().then(function(y){
      return y.write(blob).then(function(){ return y.close(); });
    });
  }).then(function(){
    ipucuGoster("✅ Kayıt seçtiğin klasöre yazıldı");
    alert("Kayıt tamam: seçtiğin klasöre yazıldı.");
  }).catch(function(e){
    if(e && e.name === "AbortError") return;      /* kullanıcı vazgeçti */
    indirYedek(blob);
    alert("Seçtiğin yere yazılamadı (" + (e && e.message ? e.message : e) + "); kayıt İndirilenler klasörüne indirildi.");
  });
}
function indirYedek(blob){
  blob = blob || KAM.sonBlob;
  if(!blob) return;
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = kayitAdi();
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
/* ------- APK: kaydı doğrudan telefonun Filmler/USTAD TELEPROMPTER klasörüne yaz -------
   Android WebView blob: indirmesini desteklemediği için kayıt, 512 KB'lık base64
   dilimler hâlinde Java köprüsüne (window.UstadKaydet) aktarılır. */
function gunluk(m){ try{ if(KOPRU && window.UstadKaydet.gunluk) window.UstadKaydet.gunluk(String(m)); }catch(e){} }
function kaydiTelefonaKaydet(blob){
  blob = blob || KAM.sonBlob;
  if(!blob) return;
  if(!KOPRU){ alert("Bu cihazda telefona kaydetme köprüsü yok; kayıt indirilecek."); indirYedek(blob); return; }
  var PARCA = 524286;            /* 3'ün katı: her dilim tek başına çözülebilsin */
  var bas = 0, ad = kayitAdi();
  gunluk("kayit aktarimi basliyor: " + ad + " | tur=" + ((blob && blob.type) || "?") +
         " | " + blob.size + " bayt | " + PARCA + " baytlik dilimler");
  var blobTuru = (blob && blob.type) ? blob.type : "video/mp4";
  try{ window.UstadKaydet.basla(ad, blobTuru); }
  catch(e){
    gunluk("basla HATASI: " + e.message);
    alert("Telefona kaydetme başlatılamadı: " + e.message);
    indirYedek(blob);
    return;
  }
  ipucuGoster("📥 Telefona aktarılıyor… %0");
  (function sonraki(){
    if(bas >= blob.size){
      gunluk("aktarim bitti, bitir cagriliyor");
      window.UstadKaydet.bitir();
      ipucuGoster("✅ Kayıt telefona kaydedildi: Filmler/USTAD TELEPROMPTER");
      alert("Kayıt telefona kaydedildi.\n\nYer: Filmler/USTAD TELEPROMPTER/" + ad +
            "\n\nGaleri > Filmler klasöründen açabilirsin.");
      return;
    }
    var dilim = blob.slice(bas, Math.min(bas + PARCA, blob.size));
    var okuyucu = new FileReader();
    okuyucu.onload = function(){
      try{
        var s = String(okuyucu.result), v = s.indexOf(",");
        window.UstadKaydet.parca(s.slice(v + 1));
      }catch(e){
        gunluk("parca HATASI: " + e.message);
        alert("Aktarım sırasında hata oldu: " + e.message);
        return;
      }
      bas += PARCA;
      ipucuGoster("📥 Telefona aktarılıyor… %" + Math.min(100, Math.round(bas / blob.size * 100)));
      sonraki();
    };
    okuyucu.onerror = function(){ alert("Kayıt dosyası okunamadı."); };
    okuyucu.readAsDataURL(dilim);
  })();
}

/* ------------------------- ayar değiştiriciler ------------------------- */
function hizDegistir(delta){
  V.hiz = sayi(V.hiz + delta, 10, 260);
  $("gHiz").value = V.hiz; $("etHiz").textContent = V.hiz;
  durumYaz(); yaz();
}
function boyutDegistir(delta){
  V.boyut = sayi(V.boyut + delta, 24, 160);
  $("gBoyut").value = V.boyut; $("etBoyut").textContent = V.boyut;
  sahneAyarlariUygula(); olcum(); yaz();
}
function aynaDegistir(){
  V.ayna = !V.ayna;
  $("kAyna").checked = V.ayna;
  sahneAyarlariUygula(); yaz();
}
function temaDegistir(){
  var i = 0;
  for(var j = 0; j < TEMALAR.length; j++){ if(TEMALAR[j].id === V.tema) i = j; }
  V.tema = TEMALAR[(i + 1) % TEMALAR.length].id;
  temaUygula(); ayarlariCiz(); yaz();
  ipucuGoster("🎨 Tema: " + temaAd(V.tema));
}
function temaAd(id){
  for(var i = 0; i < TEMALAR.length; i++){ if(TEMALAR[i].id === id) return TEMALAR[i].ad; }
  return id;
}
function sureyeAyarla(){
  olcum();
  if(OK.toplam <= 0){ alert("Metin ekrana sığdığı için hız ayarına gerek yok."); return; }
  V.hiz = sayi(Math.round(OK.toplam / (V.dakika * 60)), 10, 260);
  $("gHiz").value = V.hiz; $("etHiz").textContent = V.hiz;
  durumYaz(); yaz();
  alert("Hız " + V.hiz + " px/sn yapıldı — metin yaklaşık " + V.dakika + " dakikada bitecek.");
}
function yerImiKaydet(){
  if(!tekMetin($("metinAlani").value)) return;
  V.yerIci = { konum: Math.round(OK.konum), imza: imza($("metinAlani").value), tarih: new Date().toLocaleString("tr-TR") };
  yerIciCiz(); yaz();
  ipucuGoster("🔖 Kaldığın yer kaydedildi (%" + Math.round(OK.toplam > 0 ? (OK.konum / OK.toplam) * 100 : 0) + ")");
}
function yerIciCiz(){
  var y = V.yerIci;
  if(!y || y.imza !== imza($("metinAlani").value)){ $("yerIci").textContent = "Kaldığın yer: —"; return; }
  var yuzde = OK.toplam > 0 ? Math.round((y.konum / OK.toplam) * 100) : 0;
  $("yerIci").textContent = "Kaldığın yer: %" + yuzde + " (" + y.tarih + ")";
}
function devamEt(){
  var y = V.yerIci;
  if(!y || y.imza !== imza($("metinAlani").value)){
    alert("Bu metin için kayıtlı bir yer yok. Önce okurken 🔖 düğmesine basıp kaldığın yeri kaydet.");
    return;
  }
  olcum();
  OK.konum = sayi(y.konum, 0, OK.toplam);
  konumUygula();
  basla();
}

/* ------------------------- ekran çizimi ------------------------- */
function sayacYenile(){
  METIN = $("metinAlani").value;
  var k = kelimeSay(METIN);
  $("sayac").textContent = k + " kelime · " + METIN.length + " karakter";
  var saniye = k / 150 * 60;
  $("sureTahmini").textContent = k ? ("Tahmini okuma süresi: ~" + sureMetni(saniye) + " (dakikada 150 kelime)") : "Tahmini okuma süresi: —";
}
function kayitlariCiz(){
  var kap = $("kayitListe");
  if(!KAYITLAR.length){
    kap.innerHTML = '<div class="bosNot">Henüz kayıtlı metin yok. Metnini yazıp <b>“Bu metni kaydet”</b> düğmesine bas; dilediğin kadar metin tutabilirsin.</div>';
    return;
  }
  var h = "";
  for(var i = 0; i < KAYITLAR.length; i++){
    var k = KAYITLAR[i];
    var kelime = kelimeSay(k.metin);
    h += '<div class="kayitSatir">'
      +   '<div class="kayitAd"><span>' + esc(k.ad) + '</span><div class="kayitAlt">' + kelime + ' kelime · '
      +     esc((k.metin || "").slice(0, 42)) + '… · ' + esc(k.tarih || "") + '</div></div>'
      +   '<button class="mini" data-act="yukle" data-i="' + i + '" title="Bu metni yükle">📥</button>'
      +   '<button class="mini" data-act="okuKayit" data-i="' + i + '" title="Bunu hemen oku">▶</button>'
      +   '<button class="mini" data-act="silKayit" data-i="' + i + '" title="Sil">🗑</button>'
      + '</div>';
  }
  kap.innerHTML = h;
}
function temaListesiCiz(){
  var h = "";
  for(var i = 0; i < TEMALAR.length; i++){
    h += '<button data-tema="' + TEMALAR[i].id + '" style="--nokta:' + TEMALAR[i].nokta + '">' + esc(TEMALAR[i].ad) + '</button>';
  }
  $("secTema").innerHTML = h;
}
function fontListesiCiz(){
  var h = "";
  for(var i = 0; i < FONTLAR.length; i++){
    h += '<button data-font="' + FONTLAR[i].id + '">' + esc(FONTLAR[i].ad) + '</button>';
  }
  $("secFont").innerHTML = h;
}
function ayarlariCiz(){
  $("gHiz").value = V.hiz; $("etHiz").textContent = V.hiz;
  $("gBoyut").value = V.boyut; $("etBoyut").textContent = V.boyut;
  $("gSatir").value = V.satir; $("etSatir").textContent = (V.satir / 100).toFixed(2);
  $("gKenar").value = V.kenar; $("etKenar").textContent = V.kenar;
  $("gDakika").value = V.dakika; $("etDakika").textContent = V.dakika;
  $("gOpak").value = V.opak; $("etOpak").textContent = V.opak;

  $("kAyna").checked = !!V.ayna;
  $("kKilavuz").checked = !!V.kilavuz;
  $("kDongu").checked = !!V.dongu;
  $("kUyanik").checked = !!V.uyanik;
  $("kBip").checked = !!V.bip;
  $("kMedya").checked = !!V.medya;
  $("kEzber").checked = !!V.ezber;
  $("kTakip").checked = !!V.takip;
  $("kSesliKumanda").checked = !!V.sesliKumanda;
  $("kYesilPerde").checked = !!V.yesilPerde;
  $("kSesKaydet").checked = !!V.sesKaydet;
  bicimMenusuKur();

  seciliYap("secSayac", "data-sayac", String(V.sayac));
  seciliYap("secTema", "data-tema", V.tema);
  seciliYap("secFont", "data-font", V.font);
  seciliYap("secVurgu", "data-vurgu", V.vurgu);
  seciliYap("secYerlesim", "data-yerlesim", V.yerlesim);
  seciliYap("secKalite", "data-kalite", V.kalite);
  seciliYap("secOran", "data-oran", V.oran);
  seciliYap("secFps", "data-fps", String(V.fps));
  seciliYap("secFiltre", "data-filtre", V.filtre);
  seciliYap("secArka", "data-arka", V.arka);
  if($("gZoom")) $("gZoom").value = V.zoom;
  if($("etZoom")) $("etZoom").textContent = V.zoom;
  if($("arkaRenk")) $("arkaRenk").value = V.arkaRenk;
  if($("arkaRenkYazi")) $("arkaRenkYazi").textContent = V.arkaRenk;
  temaUygula(); fontUygula(); sahneAyarlariUygula(); yerIciCiz();
}
function seciliYap(kapId, nitelik, deger){
  var kap = $(kapId);
  if(!kap) return;
  var b = kap.querySelectorAll("button");
  for(var i = 0; i < b.length; i++){
    if(b[i].getAttribute(nitelik) === deger) b[i].className = "secili";
    else b[i].className = "";
  }
}
function sahneAyarlariUygula(){
  var p = $("prompt"), k = $("kaydiran"), s = $("sahne");
  p.style.fontSize = V.boyut + "px";
  p.style.lineHeight = (V.satir / 100).toFixed(2);
  k.style.setProperty("--kenar", V.kenar + "%");
  document.documentElement.style.setProperty("--opak", (V.opak / 100).toFixed(2));
  /* SINIFLARI TEK TEK AÇ/KAPA: className ataması sahneyi kapatıyordu */
  s.classList.toggle("ayna", !!V.ayna);
  s.classList.toggle("kilavuzKapali", !V.kilavuz);
  s.classList.toggle("ezber", !!V.ezber);
  s.classList.toggle("kameraAcik", !!KAM.acik);
  s.classList.toggle("yerlesimUst", V.yerlesim === "ust");
  s.classList.toggle("yesilPerde", !!V.yesilPerde);
  durumYaz();
}

/* ------------------------- .txt içe/dışa, yazdırma ------------------------- */
function txtIceri(){
  $("dosyaGirdi").click();
}
function dosyaSecildi(e){
  var f = e.target.files && e.target.files[0];
  if(!f) return;
  var r = new FileReader();
  r.onload = function(){
    $("metinAlani").value = String(r.result || "");
    sayacYenile(); yaz();
    alert("Metin içe alındı: " + f.name);
  };
  r.readAsText(f, "UTF-8");
  e.target.value = "";
}
function txtIndir(){
  var m = $("metinAlani").value;
  if(!tekMetin(m)){ alert("İndirilecek metin yok."); return; }
  var ad = tekMetin(String(m).split("\n")[0]).slice(0, 28).replace(/[^\wğüşıöçĞÜŞİÖÇ ]/g, "") || "ustad-metin";
  var blob = new Blob([m], { type: "text/plain;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = ad.trim().replace(/\s+/g, "-") + ".txt";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function yazdir(){
  var temiz = String($("metinAlani").value || "")
    .replace(/\[DUR\]|\[YAVAŞ\]|\[YAVAS\]|\[HIZLI\]|\[NORMAL\]/gi, "")
    .replace(/==|\*\*/g, "");
  $("yazdirilacak").textContent = temiz;
  window.print();
}

/* ------------------------- telefon kumandası ------------------------- */
function kumandaBaslat(){
  if(location.protocol.indexOf("http") !== 0) return;
  KUMANDA.taban = location.origin;
  $("kumandaAdres").textContent = location.origin + "/kumanda";
  KUMANDA.zamanlayici = setInterval(kumandaSor, 800);
}
function kumandaSor(){
  if(!KUMANDA.taban) return;
  fetch(KUMANDA.taban + "/komut").then(function(r){ return r.json(); }).then(function(d){
    if(d && d.komut){ komutCoz(d.komut, true); }
  }).catch(function(){});
}

/* ------------------------- örnek metin ------------------------- */
var ORNEK =
"Merhaba, ben Kenan Kuzucu.\n\n" +
"Bu metin, teleprompter aracını denemen için hazırlandı. Yazının ortasındaki sarı çizgi okuma çizgisidir; " +
"gözünü oradan ayırma, sözler o çizgiden geçerken yüksek sesle oku.\n\n" +
"Hızı kendi konuşma tempona göre ayarla. [YAVAŞ] Acele ediyorsan hızı düşür, [HIZLI] rahatsan artır. [NORMAL]\n\n" +
"[DUR]\n\n" +
"Şimdi bir de işaretleri gördün: kırmızı DUR kutusu yazı okuma çizgisine gelince akış kendiliğinden durur, " +
"devam etmek için ekrana dokunman yeter.\n\n" +
"==Bu satır fosforlu kalemle işaretlidir.== **Bu kısım kalın yazılır.** *Bu kısım ise eğik.*\n\n" +
"Ne kadar çok çalışırsan o kadar güzel konuşursun. Hazırsan başlayalım.";

/* ------------------------- olaylar ------------------------- */
function efektOlaylari(){
  var gz = $("gZoom");
  if(gz) gz.addEventListener("input", function(){
    V.zoom = parseInt(gz.value, 10) || 100;
    if($("etZoom")) $("etZoom").textContent = V.zoom;
    efektOnizleme(); yaz();
  });
  var ar = $("arkaRenk");
  if(ar) ar.addEventListener("input", function(){
    V.arkaRenk = ar.value;
    if($("arkaRenkYazi")) $("arkaRenkYazi").textContent = ar.value;
    if(V.arka === "renk") efektOnizleme();
    yaz();
  });
}
document.addEventListener("click", function(e){
  var t = e.target.closest ? e.target.closest("[data-act],[data-tema],[data-font],[data-vurgu],[data-sayac],[data-yerlesim],[data-kalite],[data-oran],[data-fps],[data-filtre],[data-arka]") : null;
  if(!t) return;

  if(t.hasAttribute("data-tema")){ V.tema = t.getAttribute("data-tema"); ayarlariCiz(); yaz(); return; }
  if(t.hasAttribute("data-font")){ V.font = t.getAttribute("data-font"); fontUygula(); ayarlariCiz(); yaz(); return; }
  if(t.hasAttribute("data-vurgu")){ V.vurgu = t.getAttribute("data-vurgu"); temaUygula(); ayarlariCiz(); yaz(); return; }
  if(t.hasAttribute("data-sayac")){ V.sayac = parseInt(t.getAttribute("data-sayac"), 10) || 0; ayarlariCiz(); yaz(); return; }
  if(t.hasAttribute("data-yerlesim")){ V.yerlesim = t.getAttribute("data-yerlesim"); sahneAyarlariUygula(); olcum(); ayarlariCiz(); yaz(); return; }
  if(t.hasAttribute("data-kalite")){ V.kalite = t.getAttribute("data-kalite"); kaliteDegisti(); return; }
  if(t.hasAttribute("data-oran")){ V.oran = t.getAttribute("data-oran"); kaliteDegisti(); return; }
  if(t.hasAttribute("data-fps")){ V.fps = parseInt(t.getAttribute("data-fps"), 10) || 30; ayarlariCiz(); efektOnizleme(); yaz(); return; }
  if(t.hasAttribute("data-filtre")){ V.filtre = t.getAttribute("data-filtre"); ayarlariCiz(); efektOnizleme(); yaz(); return; }
  if(t.hasAttribute("data-arka")){ V.arka = t.getAttribute("data-arka"); ayarlariCiz(); efektOnizleme(); yaz(); return; }

  var act = t.getAttribute("data-act");
  if(act === "oku" || act === "okuKayit"){
    if(act === "okuKayit"){
      var ik = parseInt(t.getAttribute("data-i"), 10);
      if(KAYITLAR[ik]){ $("metinAlani").value = KAYITLAR[ik].metin; sayacYenile(); yaz(); }
    }
    basaDon(); basla();
  }else if(act === "kaydet"){
    var m = $("metinAlani").value;
    if(!tekMetin(m)){ alert("Kaydetmek için önce bir metin yaz."); return; }
    var ad = prompt("Bu metne bir ad ver (ör. “Kampanya videosu”):", "Metin " + (KAYITLAR.length + 1));
    if(ad === null) return;
    ad = tekMetin(ad) || ("Metin " + (KAYITLAR.length + 1));
    var bulundu = false;
    for(var i = 0; i < KAYITLAR.length; i++){
      if(trKucuk(KAYITLAR[i].ad) === trKucuk(ad)){ KAYITLAR[i].metin = m; KAYITLAR[i].tarih = new Date().toLocaleString("tr-TR"); bulundu = true; }
    }
    if(!bulundu) KAYITLAR.push({ ad: ad, metin: m, tarih: new Date().toLocaleString("tr-TR") });
    kayitlariCiz(); yaz();
  }else if(act === "yukle"){
    var iy = parseInt(t.getAttribute("data-i"), 10);
    if(KAYITLAR[iy]){ $("metinAlani").value = KAYITLAR[iy].metin; sayacYenile(); yerIciCiz(); yaz(); }
  }else if(act === "silKayit"){
    var is2 = parseInt(t.getAttribute("data-i"), 10);
    if(KAYITLAR[is2] && confirm("“" + KAYITLAR[is2].ad + "” silinsin mi?")){
      KAYITLAR.splice(is2, 1); kayitlariCiz(); yaz();
    }
  }else if(act === "temizle"){
    if($("metinAlani").value && confirm("Metin kutusu temizlensin mi?")){
      $("metinAlani").value = ""; sayacYenile(); yaz();
    }
  }else if(act === "ornek"){
    $("metinAlani").value = ORNEK; sayacYenile(); yerIciCiz(); yaz();
  }else if(act === "devam"){
    devamEt();
  }else if(act === "sureyeAyarla"){
    sureyeAyarla();
  }else if(act === "txtIceri"){
    txtIceri();
  }else if(act === "txtIndir"){
    txtIndir();
  }else if(act === "yazdir"){
    yazdir();
  }else if(act === "kameraAc"){
    if(KAM.acik) kameraKapat(); else kameraAc();
  }else if(act === "kayitBasla"){
    kayitBasla();
  }else if(act === "kayitDurdur"){
    kayitDurdur();
  }else if(act === "efektSifirla"){
    V.kalite = "1080"; V.oran = "16:9"; V.fps = 30; V.filtre = "yok";
    V.arka = "yok"; V.zoom = 100; V.arkaRenk = "#0b1220";
    if($("gZoom")) $("gZoom").value = 100;
    if($("arkaRenk")) $("arkaRenk").value = "#0b1220";
    if($("arkaRenkYazi")) $("arkaRenkYazi").textContent = "#0b1220";
    ayarlariCiz(); efektOnizleme();
    if(KAM.acik){ kameraKapat(); kameraAc(); }      /* yeni ölçüyle kamera yeniden açılır */
    yaz();
    ipucuGoster("♻️ Efektler sıfırlandı (1080p · 16:9 · 30 fps · filtre yok)");
  }else if(act === "farkliKaydet"){
    kaydiFarkliKaydet();
  }else if(act === "adresKopyala"){
    var ad = $("kumandaAdres").textContent;
    if(navigator.clipboard){ navigator.clipboard.writeText(ad); }
    alert("Adres: " + ad);
  }else if(act === "tamEkran"){
    if(document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
});

/* ayar girdileri */
$("gHiz").addEventListener("input", function(){ V.hiz = sayi(this.value, 10, 260); $("etHiz").textContent = V.hiz; durumYaz(); yaz(); });
$("gBoyut").addEventListener("input", function(){ V.boyut = sayi(this.value, 24, 160); $("etBoyut").textContent = V.boyut; sahneAyarlariUygula(); olcum(); yaz(); });
$("gSatir").addEventListener("input", function(){ V.satir = sayi(this.value, 100, 240); $("etSatir").textContent = (V.satir / 100).toFixed(2); sahneAyarlariUygula(); olcum(); yaz(); });
$("gKenar").addEventListener("input", function(){ V.kenar = sayi(this.value, 2, 30); $("etKenar").textContent = V.kenar; sahneAyarlariUygula(); olcum(); yaz(); });
$("gDakika").addEventListener("input", function(){ V.dakika = sayi(this.value, 1, 30); $("etDakika").textContent = V.dakika; yaz(); });
$("gOpak").addEventListener("input", function(){ V.opak = sayi(this.value, 10, 100); $("etOpak").textContent = V.opak; sahneAyarlariUygula(); yaz(); });

$("kAyna").addEventListener("change", function(){ V.ayna = this.checked; sahneAyarlariUygula(); yaz(); });
$("kKilavuz").addEventListener("change", function(){ V.kilavuz = this.checked; sahneAyarlariUygula(); yaz(); });
$("kDongu").addEventListener("change", function(){ V.dongu = this.checked; yaz(); });
$("kUyanik").addEventListener("change", function(){ V.uyanik = this.checked; yaz(); });
$("kBip").addEventListener("change", function(){ V.bip = this.checked; yaz(); });
$("kMedya").addEventListener("change", function(){ V.medya = this.checked; if(V.medya) medyaSessionKur(); yaz(); });
$("kEzber").addEventListener("change", function(){ V.ezber = this.checked; sahneAyarlariUygula(); if(V.ezber) ezberGuncelle(); yaz(); });
$("kTakip").addEventListener("change", function(){ V.takip = this.checked; if(V.takip) tanimaBaslat(); yaz(); });
$("kSesliKumanda").addEventListener("change", function(){
  V.sesliKumanda = this.checked;
  if(V.sesliKumanda) tanimaBaslat(); else if(!V.takip) tanimaDurdur();
  yaz();
});
$("kYesilPerde").addEventListener("change", function(){ V.yesilPerde = this.checked; sahneAyarlariUygula(); yaz(); });
$("kSesKaydet").addEventListener("change", function(){
  V.sesKaydet = this.checked; yaz();
  if(KAM.acik){ kameraKapat(); kameraAc(); }
});
$("metinAlani").addEventListener("input", function(){ sayacYenile(); yerIciCiz(); yaz(); });
$("dosyaGirdi").addEventListener("change", dosyaSecildi);

/* sahne kumandası */
$("dOynat").addEventListener("click", function(){ if(OK.calisiyor) durdur(); else baslaKaydirma(); });
$("dBasla").addEventListener("click", basaDon);
$("dYavas").addEventListener("click", function(){ hizDegistir(-10); });
$("dHizli").addEventListener("click", function(){ hizDegistir(10); });
$("dKucuk").addEventListener("click", function(){ boyutDegistir(-6); });
$("dBuyuk").addEventListener("click", function(){ boyutDegistir(6); });
$("dAyna").addEventListener("click", aynaDegistir);
$("dEzber").addEventListener("click", function(){ V.ezber = !V.ezber; $("kEzber").checked = V.ezber; sahneAyarlariUygula(); yaz(); ipucuGoster(V.ezber ? "🧠 Ezber modu açık" : "🧠 Ezber modu kapalı"); });
$("dTema").addEventListener("click", temaDegistir);
$("dYerImi").addEventListener("click", yerImiKaydet);
$("dKayitKamera").addEventListener("click", function(){ if(KAM.acik) kameraKapat(); else kameraAc(); });
$("dCikis").addEventListener("click", sahneKapat);

$("sahne").addEventListener("click", function(e){
  if(e.target.closest("#kumanda") || e.target.closest("#sayacKat")) return;
  if(V.ezber){
    $("sahne").classList.toggle("ipucuAcik");
    setTimeout(function(){ $("sahne").classList.remove("ipucuAcik"); }, 3000);
    return;
  }
  var ip = $("ipucu");
  if(ip.classList.contains("acik")){ ip.classList.remove("acik"); }
  if(OK.calisiyor) durdur(); else baslaKaydirma();
});

/* klavye */
document.addEventListener("keydown", function(e){
  var sahneAcik = $("sahne").classList.contains("acik");
  if(e.key === "Escape"){ if(sahneAcik){ sahneKapat(); e.preventDefault(); } return; }
  if(e.key === "MediaPlayPause"){ if(sahneAcik){ OK.calisiyor ? durdur() : baslaKaydirma(); } e.preventDefault(); return; }
  if(e.key === "MediaStop"){ durdur(); e.preventDefault(); return; }
  if(!sahneAcik) return;
  if(e.key === " " || e.key === "Spacebar"){ if(OK.calisiyor) durdur(); else baslaKaydirma(); e.preventDefault(); }
  else if(e.key === "ArrowUp"){ hizDegistir(5); e.preventDefault(); }
  else if(e.key === "ArrowDown"){ hizDegistir(-5); e.preventDefault(); }
  else if(e.key === "+" || e.key === "=" ){ boyutDegistir(6); e.preventDefault(); }
  else if(e.key === "-" || e.key === "_"){ boyutDegistir(-6); e.preventDefault(); }
  else if(e.key === "r" || e.key === "R"){ basaDon(); }
  else if(e.key === "a" || e.key === "A"){ aynaDegistir(); }
  else if(e.key === "k" || e.key === "K"){ V.kilavuz = !V.kilavuz; $("kKilavuz").checked = V.kilavuz; sahneAyarlariUygula(); yaz(); }
  else if(e.key === "e" || e.key === "E"){ V.ezber = !V.ezber; $("kEzber").checked = V.ezber; sahneAyarlariUygula(); yaz(); }
  else if(e.key === "b" || e.key === "B"){ yerImiKaydet(); }
  else if(e.key === "f" || e.key === "F"){
    if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
  }
});

window.addEventListener("resize", function(){ if($("sahne").classList.contains("acik")) olcum(); });

/* ------------------------- açılış ------------------------- */
oku();
$("metinAlani").value = METIN || "";
sayacYenile();
kayitlariCiz();
temaListesiCiz();
fontListesiCiz();
efektOlaylari();
ayarlariCiz();
efektOnizleme();
kumandaBaslat();
medyaSessionKur();

/* test kapısı */
window.UT = {
  V: function(){ return V; }, OK: function(){ return OK; },
  basla: basla, durdur: durdur, baslaKaydirma: baslaKaydirma, basaDon: basaDon,
  olcum: olcum, konumUygula: konumUygula, metniSahneyeKoy: metniSahneyeKoy,
  hizDegistir: hizDegistir, boyutDegistir: boyutDegistir, temaDegistir: temaDegistir,
  sahneKapat: sahneKapat, ayarlariCiz: ayarlariCiz, kayitlariCiz: kayitlariCiz,
  adim: tik, geriSayim: geriSayim, komutCoz: komutCoz, sureyeAyarla: sureyeAyarla,
  yerImiKaydet: yerImiKaydet, devamEt: devamEt, ezberGuncelle: ezberGuncelle,
  kameraAc: kameraAc, kameraKapat: kameraKapat, kayitBasla: kayitBasla, kayitDurdur: kayitDurdur,
  txtIndir: txtIndir, yazdir: yazdir, bip: bip, tanimaBaslat: tanimaBaslat,
 sesDurum: function(){ return { ctx: SES_CTX ? SES_CTX.state : "yok", bip: !!V.bip,
                                mikrofon_akis: !!(KAM.akis && KAM.akis.getAudioTracks && KAM.akis.getAudioTracks().length),
                                mikrofon_ayar: !!V.sesKaydet, kayit_mikrofon: !!(KAM.kayit && KAM.kayit.stream &&
                                KAM.kayit.stream.getAudioTracks && KAM.kayit.stream.getAudioTracks().length) }; },
 bicimler: function(){ return KAYIT_BICIMLERI.map(function(b){ return (bicimDestek(b) ? "✔ " : "✘ ") + b.etiket; }); },
 seciliBicim: function(){ return secilenBicim().etiket + " | " + secilenBicim().mime; },
 kaliteDurum: function(){
   return { kalite: V.kalite, oran: V.oran, fps: V.fps, filtre: V.filtre, arka: V.arka, zoom: V.zoom,
            hedef: hedefOlcu().join("x"), kanvas: kanvasGerekli(), kroma: V.arka !== "yok",
            isleme: islemeOlcu().join("x"), kamera: KAM.acik ? ($("kameraAkis").videoWidth + "x" + $("kameraAkis").videoHeight) : "kapali",
            filtreCss: filtreCss() };
 },
 kanvasOlcu: function(){ return hedefOlcu().join("x"); },
 kromaDeneme: function(){
   /* yeşil perde matematiğini doğrudan sınar: sentetik tuval -> silinen piksel sayısı */
   var t = document.createElement("canvas"); t.width = 20; t.height = 10;
   var c2 = t.getContext("2d");
   c2.fillStyle = "#00ff00"; c2.fillRect(0, 0, 10, 10);
   c2.fillStyle = "#c0392b"; c2.fillRect(10, 0, 10, 10);
   var veri = c2.getImageData(0, 0, 20, 10);
   var silinen = kromaSil(veri);
   c2.putImageData(veri, 0, 0);
   var sol = c2.getImageData(1, 1, 1, 1).data, sag = c2.getImageData(15, 1, 1, 1).data;
   return { silinen_piksel: silinen, yesil_alfa: sol[3], kirmizi_alfa: sag[3] };
 },
 kameraDurum: function(){ return { acik: KAM.acik, akis: !!KAM.akis, kayit: KAM.kayit ? KAM.kayit.state : "yok",
                                   blob: KAM.sonBlob ? KAM.sonBlob.size : 0 }; },
 sonBlob: function(){ return KAM.sonBlob; },
 kanvasBilgi: function(){ return KAM.kanvas ? { olcu: KAM.kanvas.olcu.join("x"), kroma: KAM.kanvas.kroma } : null; },
 silinenPiksel: function(){ return KAM.silinenPiksel || 0; },
 kaydiFarkliKaydet: kaydiFarkliKaydet, indirYedek: indirYedek, kayitAdi: kayitAdi,
 kaydiTelefonaKaydet: kaydiTelefonaKaydet, kopruVar: function(){ return KOPRU; },
  temaUygula: temaUygula, fontUygula: fontUygula, cizgiY: cizgiY,
  hizCarpani: hizCarpani, durNokta: function(){ return DUR_NOKTA; }, hizNokta: function(){ return HIZ_NOKTA; },
  satirlar: function(){ return SATIRLAR; }, temaAd: temaAd, temalar: TEMALAR, fontlar: FONTLAR,
  kayitlar: function(){ return KAYITLAR; }, yaz: yaz, oku: oku
};

/* ---------------- gizli tanı modu (#oz-test) ----------------
   Yalnız APK, "adb shell am start … --es oztest oz-test" ile açıldığında çalışır.
   Kamera + kayıt + telefona kaydetme akışını ölçer ve sonucu logcat'e (console.log) yazar. */
function ozTest(){
  window.__ozTest = { durum: "basladi", satirlar: [] };
  function L(m){ try{ console.log("OZTEST " + m); }catch(e){}
                 try{ window.__ozTest.satirlar.push(m); }catch(e){}
                 try{ if(KOPRU && window.UstadKaydet.gunluk) window.UstadKaydet.gunluk("OZTEST " + m); }catch(e){} }
  window.onerror = function(m, k, sat){ L("HATA " + m + " @" + sat); };
  L("basladi | kopru=" + KOPRU + " | bicim=" + secilenBicim().etiket);
  try{
    V.sesKaydet = true;
    kameraAc();
    setTimeout(function(){
      L("kamera=" + JSON.stringify({ akis: !!KAM.akis, mikrofon: !!(KAM.akis && KAM.akis.getAudioTracks().length) }));
      kayitBasla();
      setTimeout(function(){
        L("kayit_durumu=" + (KAM.kayit ? KAM.kayit.state : "yok") +
          " | mikrofon=" + !!(KAM.kayit && KAM.kayit.stream.getAudioTracks().length));
        kayitDurdur();
        setTimeout(function(){
          L("blob_bayt=" + (KAM.sonBlob ? KAM.sonBlob.size : 0));
          kaydiFarkliKaydet();
          setTimeout(function(){ L("BITTI"); window.__ozTest.durum = "bitti"; }, 8000);
        }, 2000);
      }, 5000);
    }, 3500);
  }catch(e){ L("HATA " + (e && e.message)); }
}
if(location.hash === "#oz-test"){
  if(document.readyState === "complete") setTimeout(ozTest, 400);
  else window.addEventListener("load", function(){ setTimeout(ozTest, 400); });
}

/* ---------------- çevrimdışı servis çalışanı ----------------
   Yalnız https altında kaydedilir (file:// ve APK'da gerek yok). */
if("serviceWorker" in navigator && location.protocol === "https:"){
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("sw.js").catch(function(){});
  });
}
