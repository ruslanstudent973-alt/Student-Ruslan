# YUYU Shop — Onlayn Do'kon (Vercel + MongoDB Atlas)

YUYU Shop — React (Vite) frontend, Express Serverless API va MongoDB Atlas bazasida ishlovchi zamonaviy onlayn do'kon platformasi.

---

## Vercel (Hobby tarif + GitHub) orqali Deploy Qilish

### 1. Kodni GitHub repozitoriysiga yuklash
Loyihani GitHub akkauntingizdagi yangi yoki mavjud repozitoriyga push qiling.

### 2. Vercel'da loyihani import qilish
1. [vercel.com](https://vercel.com) saytiga kiring va **Add New → Project** tugmasini bosing.
2. GitHub repozitoriyingizni tanlang (**Import**).
3. Framework sozlamalari `vercel.json` orqali avtomatik aniqlanadi:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 3. Environment Variables (Muhit o'zgaruvchilari) kiritish
Deploy qilishdan oldin **Environment Variables** bo'limiga quyidagilarni qo'shing (Production, Preview va Development uchun):

| Kalit | Majburiymi? | Tavsif |
| :--- | :--- | :--- |
| `MONGODB_URI` | **Ha** | MongoDB Atlas ulanish satri (`mongodb+srv://...`) |
| `MONGODB_DB` | Ixtiyoriy | Baza nomi (standart: `saytim`) |
| `TELEGRAM_TOKEN` | Ixtiyoriy | Buyurtma bildirishnomalari uchun Telegram bot tokeni |
| `VITE_REF_LINK` | Ixtiyoriy | Referal dasturi uchun asosiy havola |

### 4. MongoDB Atlas tarmoq ruxsati (Juda muhim!)
Vercel Serverless funksiyalari dinamik IP manzillardan ulanadi. Shu sababli MongoDB Atlas panelida:
1. **Security → Network Access** bo'limiga kiring.
2. **Add IP Address** tugmasini bosing.
3. **Allow Access from Anywhere** (`0.0.0.0/0`) ni tanlab **Confirm** qiling.

### 5. Deploy va Tekshiruv
**Deploy** tugmasini bosing. Deploy yakunlangach:
- Saytingizni oching: `https://<loyiha-nomi>.vercel.app`
- Backend va MongoDB ulanishini tekshiring: `https://<loyiha-nomi>.vercel.app/api/health`
  - Muvaffaqiyatli javobda `"status": "ok"` va `"mongoConnected": true` qaytishi kerak.

---

## Media Yuklash va Vercel 4.5 MB Limiti
- Barcha rasm yuklash nuqtalari (mahsulotlar, bannerlar, profil avatari, to'lov/VIP/hamkorlik cheklari va maxsus buyurtmalar) brauzerda avtomatik siqiladi va Vercel'ning 4.5 MB so'rov limitidan xavfsiz o'tadi.
- Video fayllar uchun bevosita yuklash limiti **2.8 MB** (Base64 kengayishi bilan ~3.7 MB). Katta videolar uchun tashqi `.mp4` havola (URL) kiritish tavsiya etiladi.

---

## Mahalliy (Local) Ishga Tushirish

```bash
npm install
npm run dev
```

Ilova `http://localhost:3000` manzilida ishga tushadi.
