---
name: Montessori UI Integrity Sync
description: Backend model değişimlerinin tüm HTML panellerinde (Yönetim, Raporlar, Ana Panel) veri kaybı veya UI bozulması olmadan senkronize edilmesini sağlar.
---

# UI Sync & DOM Protection Process

Bu yetenek, projedeki çoklu dashboard yapısını korumak için şu kuralları uygular:

## 1. Veri Yapısı Senkronizasyonu
`Observation` veya `StaffNote` gibi Mongoose modellerine yeni bir alan (field) eklendiğinde:
- `app.js` rotalarını (özellikle `/area-summary` ve `/detail`) güncelle.
- Bu veriyi kullanan `reports.html`, `settings.html` ve `index.html` dosyalarını EŞ ZAMANLI olarak güncelle. Biri eksik kalırsa "Data not loading" hatası oluşur.

## 2. DOM Manipülasyon Güvenliği
Dashboard'lar üzerinde (özellikle Raporlar ekranında) dinamik içerik eklerken:
- **ASLA `innerHTML +=` kullanma.** Bu işlem, sayfadaki mevcut `Chart.js` nesnelerinin ve Event Listener'ların bellekteki bağını kopararak grafikleri bozar.
- Her zaman **`insertAdjacentHTML('beforeend', ...)`** kullan.

## 3. Chart.js State Koruması
- Grafik içeren bir alanı güncellerken eğer `chartInstance` varsa önce `.destroy()` yapıldığını ve sonra yeni verilerle baştan (Re-render) oluşturulduğunu kontrol et.

## 4. CSS Uyumluluğu
- Yeni eklenen dinamik elementlerin projenin "Modern & Premium" tasarım diline (Card yapıları, gölgeler, `var(--liberum-green)`) uygun olduğunu denetle.
