# BBP Center — current handoff (2026-11-03)

ระบบหน้าร้านถูกเปลี่ยนจากต้นแบบเป็น server-backed แล้ว ดู [LAUNCH.md](LAUNCH.md) สำหรับการตั้งบัญชีเจ้าของร้าน การใส่สินค้าจริง และการเปิดรับคำสั่งซื้อ

## โครงสร้าง

- `app/src/production`: หน้าร้าน บัญชี wallet หลังบ้าน และ API client
- `app/src/components`: ส่วนประกอบร่วมและปุ่ม OAuth
- `app/src/store/theme.ts`: เก็บเฉพาะธีม ไม่มี wallet/client auth state ถาวร
- `server/src/api.mjs`: HTTP routes, session auth, Origin/body/rate guards
- `server/src/oauth.mjs`, `sessions.mjs`: Google/Discord code flow, PKCE, state, token validation และ session
- `server/src/payments.mjs`: ตารางบัญชี/ledger เติมเงินเดิมและการล็อกซอง/idempotency
- `server/src/commerce.mjs`: catalog, transactions ซื้อ/จอง/farm, expiry, ledger การใช้เงิน, admin authorization, encrypted delivery, reconciliation และ audit
- `server/src/runtime.mjs`: key file และ static SPA serving
- `server/test`: automated regression tests แยก DB/ผู้ให้บริการจากระบบจริง

## สิ่งที่ต้องคงไว้

DB และ `delivery.key` เป็นข้อมูลจริง ห้ามลบตอน deploy หรือ commit เข้า Git คง `.env` ของเจ้าของไว้ ไม่ย้ายยอดเงินจริงจาก SQLite ไป localStorage

ซื้อ/จอง/ชำระคงเหลือ/สั่งฟาร์มต้องผ่าน DB transaction และ idempotency เสมอ ห้ามให้ client ระบุเจ้าของรายการหรือสิทธิ์ admin จาก body

รับซองที่ผลไม่แน่นอนต้องไม่ redeem ซ้ำเอง เจ้าของตรวจยอดรับจริงก่อน reconciliation และมี audit trail การอ่านข้อมูลส่งมอบต้องตรวจ owner ของ order ที่ server

## ขอบเขตการเปิดจริง

ไม่เติมสินค้า ภาพ รีวิว หรือยอดขายให้เอง ต้องตั้ง `ADMIN_USER_IDS` และข้อมูลร้าน/เงื่อนไข จากนั้นเพิ่มสินค้าจริงผ่าน `/owner` และเปิดรับรายการ

ยังต้องให้เจ้าของตรวจ OAuth บนโดเมนจริง ทดสอบซองจริง และตั้งโฮสต์/HTTPS/persistent disk ก่อนรับลูกค้า ไม่มีนโยบายยกเลิก/คืนเงินที่แต่งขึ้นเอง ระบบไม่คืน/หักเงินเพิ่มจากการเปลี่ยนสถานะงานฟาร์ม

เอกสารใน `docs/superpowers/` ก่อนรอบเปิดจริงเป็นประวัติการพัฒนาต้นแบบ ไม่ใช่สถานะ runtime ปัจจุบัน
