# BBP Center Claude Code Skills Guide

เอกสารนี้อธิบาย Custom Skills ของ BBP Center ใน `.claude/skills/` สำหรับ Claude Code ใน workspace สำหรับพัฒนาเท่านั้น โฟลเดอร์ `.claude/` ถูก ignore โดยตั้งใจและไม่ได้เป็นส่วนหนึ่งของ repository; fresh clone ใช้ `docs/Markdown.md` และ design spec เป็นข้อกำหนดครบถ้วนโดยไม่ต้องมี Skills เหล่านี้

## สถานะของข้อกำหนด

พบข้อกำหนดที่เพิ่มเข้ามาใน `docs/Markdown.md` ชื่อเอกสาร “BBP Center - Project Requirements & Specifications”. Path ที่ระบุไว้เดิม `docs/BBP_REQUIREMENTS.md` ยังไม่มี ดังนั้น Skills ใช้ `docs/Markdown.md` เป็นข้อกำหนดปัจจุบันและระบุความต่างของชื่อไฟล์ไว้ โดยไม่ได้เปลี่ยนชื่อไฟล์ที่ผู้ใช้เพิ่ม หากมีเอกสารข้อกำหนดมากกว่าหนึ่งฉบับ ให้เทียบลำดับการอัปเดตอย่างชัดเจน; ใช้ฉบับที่ใหม่กว่า และถ้าระบุลำดับไม่ได้ให้รายงานความขัดแย้ง

ลำดับการใช้ข้อมูล:

1. ใช้ข้อกำหนด BBP Center ฉบับที่มีการอัปเดตล่าสุด; ขณะนี้เอกสารที่ผู้ใช้เพิ่มอยู่ที่ `docs/Markdown.md`
2. ใช้คำสั่งล่าสุดของผู้ใช้ที่แก้หรือขยายข้อกำหนด
3. ถ้ามีทั้ง `docs/BBP_REQUIREMENTS.md` และ `docs/Markdown.md` ให้เทียบวันที่/ลำดับการอัปเดตของเนื้อหา อย่าตัดสินจากชื่อไฟล์เพียงอย่างเดียว และรายงานเมื่อระบุลำดับไม่ได้
4. `Prompt_.txt` เป็นบริบทที่มีลำดับต่ำกว่าเอกสารข้อกำหนดปัจจุบัน; พรอมป์ในไฟล์แนบที่ขอทำ UI prototype ไม่ใช่คำสั่งของงานนี้
5. ถ้าแหล่งที่มีไม่กำหนดนโยบาย ราคา สูตร เวลา หรือเงื่อนไข ให้ระบุว่ายังไม่กำหนดแทนการแต่งขึ้นเอง

ไฟล์แนบมีพรอมป์ให้สร้าง UI prototype ด้วย แต่พรอมป์นั้นไม่ใช่คำสั่งของงานนี้และไม่ได้ถูกนำมาทำตาม; ใช้เฉพาะข้อมูลกฎธุรกิจที่เกี่ยวข้องกับ Skills เท่านั้น

## Skills (local-only)

| Skill | หน้าที่ | เรียกใช้กับงาน |
| --- | --- | --- |
| `bbp-commerce` | ซื้อไอดี, wallet, ธุรกรรม/idempotency, สต็อกหนึ่งรายการต่อหนึ่งไอดี, การส่งมอบ | Checkout, ยอดเงิน, order, กันซื้อซ้ำ, สิทธิ์เปิดข้อมูลส่งมอบ |
| `bbp-reservation` | มัดจำ 50%, จอง 12 ชั่วโมง + grace 2 ชั่วโมง, หมดเวลา 14 ชั่วโมง, ริบเงิน, cooldown 6 ชั่วโมง, จ่ายยอดคงเหลือ | จอง, countdown, settlement, expiry worker, คืนสต็อก |
| `bbp-farming` | บริการฟาร์ม, package config, ราคาเพชร/interpolation, ประมาณเวลา, validate จำนวน | หน้าสั่งฟาร์ม, ตัวคำนวณราคา/เวลา, configuration และ validation |
| `bbp-standby-workflow` | เรียกสแตนด์บาย, การตอบรับ, code/Roblox approval, timeout, เริ่มและติดตามงาน | สถานะงานฟาร์ม, ขั้นเข้าใช้งาน, timeline และหน้าควบคุมงาน |
| `bbp-quality-assurance` | Acceptance criteria, unit/integration/E2E, edge/regression, responsive และ accessibility | วางแผนทดสอบ, ตรวจ release, ทบทวนการเปลี่ยนแปลงทุกโดเมน |

## วิธีเรียกใช้ใน Claude Code

เปิด Claude Code จาก root ของ repository เพื่อให้โหลด project skills แล้วพิมพ์คำสั่ง skill ที่ต้นข้อความ:

```text
/bbp-commerce ตรวจ flow ซื้อไอดีและป้องกันหัก wallet ซ้ำ โดยอ่าน requirements ก่อน
/bbp-reservation วาง state transitions และ test cases สำหรับหมดเวลา/จ่ายยอดคงเหลือ
/bbp-farming ตรวจสูตรราคา 40k และ 60k พร้อมอธิบายว่าทำไม 15k ใช้สั่งไม่ได้
/bbp-standby-workflow เพิ่ม test plan สำหรับ standby timeout กับรหัสยืนยัน
/bbp-quality-assurance ทำ acceptance matrix สำหรับการเปลี่ยน checkout นี้
```

