# BBP Center server

Node.js 24+, SQLite บนดิสก์, session cookie, Google/Discord OAuth, TrueMoney, สินค้า/คำสั่งซื้อ, จอง 50%, บริการฟาร์ม และหลังบ้าน

คำแนะนำปัจจุบัน: [docs/LAUNCH.md](../docs/LAUNCH.md)

## เริ่มรัน

`npm ci` แล้วตั้ง `.env` (ไม่อยู่ใน Git) จาก `.env.example` โดยคงค่าที่ตั้งไว้แล้ว รัน `npm start` ที่ `127.0.0.1:3001`

Frontend: `cd ../app` → `npm ci` → `npm run build` Node จะเสิร์ฟไฟล์ `app/dist` ด้วย ระหว่างพัฒนาใช้ Vite port 5173 และ `APP_ORIGIN=http://localhost:5173`

## การเงินและสิทธิ์

ใช้ข้อมูลจริงใน SQLite เท่านั้น การซื้อและจองล็อกธุรกรรมพร้อมหัก ledger และเปลี่ยนสต็อก มี idempotency ฝั่ง server ยอดคงเหลือรวม ledger เครดิตเติมเงินเดิมกับ commerce ledger แบบ append-only จึงเก็บยอดเดิมโดยไม่ย้ายหรือลบข้อมูล

รับซองผ่าน `@fortune-inc/tw-voucher@1.1.2` ฝั่ง server ส่งเบอร์/รหัสซองไป proxy ของแพ็กเกจตาม [ซอร์ส upstream](https://github.com/Fortune-Inc/tw-voucher/blob/master/index.js) ไม่เก็บรหัสซองดิบหรือเบอร์ใน response/DB/log

ซองถูกล็อกข้ามผู้ใช้ก่อนเรียก provider หากไม่ทราบผลจะรอตรวจสอบและไม่ retry redeem อัตโนมัติ เจ้าของตรวจหลักฐานแล้วบันทึกยอดจริงได้ผ่านหลังบ้าน มี audit log และกันใช้ receipt ซ้ำ

เจ้าของร้านกำหนดด้วย `ADMIN_USER_IDS` ซึ่งเป็นรหัสบัญชีจาก `/account/profile` ไม่มีปุ่มหรือ API สลับสิทธิ์จาก client ข้อมูลส่งมอบเข้ารหัส AES-256-GCM ด้วย `data/delivery.key` และเปิดได้เฉพาะเจ้าของ order พร้อม audit log

OAuth ใช้ authorization code + PKCE + state ผูก cookie ใช้ครั้งเดียว Google ตรวจ signed ID token ไม่รวมบัญชีอัตโนมัติด้วยอีเมล ให้เจ้าของบัญชีกดเชื่อมเอง Session ปกติ HttpOnly/SameSite=Strict (Secure บน HTTPS) อายุ 12 ชั่วโมง รหัสผ่านบัญชีอีเมลเก็บ scrypt + salt

## API

- Public: `/api/health`, `/api/catalog`, `/api/farm/quote`, `/api/auth/providers`, `/api/auth/session`, OAuth start/callback, auth login/register
- Member: `/api/wallet`, `/api/topups/truemoney`, `/api/account`, `/api/purchase`, `/api/reservations`, `/api/reservations/settle`, `/api/farm/orders`, `/api/orders/:id/delivery`, logout/link provider
- Owner: `/api/admin`, `/api/admin/settings`, `/api/admin/listings`, `/api/admin/listings/archive`, `/api/admin/farm`, `/api/admin/payments/reconcile`

POST ตรวจ Origin ตรง APP_ORIGIN, JSON, body limit, rate limit; browser เปลี่ยนราคา ยอดเงิน หรือ role เองไม่ได้

การยกเลิก/คืนเงินที่ยังไม่มีนโยบายไม่ได้ทำอัตโนมัติ ไม่มีระบบตรวจสลิปธนาคารหรือรีเซ็ตรหัสผ่านอีเมลจนกว่าจะมี integration จริง งานฟาร์มประสานผ่านช่องทางที่เจ้าของตั้งค่า ไม่ขอข้อมูลเข้าเกมในแบบฟอร์มเว็บ

`npm test` ใช้ provider จำลอง/DB แยกใน test process ไม่มีการ redeem จริง ให้ build frontend ก่อน static-serving test

Production ต้องใช้ persistent disk, สำรอง DB และ delivery.key, HTTPS reverse proxy และ APP_ORIGIN ตรงโดเมนจริง อ่านรายละเอียดใน LAUNCH.md
