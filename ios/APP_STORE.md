# Kibar Hırsız: App Store'a çıkış rehberi

Bu klasörde App Store için gerekenlerin hepsi hazır: Xcode projesi, uygulama simgesi, açılış ekranı, gizlilik bildirimi, ekran görüntüleri ve mağaza metinleri. Aşağıdaki adımları senin yapman gerekiyor, çünkü bunlar senin Apple hesabınla yapılıyor.

## Onay geldiği gün: hızlı yol

"Welcome to the Apple Developer Program" e-postası gelince şu sırayla ilerle. Hepsi birkaç saat sürer; sonrası Apple'ın incelemesi (genelde 1–2 gün).

1. **Adı ayırt (5 dk).** appstoreconnect.apple.com → **Uygulamalar → +  → Yeni Uygulama**. Platform iOS, ad **Kibar Hırsız**, birincil dil Türkçe, paket kimliği **com.kibarhirsiz.oyun**, SKU `kibarhirsiz`. Ad alınmışsa "Kibar Hırsız: İstanbul 1924" gibi bir ek dene.
2. **Xcode'a hesabı ekle (5 dk).** Xcode → Settings → Accounts → + → yeni Apple ID. Sonra Claude'a haber ver: takımı değiştirir, gerekirse paket kimliğini yenisine çevirir, uygulamayı imzalayıp App Store Connect'e yükler.
3. **Mağaza sayfası (30–45 dk).** Aşağıdaki 4–8. bölümleri doldur: metinler, 8 ekran görüntüsü, gizlilik ("Veri toplamıyoruz"), yaş derecelendirmesi. Gizlilik politikası adresi: https://dilatilla00.github.io/kibar-hirsiz/privacy.html, destek adresi: https://dilatilla00.github.io/kibar-hirsiz/support.html
4. **Derlemeyi seç ve incelemeye gönder (10 dk).** Yükleme 10–30 dakikada "işleniyor"dan çıkar. Sürüm sayfasında **Derleme** bölümünden seç, **İncelemeye Gönder**.

**Hız için öneri:** İlk sürümü (1.0) Game Center'sız gönder. Game Center için 27 başarım görseli ve tanım gerekiyor; bunlar ilk incelemeyi geciktirir. Oyun Game Center olmadan da tam çalışıyor, başarımlar oyunun içinde görünüyor. Game Center'ı 1.1 sürümünde açarız (en alttaki bölüm).

## 1. Gerekenler

- **Mac'e Xcode kur.** Mac App Store'dan ücretsiz indirilir. Kurduktan sonra bir kez aç ve ek bileşenleri yüklemesine izin ver.
- **Apple Developer Program üyeliği.** https://developer.apple.com/programs/ adresinden yıllık 99 USD karşılığında alınır. Onaylanması 1–2 gün sürebilir.

## 2. Projeyi Xcode'da aç

1. `ios/KibarHirsiz.xcodeproj` dosyasına çift tıkla.
2. Soldan **KibarHirsiz** projesini, ardından **Signing & Capabilities** sekmesini seç.
3. **Team** kısmından kendi geliştirici hesabını seç.
4. **Bundle Identifier** `com.kibarhirsiz.oyun` (ücretli takıma kayıtlı). App Store'a yükledikten sonra değiştirilemez.
5. Üstten bir iPhone simülatörü seçip ▶ düğmesine bas ve oyunun açıldığını gör.

Oyunun web dosyaları her derlemede `ios/sync-web.sh` ile kendiliğinden uygulamanın içine kopyalanır. Oyunda bir değişiklik yaptığında ayrıca bir şey yapman gerekmez.

## 3. App Store Connect'te uygulamayı oluştur

https://appstoreconnect.apple.com → **Uygulamalar** → **+** → **Yeni Uygulama**

| Alan | Değer |
|---|---|
| Platform | iOS |
| Ad | Kibar Hırsız (alınmışsa: "Kibar Hırsız: İstanbul 1924") |
| Birincil dil | Türkçe |
| Paket kimliği | com.kibarhirsiz.oyun |
| SKU | kibarhirsiz-001 |

## 4. Mağaza metinleri

**Alt başlık** (en fazla 30 karakter)
> 1920'ler İstanbul'unda soygun

