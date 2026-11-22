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
> GERÇEK ZAMANLI SOYGUNLAR
> Sessiz giriş, soygun ve kaçış gerçek zamanlı ilerler. Yolda bir köpek havlar, bekçi düdük çalar, kasanın şifresi tutmaz. Ne yapacağına sen karar verirsin: risk mi alırsın, geri mi çekilirsin?
>
> EKİBİNİ KUR
> Gözcü, kilitçi, şoför, kaçakçı... Her ekip üyesinin kendi yeteneği ve kendi payı var. Onları eğit, birlikte büyüyün.
>
> YETENEKLER VE ALETLER
> Maymuncuktan sahte kimliğe, onlarca alet ve yetenekle her yeni kapıyı aç. Ustalık sistemiyle sınırları aş.
>
> DÜNYAYA AÇIL
> İstanbul sana dar gelince Atina, Kahire, Paris ve Monte Carlo seni bekler. En büyük vurgun: Monte Carlo kumarhanesi.
>
> EFSANE KOLEKSİYONU
> Bizans tacı, firavun maskesi, prenses mücevherleri... Setleri tamamla, kalıcı güçler kazan.
>
> SONU OLMAYAN BİR YOLCULUK
> Oyun bitmez: güvenlik her soygunla artar, her şehirde yeni bir meydan okuma vardır.
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
| Telif hakkı | 2026 (senin adın) |
| Fiyat | Ücretsiz (ya da sen nasıl istersen) |

## 5. Ekran görüntüleri

`ios/store/screenshots-6.9/` klasöründe 8 adet 2868×1320 yatay görüntü var (sırayla yükle; 7. başarımlar, 8. soygun sırasında bir olay). Bunları **iPhone 6.9" ekran** bölümüne yükle. Apple bu boyuttan diğer iPhone boyutlarını kendisi türetir.

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

## Game Center (kodu hazır, ücretli hesap gerekir)

Oyunda 27 başarım var. Oyuncu Game Center'a girmişse başarımlar ve iki sıralama oraya da gönderilir. Game Center'a girmemiş oyuncular için oyun her şeyi kendi içinde göstermeye devam eder.

Ücretsiz Apple hesabıyla Game Center kullanılamıyor. Bu yüzden yetenek (capability) şimdilik projeye eklenmedi; eklenirse ücretsiz hesapla telefona kurulum bozulur. Geliştirici hesabın onaylanınca:

1. Xcode'da **KibarHirsiz → Signing & Capabilities → + Capability → Game Center** ekle.
2. App Store Connect'te uygulamanın **Hizmetler (Services) → Game Center** bölümüne gir.
3. **Sıralamalar (Leaderboards)** bölümünde iki "Klasik, en yüksek puan" sıralaması oluştur:

| Kimlik | Ad | Biçim |
|---|---|---|
| `kh_loot` | Toplam ganimet | Tam sayı, büyük olan önde |
| `kh_level` | Seviye | Tam sayı, büyük olan önde |

4. **Başarımlar (Achievements)** bölümünde aşağıdakileri **aynı kimliklerle** ekle. Toplam 895 puan (Apple'ın sınırı 1000). Her biri için 512×512 bir görsel gerekir.

| Kimlik | Ad | Açıklama | Puan |
|---|---|---|---|
| `kh_ilk_is` | İlk iş | İlk soygununu başarıyla bitir | 10 |
| `kh_is_25` | Mahallenin gölgesi | 25 başarılı iş yap | 25 |
| `kh_is_100` | Şehrin kâbusu | 100 başarılı iş yap | 50 |
| `kh_is_500` | Yaşayan efsane | 500 başarılı iş yap | 100 |
| `kh_seri_5` | Pürüzsüz | Üst üste 5 işi başarıyla bitir | 10 |
| `kh_seri_15` | Hayalet | Üst üste 15 işi başarıyla bitir | 50 |
| `kh_ganimet_1k` | İlk birikim | Toplam 1.000 lira ganimet topla | 10 |
| `kh_ganimet_100k` | Köşeyi döndün | Toplam 100.000 lira ganimet topla | 25 |
| `kh_ganimet_10m` | Servet | Toplam 10 milyon lira ganimet topla | 100 |
| `kh_sv_5` | Çırak | 5. seviyeye ulaş | 10 |
| `kh_sv_15` | Kalfa | 15. seviyeye ulaş | 25 |
| `kh_sv_30` | Usta | 30. seviyeye ulaş | 50 |
| `kh_sehir_2` | Pasaport | İstanbul'dan başka bir şehrin yolunu aç | 25 |
| `kh_sehir_hepsi` | Dünya turu | Bütün şehirlerin yolunu aç | 100 |
| `kh_ekip_1` | Yalnız kurt değilsin | Ekibine ilk üyeyi al | 10 |
| `kh_ekip_3` | Tam kadro | Ekibini 3 kişiye çıkar | 25 |
| `kh_ekip_usta` | Usta çırak | Bir ekip üyesini en üst seviyeye kadar eğit | 25 |
| `kh_kesif_20` | Meraklı göz | 20 keşif yap | 10 |
| `kh_yetenek_10` | Çok yönlü | 10 yetenek öğren | 25 |
| `kh_olay_25` | Soğukkanlı | Soygun sırasında 25 beklenmedik olayla başa çık | 25 |
| `kh_muze_1` | Müze faresi | Bir müzeyi ya da antikacıyı soy | 25 |
| `kh_set_1` | Koleksiyoncu | Bir koleksiyon setini tamamla | 25 |
| `kh_efsane_1` | Efsanevi iş | İlk efsanevi işini başar | 50 |
| `kh_gunluk_7` | Sadık müdavim | Günlük ödülü 7 gün üst üste al | 25 |
| `kh_mini_10` | Altın parmaklar | Kilit ve kasa açmayı 10 kez kendin başar | 25 |
| `kh_yatakci_10` | Tüccar ruhlu | Yatakçılara 10 eşya sat | 25 |
| `kh_yakalandi` | Kodese merhaba | İlk kez yakalan. Olur böyle şeyler | 10 |

5. Uygulama sürümünün sayfasında **Game Center** kutusunu işaretle ve sıralama ile başarımları sürüme ekle.

Kimlikler `eras/1920/content.js` içindeki `achievements` listesinden gelir (`kh_` + id). Yeni başarım eklersen App Store Connect'e de aynı kimlikle eklemelisin.
