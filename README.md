# 🏭 Real-Time Shop Floor Monitoring Dashboard

[![Deployment Status](https://img.shields.io/badge/Deployment-GCP%20Cloud%20Run-blue?style=for-the-badge&logo=google-cloud)](https://shopfloor-dashboard-105455385518.asia-southeast2.run.app/index.html)
[![Development Method](https://img.shields.io/badge/Metode-Spec--Driven%20AI%20Development-green?style=for-the-badge)](https://github.com/ucsaefudin-cell/ShopFloorDashboard)

## 📌 Deskripsi Proyek
**Real-Time Shop Floor Monitoring Dashboard** adalah solusi digitalisasi manufaktur yang dirancang untuk memberikan visibilitas penuh terhadap performa mesin produksi secara langsung. Sistem ini menjembatani kesenjangan informasi antara lantai produksi (*shop floor*) dan tim manajemen melalui visualisasi data yang presisi, responsif, dan adaptif terhadap kondisi operasional pabrik.

Dibangun dengan pendekatan **Spec-Driven Development** memanfaatkan **Generative AI (Prompt Architecture)**, proyek ini menunjukkan bagaimana integrasi antara logika bisnis manufaktur yang kompleks dan teknologi *cloud* modern dapat menghasilkan solusi IT yang efisien dan tepat guna.

---

## 🚀 Fitur Utama

### 1. TV Mode (Tampilan Lantai Produksi)
Mode tampilan yang dioptimalkan khusus untuk layar monitor TV di area pabrik (Zero-Touch Display).
- **Arsitektur Viewport-Fit:** Menggunakan satuan dinamis untuk memastikan tampilan 100% pas di layar tanpa perlu *scrolling*.
- **Pencocokan Pesanan Real-Time:** Logika otomatis yang hanya menampilkan perintah produksi aktif berdasarkan jadwal shift dan tanggal saat ini.
- **Tipografi Jumbo:** Visualisasi angka efisiensi dan target dengan font ukuran besar agar tetap terbaca jelas dari jarak 10 meter.

### 2. Event Handover Shift (Otomatisasi Transisi)
Fitur otomatisasi untuk mendukung moral dan keamanan kerja selama jendela waktu 10 menit pergantian regu:
- **Fase A (Selamat Tinggal & Kaizen):** Muncul 10 menit sebelum shift berakhir. Menampilkan ringkasan pencapaian regu dan instruksi kerapihan area (5S/Kaizen).
- **Fase B (Selamat Datang & Keamanan):** Muncul saat shift baru dimulai. Berisi pesan motivasi target dan pengingat penggunaan Alat Pelindung Diri (APD).
- **Pesan Berurutan:** Rotasi pesan otomatis setiap 10 detik untuk memastikan semua instruksi kebersihan dan keselamatan tersampaikan tanpa menumpuk di layar.

### 3. Supervisor Mode (Analitik & Kendali)
Antarmuka interaktif yang dirancang khusus untuk penggunaan di perangkat laptop atau PC monitor bagi level manajemen:
- **Kartu KPI Komprehensif:** Ringkasan Total Pesanan, Rata-rata Efisiensi, Total Target, dan Total Pencapaian.
- **Grafik Dinamis:** Grafik batang perbandingan efisiensi antar mesin dan grafik donat untuk memantau progres produksi harian.
- **Tabel Data Interaktif:** Daftar detail seluruh pesanan produksi untuk kebutuhan audit dan analisis mendalam.

---

## 🛠️ Spesifikasi Teknologi

- **Frontend:** HTML5, CSS3 (Modern Flexbox & Grid), JavaScript (ES6+).
- **Infrastruktur Cloud:** Google Cloud Platform (GCP).
  - **Cloud Run:** Untuk *deployment serverless* yang stabil dan mudah dikembangkan.
  - **Artifact Registry:** Untuk manajemen penyimpanan gambar kontainer aplikasi.
- **Metodologi Pengembangan:**
  - **Spec-Driven Development:** Pengembangan berbasis spesifikasi teknis terstruktur.
  - **Generative AI Prompt Architecture:** Pemanfaatan AI sebagai asisten pemrograman untuk mempercepat siklus pengembangan dan optimasi kode sistem.

---

## 🏗️ Arsitektur Deployment

Aplikasi ini telah di-*deploy* sepenuhnya di lingkungan **Google Cloud Platform (GCP)** dengan alur kerja profesional:
1. **Kode Sumber:** Dikelola melalui repositori GitHub.
2. **Kontainerisasi:** Proses pembangunan aplikasi menjadi gambar kontainer yang terisolasi.
3. **Penyebaran:** Di-hosting melalui **GCP Cloud Run** (Region: Asia-Southeast2) untuk memastikan akses cepat dan waktu operasional yang maksimal di wilayah Indonesia.

**Akses Live Demo:** [Kunjungi Portal Web](https://shopfloor-dashboard-105455385518.asia-southeast2.run.app/index.html)

---
