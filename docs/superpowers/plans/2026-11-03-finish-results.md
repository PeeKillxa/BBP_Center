# ผลเก็บงาน BBP Center — 2026-11-03

## งานที่เสร็จ

- ใช้ `safeNext` ร่วมกันทั้ง login และ wallet ปฏิเสธ backslash/control characters/URL ต่าง origin และหน้าสมาชิกที่วนกลับ
- ปุ่มเพิ่มลดเพชรแก้ค่าที่เกินเพดานให้อยู่ขอบเขตใกล้ที่สุด และขยับค่าที่ไม่ตรง step ไปขั้นถัดไปตามทิศทาง
- ข้อความผิดรูปแบบระบุเลขอารบิก 0–9; cap 250k ยืนยันแล้ว ราคาแยกสถานะรอยืนยัน
- ตัวเลือกด่วนอยู่ใน pricing config; Home และ DiamondPicker ใช้ package config เดิม
- เพิ่ม root error boundary พร้อมโหลดหน้าใหม่และรีเซ็ตเฉพาะข้อมูลเดโม
- แยกโหลดหน้าด้วย React.lazy/Suspense: entry JS จาก 613.02 kB เหลือ 485.76 kB ก่อน gzip; ไม่มีคำเตือน chunk เกิน 500 kB
- เพิ่ม `.gitattributes` และปรับ tracked text เป็น LF โดยเก็บโลโก้ PNG เดิม
- เพิ่มบริการ Node.js/SQLite พร้อมบัญชีจริง session cookie, wallet ledger และการเรียก `@fortune-inc/tw-voucher@1.1.2` ฝั่ง server
- เพิ่ม `/wallet/live` ใช้ project Card/Field/Button/tokens เดิม; แยกเงินจริงกับบัญชีเดโมอย่างชัดเจน

## ผลรันอัตโนมัติ

- Frontend Vitest: 61 tests ผ่าน (7 files)
- TypeScript + production build: ผ่าน
- Server Node tests: 7 tests ผ่าน ครอบคลุม auth/CSRF, ownership, duplicate/concurrency, timeout/late result, response validation, persistence/restart และแพ็กเกจ tw-voucher ที่ติดตั้งจริงผ่าน mock HTTP
- Server dependency installation `--ignore-scripts`: 1 dependency; audit ไม่พบช่องโหว่ขณะติดตั้ง
- ตรวจ source npm ที่ติดตั้งตรงกับพฤติกรรม upstream: ESM, ส่งเบอร์/รหัสซองไป proxy, คืน amount/code

## ขอบเขตหลักฐาน

Chromium ใน browser ของแอปตรวจแล้ว: `/wallet/live` โหลดพร้อมหน้า sign-in และไม่มี runtime error; จำนวน 300,000 กดลดเป็น 250,000, จำนวน 15,000 กดเพิ่มเป็น 20,000, เลขไทยแสดงข้อความ 0–9 และ demo login ที่ `next=/%5Cexample.com` กลับ `/account` โดยไม่มี error

เทสรับซองใช้ provider จำลองทั้งหมด ยังไม่ redeem ซองจริง เจ้าของเลือกตั้งเบอร์เองใน `server/.env` การทดสอบสำเร็จไม่ได้ยืนยันว่า proxy ภายนอกพร้อมใช้งาน

21st CLI search ติดข้อจำกัดยังไม่ login จึงใช้ design tokens และ components ที่มีใน repo ไม่มีการ generate/publish ผ่าน 21st

ผล E2E เต็มชุดของต้นแบบเดิมอยู่ในรายงานวันที่ 2026-11-01; ไม่ถือว่ารอบนี้ได้รันชุดนั้นซ้ำทั้งหมด Firefox/WebKit และ screen reader จริงยังไม่มีผลทดสอบ

การซื้อ จอง ฟาร์ม สลิป OAuth จริง และนโยบายที่ยังรอเจ้าของกำหนดเป็นงานระบบจริงช่วงต่อไป ไม่ได้ถูกเปิดใช้งานโดยบริการรับซองนี้