**Tanıtım metni** (en fazla 170 karakter)
> Küçük evlerden saray hazinesine, İstanbul'dan Monte Carlo kumarhanesine uzanan centilmen bir hırsızın hikâyesi. Planla, ekibini kur, iz bırakma.

**Açıklama**
> 1924 İstanbul'u. Geceler uzun, konaklar sessiz, müzeler korunaksız sanılır. Sen Kibar Hırsız'sın: kimseye zarar vermeyen, ama hiçbir kilidin de önünde duramadığı centilmen bir hırsız.
>
> KÜÇÜKTEN BAŞLA, EFSANE OL
> Fatih'teki bir kunduracının evinden başla; dükkânlara, mağazalara, müzelere ve sonunda Saray Hazinesi'ne uzan. Her hedefin bir başarı şansı var ve bu şansı sen değiştirirsin.
>
> PLANINI YAP
> Çatıdan mı gireceksin, kömürlükten mi, yoksa uşak kılığında ön kapıdan mı? Her yolun bir bedeli var. Bu gecenin havasına da bak: sisli gecede kimse seni görmez, bayram gecesi evler boştur, dolunayda her yer aydınlıktır.
>
> GERÇEK ZAMANLI SOYGUNLAR
> Sessiz giriş, soygun ve kaçış gerçek zamanlı ilerler. Yolda bir köpek havlar, bekçi düdük çalar, kilit sıkışır. Ne yapacağına sen karar verirsin; kilidi ve kasayı kendi ellerinle açmayı da deneyebilirsin.
>
> EKİBİNİ KUR
> Gözcü, kilitçi, şoför, kaçakçı... Her ekip üyesinin kendi yeteneği ve kendi payı var. Sen yokken bile ufak işler çevirirler.
>
> YATAKÇILAR VE KARABORSA
> Soygundan çıkan gümüş şamdanı, inci kolyeyi, murassa hançeri yatakçılara sat. Biri güvenli ama cimri, biri cömert ama zabıtanın gözü üstünde. Pazarlık senin elinde.
>
> DÜNYAYA AÇIL
> İstanbul sana dar gelince Atina, Kahire, Paris ve Monte Carlo seni bekler. En büyük vurgun: Monte Carlo kumarhanesi.
>
> KOLEKSİYON VE BAŞARIMLAR
> Bizans tacı, firavun maskesi, prenses mücevherleri... Setleri tamamla, 27 başarımı topla, karakterine yeni bir görünüm seç.
>
> HER GÜN YENİ BİR GECE
> Günlük ödüller, her gün değişen gece havası ve soygun bitince gelen bildirimler. Oyun bitmez: güvenlik her soygunla artar, her şehirde yeni bir meydan okuma vardır.
>
> İnternet gerekmez, reklam yoktur, hiçbir veri toplanmaz.

**Anahtar kelimeler** (en fazla 100 karakter)
> hırsız,soygun,istanbul,strateji,idle,tycoon,ekip,müze,kasa,1920,menü,simülasyon,centilmen

| Alan | Değer |
|---|---|
| Kategori | Oyunlar → Simülasyon (ikincil: Strateji) |
| Destek URL'si | https://dilatilla00.github.io/kibar-hirsiz/support.html |
| Gizlilik politikası URL'si | https://dilatilla00.github.io/kibar-hirsiz/privacy.html |
| Pazarlama URL'si (isteğe bağlı) | https://dilatilla00.github.io/kibar-hirsiz/ |
| Telif hakkı | 2026 Atilla Dil |
| Fiyat | Ücretsiz (ya da sen nasıl istersen) |

## 5. Ekran görüntüleri

