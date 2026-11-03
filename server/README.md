# BBP Center payment service

Node.js 24+ ใช้ SQLite บนดิสก์และ `@fortune-inc/tw-voucher@1.1.2` ฝั่งเซิร์ฟเวอร์เท่านั้น

## เริ่มใช้งาน

1. ใน `server/` รัน `npm ci` แล้วคัดลอก `.env.example` เป็น `.env`
2. ใส่เบอร์ผู้รับใน `TRUEMONEY_RECIPIENT_PHONE` และตั้ง `TRUEMONEY_ENABLED=true` เมื่อพร้อมรับเงินจริง
3. รัน `npm start` (ฟังเฉพาะ `127.0.0.1:3001`)
4. เปิดอีก terminal ใน `app/` รัน `npm run dev` แล้วเปิด `http://localhost:5173/wallet/live`
5. สมัครบัญชีกระเป๋าเงินจริง (แยกจากบัญชีเดโม) แล้วส่งซองผ่านแบบฟอร์ม ยอดอ้างอิงผล redeem จาก provider

`.env` และ `data/` ถูก ignore ห้ามใช้ตัวแปร `VITE_*` เก็บเบอร์/secret ไม่ต้องใส่เบอร์ใน frontend ผู้ใช้เป็นผู้ตั้งเบอร์เอง

API ส่งรหัสซองกับเบอร์ผู้รับให้ proxy ของแพ็กเกจตาม [ซอร์ส upstream](https://github.com/Fortune-Inc/tw-voucher/blob/master/index.js) การเรียกนี้ใช้ซองและเคลื่อนเงินจริง ไม่ใช่การตรวจแบบ read-only

## ขอบเขตปัจจุบัน

- บัญชีจริงใช้ scrypt พร้อม salt เฉพาะบัญชี; session token อยู่ใน cookie HttpOnly/SameSite=Strict เก็บเฉพาะ hash ฝั่ง DB อายุ 12 ชั่วโมง
- `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/wallet`, `/api/topups/truemoney`, `/api/health`
- POST ต้องมี Origin ตรงกับ `APP_ORIGIN` และ JSON; rate limit 20 POST/นาที/IP สำหรับ process เดียว
- ยอดเงินจริงอยู่ใน SQLite และแยกจาก localStorage ของเดโม ไม่เปลี่ยนเมื่อกด Demo Controls/รีเซ็ตเดโม
- สินค้า จอง ฟาร์ม และการเติมผ่านสลิปยังเป็นเดโม **ยอดเงินจริงยังใช้ซื้อไม่ได้** จึงไม่ควรชวนลูกค้าเติมก่อนร้านมีขั้นตอนรองรับยอดดังกล่าว
- ยังไม่มีอีเมลยืนยัน/รีเซ็ตรหัสผ่านจริง หรือหน้าแอดมินสำหรับเงินจริง บัญชีนี้ไม่เชื่อม Google/Discord

## กันรับซ้ำและผลไม่แน่นอน

ส่ง `Idempotency-Key` เดิมสำหรับ retry เดิม โค้ดซองและ URL ของซองเดียวกันถูก canonicalize ก่อน hash; unique constraint ล็อกซองข้ามผู้ใช้ก่อนเรียก provider ไม่เก็บรหัสซองดิบ เบอร์ดิบ หรือชื่อเจ้าของซองใน DB/response/log

ผลสำเร็จเพิ่ม ledger และเปลี่ยนสถานะใน transaction เดียว ตรวจยอดเป็นจำนวนเต็มสตางค์จาก provider เท่านั้น ไม่รับจำนวนเงินหรือ user id จาก client

Timeout, error จาก provider, response ผิดรูปแบบ หรือ process ล่มระหว่าง redeem จะเป็น `needs-review` และไม่เรียก redeem ซ้ำอัตโนมัติ การตรวจย้อนหลังต้องให้เจ้าของตรวจหลักฐานการรับเงินจริงกับผู้ให้บริการโดยใช้เลขรายการและเวลารายการก่อนปรับยอด ไม่มี API ตรวจย้อนหลังที่สมมติขึ้น และยังไม่มี UI/คำสั่งปรับยอดเอง

การส่ง key ใหม่/เปลี่ยนบัญชีไม่ปลดล็อกซองที่กำลังตรวจหรือรอตรวจสอบ ใช้ server process เดียวต่อฐานข้อมูล (ขั้นเริ่ม process เปลี่ยน processing ที่ค้างเป็น needs-review)

## การทดสอบและ deployment

`npm test` ใช้ provider จำลองเท่านั้น ไม่ส่งซองจริง รวม HTTP auth/CSRF, concurrent retry, duplicate cross-user, timeout/late result, malformed amount และ restart

Production ต้องตั้ง `NODE_ENV=production`, `APP_ORIGIN=https://โดเมนจริง` แล้วตั้ง reverse proxy ให้ `/api/*` ไป loopback port 3001 พร้อมเสิร์ฟ `app/dist` และ SPA fallback อย่าเปิดพอร์ต DB/API แยกสู่ public และอย่า log request body, cookie, voucher หรือ password

สำรอง SQLite ด้วยวิธี SQLite online backup หรือหยุด process ก่อนคัดลอก DB (รวม WAL ตามวิธีสำรองที่เลือก) เก็บสำรองไว้ในพื้นที่จำกัดสิทธิ์ ห้าม commit ข้อมูลจริง การ deploy แบบ ephemeral filesystem จะทำข้อมูลหาย ต้องใช้ persistent disk

การทดสอบครั้งนี้ยังไม่ยืนยันการ redeem จริงหรือความพร้อมของ proxy ภายนอก ต้องตั้งเบอร์และทดสอบซองจริงโดยเจ้าของก่อนเปิดบริการ
