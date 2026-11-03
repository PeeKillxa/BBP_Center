# BBP Center frontend

React + TypeScript + Tailwind + React Router ใช้ session และข้อมูลจริงจาก Node server ไม่มีสินค้า รีวิว ยอดเงิน หรือแผงสิทธิ์จำลอง

`npm ci`, `npm run dev` เปิด `http://localhost:5173` พร้อม backend ที่ port 3001 ผ่าน Vite proxy

`npm test` รัน unit tests ที่ไม่อยู่ในหน้าเว็บ · `npm run build` ตรวจ TypeScript และสร้าง `dist/` สำหรับ Node server

หน้าใช้งาน: `/`, `/maps`, `/listing/:id`, `/farm`, `/login`, `/register`, `/wallet`, `/account`, `/owner`, `/help`

Source หลัก: `src/production/` · ส่วนประกอบหน้าจอ: `src/components/` · ธีม: `src/store/theme.ts` (localStorage เก็บเฉพาะธีม)

โลโก้ `public/brand/bbp-center-logo.png` เป็นไฟล์เจ้าของร้าน ไม่ถูกแก้ไข

ดู [คู่มือเปิดร้าน](../docs/LAUNCH.md) และ [OAuth](../docs/OAUTH_SETUP.md)
