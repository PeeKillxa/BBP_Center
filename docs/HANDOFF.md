# BBP Center — current handoff (2026-11-04)

## สินค้าและสต็อก (อัปเดตล่าสุด)

เพิ่ม InventoryTools/ListingForm ใช้ร่วมในหน้าร้านและหลังบ้าน แอดมินเพิ่มหมวด อัปโหลดรูป เพิ่มสินค้าหลายบัญชี และเติมสต็อกจากการ์ดได้ ดู INVENTORY.md รูป WebP เก็บใน SQLite media บน persistent volume; server ใช้ sharp ตรวจและย่อรูป เพิ่ม categories/group_id แบบไม่ลบข้อมูลเก่า ข้อมูลบัญชีเข้ารหัสแยกเหมือนเดิม และ command fingerprint สำหรับ bulk เป็น hash เพื่อไม่บันทึกรหัสผ่านใน replay log

Deploy บน NAS ด้วยชุด Compose public แล้ว สำรองก่อนเปลี่ยนที่ backups/inventory-* ตรวจ integrity, primary keys ของข้อมูลเดิม และ delivery.key ยังตรงกัน container healthy, payments enabled=true และหน้า /maps สาธารณะเปิดได้ ไม่เพิ่มข้อมูลสินค้าทดสอบในร้านจริง เก็บ image ก่อนเปลี่ยนไว้ที่ bbp-center-nas:before-inventory สำหรับ rollback ตัวแอปโดยไม่ย้อนฐานข้อมูล

ระบบหน้าร้านถูกเปลี่ยนจากต้นแบบเป็น server-backed แล้ว ดู [LAUNCH.md](LAUNCH.md) สำหรับการตั้งบัญชีเจ้าของร้าน การใส่สินค้าจริง และการเปิดรับคำสั่งซื้อ

ติดตั้งจริงบน NAS ใน `\\nas\STUDENT\BBP_CENTER` แล้ว เว็บหลักปัจจุบัน `https://dauby-corliss-nonequatorial.ngrok-free.dev` ผ่าน ngrok บน NAS ชื่อ DuckDNS ภายใน LAN redirect มาที่ชื่อใหม่นี้ ใช้ compose.nas.https.yaml + compose.nas.public.yaml สำหรับ app/HTTPS และ compose.nas.ngrok.yaml สำหรับ tunnel ดู PUBLIC_ACCESS.md และ NAS_SETUP.md เจ้าของเปิดร้านผ่านหลังบ้านแล้ว ตรวจ /api/health enabled=true ไม่มีการรับซองจริงระหว่างติดตั้ง

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

เจ้าของสั่งเปิดเติมเงินจริงแล้ว เปิด TRUEMONEY_ENABLED บน NAS โดยคงเบอร์เดิมที่ผ่านการตรวจรูปแบบไว้ สำรอง DB/key/server.env ที่ backups/before-payments-* ก่อนเปลี่ยน ต่อมาเจ้าของกรอกข้อมูลร้านและเปิดรับรายการผ่าน /owner เอง จึงคงค่าเปิดไว้ ไม่มีการรับซองจริงระหว่างติดตั้ง เจ้าของเลือกบัญชีแอดมินอย่างชัดเจนแล้ว ตั้งสิทธิ์บน NAS โดยเก็บ admin IDs เดิมไว้

## เปิดจากภายนอก

ngrok public endpoint เชื่อมแล้วและ canonical origin เปลี่ยนตาม PUBLIC_ACCESS.md สำรองก่อนเปลี่ยนอยู่ใน backups/before-public-* ตรวจ records/key/private config เดิมยังอยู่ครบ เจ้าของเพิ่ม callbacks ทั้งสองแล้ว ตรวจ Google authorization ถึงหน้า Sign in โดยไม่มี redirect_uri_mismatch และเจ้าของยืนยันเห็นเว็บสาธารณะแล้ว ยังไม่อ้างว่าได้ session จริงบน public domain จากทุก provider ไม่ย้อนกลับไปใช้ Compose LAN อย่างเดียวโดยไม่ตั้งใจ

## โลโก้ปุ่มเข้าสู่ระบบ

เพิ่มโลโก้ Google/Discord จากไฟล์ทางการที่เก็บใน app/public/brand/oauth และใช้ icon prop ของ Button เดิมใน OAuthButtons ครอบคลุมทั้ง login/register และเชื่อมบัญชี spinner ยังแทนที่โลโก้ตอนเริ่ม OAuth ภาพเป็น decorative และรักษาสัดส่วน

Frontend tests 13 กรณี, production build และ 21st review ผ่าน deploy บน NAS แล้วด้วย Compose ชุด public เดิม ตรวจเว็บจริงว่าโลโก้ทั้งสองโหลดครบ แสดง 20×20 โดยรักษาสัดส่วน และดูได้ทั้งธีมสว่าง/มืด สำรอง DB/key ก่อนอัปเดตใน backups/oauth-logos-* ไม่มีการเปลี่ยน .env หรือ tunnel

การเชื่อม SSH รอบแรกคลาดเคลื่อนจากขั้นตอนรับรหัสผ่านใน Windows PTY เมื่อลอง Paramiko ส่ง password โดยตรงเข้าได้ตามปกติ ไม่ใช่ NAS ปิด SSH หรือเปลี่ยนรหัส ไม่ใส่รหัสผ่านใน Git หรือไฟล์ deploy

หลังได้สิทธิ์ deploy ให้ใช้ compose.nas.https.yaml ร่วม compose.nas.public.yaml และโหลด deploy/ngrok/.env เสมอ อย่าใช้ Compose LAN เพียงชุดเดียว การแก้นี้ไม่ต้องเปลี่ยน .env, DB, callback หรือ tunnel