`ios/store/screenshots-6.3/` klasöründe 8 adet 2622×1206 yatay görüntü var ("iPhone with Dynamic Island (medium display)" alanı için; 6.9" boyutlu asılları `screenshots-6.9/` içinde) (sırayla yükle; 7. başarımlar, 8. soygun sırasında bir olay). Bunları **iPhone 6.9" ekran** bölümüne yükle. Apple bu boyuttan diğer iPhone boyutlarını kendisi türetir.

## 6. Uygulama gizliliği

App Store Connect → **Uygulama Gizliliği** → **Veri toplamıyoruz** ("Data Not Collected") seç. Oyun hiçbir veri toplamıyor ve göndermiyor. Bildirimler telefonda planlanıyor; Game Center verilerini Apple işlediği için senin beyan etmen gerekmiyor. Uygulamanın içindeki `PrivacyInfo.xcprivacy` dosyası da bunu bildiriyor.

## 7. Yaş derecelendirmesi

Ankette şu cevaplar uygundur:

- **Seyrek/hafif gerçekçi şiddet:** Yok.
- **Seyrek/hafif yetişkin temaları:** "Seyrek/hafif" seçilebilir (konu hırsızlık).
- **Simüle kumar:** Yok. Kumarhane yalnızca soyulan bir hedef; oyunda kumar oynanmıyor.
- **Diğer tüm başlıklar:** Yok.

Sonuç büyük ihtimalle **9+** ya da **12+** olur.

## 8. Şifreleme sorusu

`ITSAppUsesNonExemptEncryption = NO` Info.plist'e eklendi. App Store Connect bu soruyu bir daha sormaz.

## 9. Yükle ve incelemeye gönder

1. Xcode'da üstteki cihaz seçiminden **Any iOS Device (arm64)** seç.
2. **Product → Archive** menüsünü kullan.
3. Açılan pencerede **Distribute App → App Store Connect → Upload**.
4. 10–30 dakika sonra yüklenen sürüm App Store Connect'te görünür. Sürümü seç, bilgileri doldur ve **İncelemeye Gönder**.
5. İnceleme genelde 1–3 gün sürer.

**İnceleme notu** (App Review Information → Notes):
> Tek oyunculu, çevrimdışı çalışan bir strateji oyunudur. Giriş ya da hesap gerekmez. Soygunlar gerçek zamanlıdır; beklemeyi kısaltmak için soygun ekranındaki "Hızlandır" düğmesi oyun içi elmas kullanır (gerçek para ile satın alma yoktur).

## Yeni sürüm çıkarmak

1. Oyunda değişikliği yap.
2. Xcode'da **Version** (örn. 1.1) ve **Build** (örn. 2) numaralarını artır.
3. 9. adımı tekrarla.

## Reklamlar (1.1 sürümü için hazır, şu an kapalı)

Oyunda 5 ödüllü reklam noktası hazır; ilk sürümde hiçbiri görünmez.

| Nerede | Ödül | Sınır |
|---|---|---|
| Soygun paneli | İşi bir sonraki olaya ya da sona atlat | İş başına 1 |
| Başarılı soygun sonucu | Ganimeti ikiye katla | Sonuç başına 1 |
| Gazete · takip | Takibi 1 düşür | Gecede 1 |
| Karaborsa · elmas | Bedava 1 elmas | Gecede 1 |
| Görev penceresi | İkinci kez görev değiştir | Gecede 1 |

- Mod `js/ads.js` içindeki `MODE` ile seçilir: `off` (kapalı), `test` (sahte reklam), `on` (gerçek reklam).
- Tarayıcıda denemek için adresin sonuna `?ads=test` ekle; kapatmak için `?ads=off`.
- Gerçek reklam için iOS tarafına Google AdMob eklenip `ads` mesajı dinlenecek; reklam bitince `window.Ads._done(id, true)` çağrılacak.
- Reklamlar açılınca gizlilik politikası, App Store gizlilik beyanı ve izleme izni (ATT) güncellenmeli.

## Elmas satın alma (hazır, şu an kapalı)

Üst çubuktaki elmas kutusunun yanındaki **+** düğmesi elmas mağazasını açar. İlk sürümde gizli.

| Paket | Elmas | Hediye | Ürün kimliği (App Store Connect) | Öneri fiyat |
|---|---|---|---|---|
| Bir avuç elmas | 10 | — | com.kibarhirsiz.oyun.gems10 | ₺49,99 |
| Elmas kesesi | 30 | +3 | com.kibarhirsiz.oyun.gems30 | ₺129,99 |
| Elmas sandığı | 80 | +15 | com.kibarhirsiz.oyun.gems80 | ₺299,99 |
| Saray hazinesi | 200 | +50 | com.kibarhirsiz.oyun.gems200 | ₺649,99 |

- Mod `js/shop.js` içindeki `MODE` ile seçilir: `off`, `test` (sahte ödeme), `on` (gerçek ödeme).
- Tarayıcıda denemek için `?shop=test`; kapatmak için `?shop=off`.
- Gerçek satış için: App Store Connect'te **Paid Apps** sözleşmesi, vergi ve banka bilgileri; yukarıdaki 4 ürünü **Consumable (tüketilebilir)** olarak açmak; iOS tarafına StoreKit eklenip `store` mesajını dinlemek ve satın alma bitince `window.Shop._done(id, true)` çağırmak.
- Elmas satın alma oyunda sadece hızı ve kolaylığı artırır; her şey satın almadan da kazanılabilir.

## Game Center (1.1'de açık)

Oyunda 27 başarım ve 2 sıralama var. Oyuncu Game Center'a girmişse başarımlar ve sıralamalar oraya da gönderilir; girmemiş oyuncular için oyun her şeyi kendi içinde göstermeye devam eder.

Uygulama tarafı hazır: `KibarHirsiz.entitlements` dosyasında Game Center (ve iCloud) yetkisi var, `js/native.js` içinde `GC_ENABLED = true`.

App Store Connect'te yapılacaklar:
1. Uygulama → **Features (Özellikler) → Game Center**.
2. **Leaderboards** ve **Achievements** bölümlerine `ios/store/gamecenter/README.md` tablosundaki kimlik, puan, Türkçe ve İngilizce ad/açıklamalarla ekle. Görseller aynı klasörde (`kh_<kimlik>.png`, 1024×1024).
3. 1.1 sürüm sayfasında **Game Center** kutusunu işaretle ve sıralamalarla başarımları sürüme ekle.
4. Yaş derecelendirmesinde sıralamalar yüzünden **Contests** sorusunu **Infrequent** yap.

Kimlikler `eras/1920/content.js` içindeki `achievements` listesinden gelir (`kh_` + id). Yeni başarım eklersen App Store Connect'e de aynı kimlikle eklemelisin.

## Sürüm 1.1: İngilizce ve ödüllü reklamlar (hazırlık)

Kod hazır: oyun İngilizce de oynanabiliyor (telefon dili Türkçe değilse İngilizce açılır, Ayarlar'dan değiştirilebilir) ve iOS uygulamasında ödüllü reklamlar AdMob ile çalışıyor. Şimdilik Google'ın **test** reklam kimlikleri kullanılıyor; gerçek para kazandırmazlar.

### 1. AdMob hesabı (sen)
1. admob.google.com → Google hesabınla kaydol (ödeme bilgileri ve vergi formu istenir).
2. **Uygulamalar → Uygulama ekle → iOS**. Uygulama App Store'da yayındaysa "Kibar Hırsız"ı arayıp seç; değilse "Henüz yayınlanmadı" deyip adını yaz.
3. Uygulamanın sayfasında **Reklam birimleri → Reklam birimi ekle → Ödüllü**. Ad: `Odul`. Ödül ayarlarına dokunma (oyun ödülü kendisi veriyor).
4. Bana iki kimliği gönder:
   - **Uygulama kimliği**: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (içinde `~` var)
   - **Ödüllü reklam birimi kimliği**: `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ` (içinde `/` var)
5. **Gizlilik ve mesajlar** bölümünde **AB onay mesajı (GDPR)** oluştur ve yayınla. İstersen **IDFA açıklama mesajı** da ekleyebilirsin (izin penceresinden önce kısa bir açıklama gösterir).

### 2. Benim yapacaklarım (kimlikler gelince)
- ✅ Info.plist: `GADApplicationIdentifier` (`ca-app-pub-5651968244627563~8917118718`) ve `KHRewardedAdUnitID` (`ca-app-pub-5651968244627563/2230175459`). Debug derlemesi her zaman Google test reklamı kullanır.
- `privacy-1.1.html` içeriğini `privacy.html`'e taşımak (reklam verileri, izinler, KVKK).
- ✅ `app-ads.txt` yayında: https://dilatilla00.github.io/app-ads.txt (depo: dilatilla00/dilatilla00.github.io; kök adres oyunun destek sayfasına yönlendirir).
- Sürüm 1.1 (derleme 4+) arşivleyip yüklemek.

### 3. App Store Connect'te 1.1 için (sen)
- **Marketing URL** (her iki dilde): `https://dilatilla00.github.io` — AdMob, app-ads.txt'yi bu alan adında arar. Uygulama yayınlandıktan sonra AdMob'da uygulamayı App Store'a bağla.
- **Uygulama Gizliliği**: "Veri toplamıyoruz" yerine AdMob için şunları işaretle (Google'ın önerisi):
  - **Konum → Yaklaşık konum**: Üçüncü taraf reklam, Analiz · Kimliğe bağlı değil · İzleme için kullanılıyor: Evet
  - **Tanımlayıcılar → Cihaz kimliği**: Üçüncü taraf reklam, Analiz · Kimliğe bağlı değil · İzleme: Evet
  - **Kullanım verisi → Ürün etkileşimi, Reklam verileri**: Üçüncü taraf reklam, Analiz · İzleme: Evet
  - **Teşhis → Çökme verileri, Performans verileri, Diğer teşhis verileri**: Analiz · İzleme: Hayır
- **Yaş derecelendirmesi**: Adım 1'deki **Reklam** sorusu → **Evet**.
- **Yeni dil ekle → English (U.S.)**: aşağıdaki İngilizce metinler ve `ios/store/screenshots-en-6.3/` klasöründeki 8 İngilizce görüntü.
- Açıklamadaki "reklam yoktur" cümlesi kaldırıldı (aşağıdaki Türkçe metni kullan).

### Türkçe açıklamanın 1.1 son satırı
> İnternet gerekmez. İsteğe bağlı ödüllü reklamlar dışında reklam yoktur.

### İngilizce mağaza metinleri (English U.S.)

**Name:** Kibar Hırsız

**Subtitle** (30): `The gentleman thief, 1924`

**Promotional text** (170):
> From humble houses to the Palace Treasury, from Istanbul to the casino of Monte Carlo: the story of a gentleman thief. Plan, build your crew, leave no trace.

**Description:**
> Istanbul, 1924. The nights are long, the mansions quiet, the museums thought to be safe. You are Kibar Hırsız — the gentleman thief who never harms a soul, yet no lock can stop.
>
> START SMALL, BECOME A LEGEND
> Begin with a shoemaker's house in Fatih and work your way up to shops, stores, museums and, finally, the Palace Treasury. Every target has a chance of success, and you are the one who changes it.
>
> PLAN YOUR WAY IN
> Over the roof, through the coal cellar, or in through the front door disguised as a butler? Every route has a price. And check tonight's weather: in the fog nobody sees you, on holiday nights the houses are empty, under a full moon everything is lit up.
>
> REAL-TIME HEISTS
> Silent entry, the heist and the escape play out in real time. A dog barks, a watchman blows his whistle, a lock jams. You decide what to do — or pick the lock and crack the safe with your own hands.
>
> BUILD YOUR CREW
> A lookout, a locksmith, a driver, a smuggler... Each member has a skill and takes a cut. They even pull small jobs while you're away.
>
> FENCES AND THE BLACK MARKET
> Sell the silver candlesticks, pearl necklaces and jeweled daggers from your heists. One fence is safe but stingy, another generous but watched by the police. Haggling is up to you.
>
> SEE THE WORLD
> When Istanbul gets too small, Athens, Cairo, Paris and Monte Carlo await. The greatest prize of all: the Monte Carlo Casino.
>
> COLLECTIONS AND ACHIEVEMENTS
> The Byzantine crown, the pharaoh's mask, the princess's jewels... Complete sets, earn 27 achievements and give your character a new look.
>
> A NEW NIGHT EVERY DAY
> Daily rewards, nightly weather and notifications when a heist is done. The game never ends: security grows with every job, and every city has a new challenge.
>
> No internet required. No ads except optional rewarded ads.

**Keywords** (100): `thief,heist,robbery,istanbul,strategy,idle,tycoon,crew,museum,safe,1920s,gentleman,casino,simulation`

**Support URL:** `https://dilatilla00.github.io/kibar-hirsiz/support.html#en`
**Privacy Policy URL:** `https://dilatilla00.github.io/kibar-hirsiz/privacy.html`