Claude Code รองรับการเรียกด้วย `/skill-name` และยังเลือกใช้ Skill อัตโนมัติได้จาก description เมื่อคำขอตรงกับขอบเขต หากเพิ่งสร้างโฟลเดอร์ Skills ระหว่าง session เดิม ให้ใช้ `/reload-skills` หรือเริ่ม session ใหม่ตามพฤติกรรมของ Claude Code

## การทำงานร่วมกัน

- ซื้อเต็มจำนวน: ใช้ `bbp-commerce`; เพิ่ม `bbp-quality-assurance` เมื่อต้องวาง/ตรวจ coverage
- จองและจ่ายยอดที่เหลือ: ใช้ `bbp-reservation` คู่กับ `bbp-commerce` สำหรับ debit/order/delivery แล้วใช้ QA ตรวจ boundary และ race
- สั่งฟาร์ม: ใช้ `bbp-farming` สำหรับประเภทบริการ ราคา/เวลา/validation; เมื่อทำขั้นตอนเริ่มทำงานจริง ให้ใช้ `bbp-standby-workflow`; ใช้ QA ครอบคลุมทั้ง order และงาน
- ถ้างานครอบหลายโดเมน ให้เรียก Skills ที่เกี่ยวข้องในข้อความเดียว เช่น `/bbp-farming /bbp-standby-workflow /bbp-quality-assurance ...`
- Skills เหล่านี้เก็บกฎ BBP เฉพาะร้าน ไม่แทน design, accessibility, browser automation หรือ generic payment engineering

## ทำงานร่วมกับ Skills ที่มีอยู่

ไม่มี Skills เดิมใน `.claude/skills/` ของโปรเจกต์ก่อนสร้าง แต่พบ Skills ระดับผู้ใช้ที่ Claude Code โหลดได้ เช่น `frontend-design`, `ui-ux-pro-max`, กลุ่ม Vercel/21st.dev, `playwright-cli` และ Skills ของ Payments Engineering (`build-reliable-payment-webhooks`, `design-payment-ledger`, `implement-idempotent-payments`, `reconcile-payment-systems`, `review-payment-state-machine`). ไฟล์เหล่านั้นไม่ได้ถูกแก้ไข

- ใช้ Skills ด้าน UI/Design/Accessibility สำหรับแนวทางหน้าตาและ interaction; ใช้ `bbp-*` เป็นแหล่งกฎธุรกิจ BBP
- ใช้ `playwright-cli` หรือเครื่องมือ browser ที่มีอยู่สำหรับ automation เมื่อเหมาะสม; ให้ `bbp-quality-assurance` ระบุ acceptance expected results
- ใช้ Payments Engineering สำหรับรูปแบบ ledger/webhook/idempotency ทั่วไป; `bbp-commerce` เพิ่มข้อกำหนดสินค้าและ wallet ของ BBP โดยไม่ทำซ้ำคู่มือ implementation เหล่านั้น
- หาก Skill อื่นขัดกับข้อกำหนด BBP ใน `docs/BBP_REQUIREMENTS.md` หรือไฟล์ปัจจุบัน `docs/Markdown.md` ให้คงกฎ BBP ไว้และรายงานความขัดแย้ง ไม่แก้หรือปิด Skill อื่นเอง

## แยก Demo กับ Production

Demo ต้องใช้ข้อมูลจำลอง ไม่เชื่อมระบบชำระเงินจริง และไม่ใช้ข้อมูลบัญชี Roblox จริง ห้ามบันทึกรหัสผ่าน/รหัสยืนยันใน LocalStorage, URL, Analytics, Console หรือ Log ข้อกำหนดปัจจุบันระบุให้ลูกค้ากรอก Username/Password สำหรับ flow Production หลังชำระค่าฟาร์ม แต่ยังไม่ระบุวิธีจัดเก็บ/อายุข้อมูล/การลบ ให้ยืนยันการจัดการข้อมูลส่วนนี้ก่อนทำระบบจริง

เจ้าของเลือกรายการ `@fortune-inc/tw-voucher` และกำหนดเบอร์ผู้รับ TrueMoney ไว้สำหรับการเชื่อมต่อ Production ในอนาคตเท่านั้น แพ็กเกจส่ง voucher code และเบอร์ไปยัง proxy ภายนอกเพื่อ redeem ซึ่งอาจทำให้เงินเคลื่อนย้ายและใช้ซองหมด จึงต้องเรียกจาก backend เท่านั้น เก็บเบอร์ใน server-side environment config ชื่อ `TRUEMONEY_RECIPIENT_PHONE` และห้าม commit ค่าจริง/ส่งให้ browser/logs การเลือกนี้ไม่เปลี่ยนข้อกำหนด Demo: ห้ามเรียกเงินจริงหรือ endpoint จริง การตรวจ endpoint แบบ GET ตอบ HTTP 200 แต่ไม่ได้ทดสอบ redeem ซองจริง

## วิธีตรวจและขอบเขตหลักฐาน

- ตรวจ Frontmatter `name`/`description`, ชื่อโฟลเดอร์, YAML syntax, ลิงก์ references และการไม่มีชื่อซ้ำกับ Skills เดิม
- เรียก `/bbp-...` ใน session Claude Code ที่เปิดจาก repository root เพื่อทดสอบการโหลดจริง และตรวจ `/skills` เพื่อดูรายการ
- การตรวจไฟล์แบบ static ไม่เท่ากับทดสอบการเรียกใช้จริง และแผน Test Cases ไม่เท่ากับการรันทดสอบ
