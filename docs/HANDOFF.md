# BBP Center — current handoff (2026-11-04)

ระบบหน้าร้านถูกเปลี่ยนจากต้นแบบเป็น server-backed แล้ว ดู [LAUNCH.md](LAUNCH.md) สำหรับการตั้งบัญชีเจ้าของร้าน การใส่สินค้าจริง และการเปิดรับคำสั่งซื้อ

ติดตั้งจริงบน NAS ใน `\\nas\STUDENT\BBP_CENTER` แล้ว ใช้ `compose.nas.https.yaml` และ `https://bbpcenter.duckdns.org` โดย DNS ชี้ IP ภายในตามที่เจ้าของเลือก จึงใช้ได้เฉพาะ LAN ใบรับรองผ่านการตรวจจริง, Google/Discord credentials อยู่บน NAS แล้ว และตั้ง TRUEMONEY_ENABLED=true แล้ว แต่ยังรับเงินไม่ได้จนกว่าจะมี contactUrl/terms และเปิดร้าน ดู [NAS_SETUP.md](NAS_SETUP.md) และ [OAUTH_SETUP.md](OAUTH_SETUP.md)

เจ้าของเพิ่ม HTTPS callback แล้วและยืนยัน Google เข้าได้หลายบัญชี บัญชีอีเมลเดิมที่มี Discord identity ต้องเข้าผ่าน Discord ก่อนแล้วเชื่อม Google ที่ /account/profile ไม่รวมบัญชีด้วยอีเมลอัตโนมัติ หน้า wallet แสดง oauth_error ก่อน session gate แล้ว

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

ไม่เติมสินค้า ภาพ รีวิว หรือยอดขายให้เอง ตั้ง ADMIN_USER_IDS บน NAS ให้บัญชีเจ้าของที่เลือกแล้ว เจ้าของแก้ข้อมูลร้าน/เงื่อนไขและเพิ่มสินค้าจริงผ่าน `/owner` ก่อนเปิดรับรายการ

ยังต้องให้เจ้าของตรวจ OAuth บนโดเมนจริง ทดสอบซองจริง และตั้งโฮสต์/HTTPS/persistent disk ก่อนรับลูกค้า ไม่มีนโยบายยกเลิก/คืนเงินที่แต่งขึ้นเอง ระบบไม่คืน/หักเงินเพิ่มจากการเปลี่ยนสถานะงานฟาร์ม

เอกสารใน `docs/superpowers/` ก่อนรอบเปิดจริงเป็นประวัติการพัฒนาต้นแบบ ไม่ใช่สถานะ runtime ปัจจุบัน

## ระบบเติมเงินวันที่ 2026-11-04

เจ้าของสั่งเปิดเติมเงินจริงแล้ว เปิด TRUEMONEY_ENABLED บน NAS โดยคงเบอร์เดิมที่ผ่านการตรวจรูปแบบไว้ สำรอง DB/key/server.env ที่ backups/before-payments-* ก่อนเปลี่ยน ยังไม่ได้รับซองจริง และ shop_settings ยังว่าง จึงคง gate ปิดร้าน/รับเงินไว้ เจ้าของให้เว้นการกรอกลิงก์ติดต่อ/เงื่อนไขไว้ก่อนและจะกรอกเองผ่าน /owner ภายหลัง ไม่แต่งนโยบายให้เองหรือข้าม gate เจ้าของเลือกบัญชีแอดมินอย่างชัดเจนแล้ว ตั้งสิทธิ์บน NAS โดยเก็บ admin IDs เดิมไว้
