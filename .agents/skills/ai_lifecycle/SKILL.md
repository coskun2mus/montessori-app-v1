---
name: Montessori AI Lifecycle Management
description: Gemini prompt güncellemeleri, model değişimleri ve PDF raporlama süreçlerini güvenli ve test edilmiş bir şekilde yönetir.
---

# AI Lifecycle & Safety Process

Bu yetenek, projedeki Yapay Zeka özelliklerinin (Gözlem analizi ve Veli raporu) istikrarını korumak için her seferinde şu adımları uygula:

## 1. Prompt Güncelleme Kuralları
`config/prompts.js` üzerinde bir değişiklik yapıldığında:
- Değişikliği yapmadan önce `scripts/test_ai_synthesis.js` script'ini çalıştırarak mevcut durumun (Baseline) çalıştığından emin ol.
- Yeni prompt'un çıktı formatını (JSON veya Paragraf) bozmadığını test et.

## 2. PDF Güvenlik Kontrolü (TR Sanitize)
`reportService.js` veya PDF üretimini etkileyen herhangi bir kod değiştiğinde:
- PDFKit kütüphanesinin standart fontlarda Türkçe karakter (ş, ğ, ı, İ, ç, ö) hatası verip PDF'i kırmasını önlemek için tüm dinamik metinleri `trToEn()` fonksiyonundan geçirdiğinden emin ol.

## 3. Model & Kota Yönetimi
- Model değişimi (örn: 3.1 Pro -> 3 Flash) istendiğinde, `.env` dosyasındaki `GEMINI_API_KEY`'in tanımlı olduğunu kontrol et.
- Dakikalık istek sınırına (RPM) dikkat et. Çoklu fotoğraf yüklemelerinde toplu işlem (Batching) öner.

## 4. Test Prosedürü
Her AI değişiminden sonra şu komutu çalıştır ve çıktıyı doğrula:
```powershell
node scripts/test_ai_synthesis.js
```
