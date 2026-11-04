# เปิด BBP Center จากอินเทอร์เน็ตผ่าน ngrok

## สถานะวันที่ 2026-11-04

เปิด public endpoint บน NAS แล้วที่ `https://dauby-corliss-nonequatorial.ngrok-free.dev` ใช้ ngrok 3.39.13 ที่ pin digest และ restart อัตโนมัติ APP_ORIGIN เปลี่ยนเป็นชื่อนี้แล้ว DuckDNS/พอร์ต 3080 ภายใน LAN redirect ไปชื่อใหม่

ตรวจผ่าน public HTTPS URL: หน้าเว็บ/API 200, API หลังบ้านที่ไม่มี session 401, Google/Discord start ใช้ callback ของชื่อใหม่ พร้อม PKCE S256 และ Secure flow cookie ตรวจ records/key/private config เดิมยังอยู่ครบ และ SQLite integrity ผ่าน ระบบฟาร์มกับ Cloudflare Tunnel เดิมยังรันตามเดิม

เจ้าของยืนยันเพิ่ม callback ใหม่ใน Google/Discord แล้ว ตรวจ Google authorization อีกครั้งถึงหน้า Sign in โดยไม่มี redirect_uri_mismatch ตรวจ POST ของ origin จริงผ่านไปถึงการตรวจ input และ origin อื่นได้ 403 ยังไม่รายงานว่าได้ session จริงจากทุก provider บน public domain จนทดสอบล็อกอินจบ เบราว์เซอร์ครั้งแรกมี ngrok Visit Site interstitial ซึ่งผู้ใช้กดเองแล้วและยืนยันเห็นหน้า BBP Center

เจ้าของบันทึกข้อมูลร้านและเปิดร้านผ่านหลังบ้านแล้วก่อนย้าย origin ตรวจ /api/health enabled=true ค่าตั้งเหล่านี้ถูกคงไว้ ไม่มีการรับซองหรือเปลี่ยนยอดเงินระหว่างติดตั้ง สำรองก่อนเปลี่ยนอยู่ที่ `backups/before-public-*` รวม DB/key/ค่าตั้งเดิมและไฟล์ ngrok.env อ่านได้เฉพาะ root

## ชื่อเว็บและข้อจำกัด

ngrok Free ให้ dev domain ผูกกับบัญชีหนึ่งชื่อ ชื่อนี้ไม่เปลี่ยนเมื่อ restart agent แต่เลือกชื่อเองหรือใช้ DuckDNS เป็นชื่อสาธารณะในแผนฟรีไม่ได้ มีโควตา 1 GB และ 20,000 HTTP requests ต่อเดือน รวมทั้งหน้าคั่นสำหรับผู้เข้าชมด้วย browser ก่อนเข้าเว็บครั้งแรก ไม่ใช่โฮสต์ไม่มีโควตาหรือ SLA สำหรับร้าน

อ้างอิง [Free Plan Limits](https://ngrok.com/docs/pricing-limits/free-plan-limits), [Domains](https://ngrok.com/docs/gateway/domains), [Docker image ทางการ](https://ngrok.com/download/docker)

## 1. ผูกบัญชี ngrok

เจ้าของสมัคร/เข้า [ngrok Dashboard](https://dashboard.ngrok.com/signup) และนำ Your Authtoken ที่มีอยู่ใส่ในไฟล์ local `deploy/ngrok/.env` ตาม `.env.example` ไม่ส่ง token ลงแชตหรือ Git

คัดลอกไฟล์นี้ไป `deploy/ngrok/.env` บน NAS ผ่านช่องทางที่ปลอดภัย และตั้งเจ้าของ root กับ mode 600 token นี้ใช้เฉพาะ container tunnel ไม่ใส่ใน frontend หรือ server/.env image ทางการเขียน auth-config.yml ใน tmpfs /var/lib/ngrok ที่ owner UID 1000/GID 100, mode 0700 โดย root filesystem ยังคง read-only

## 2. เริ่ม tunnel และอ่านชื่อจริง

รันใน `STUDENT/BBP_CENTER` บน NAS หลังชุด HTTPS ปกติทำงานแล้ว:

```sh
docker compose -f compose.nas.ngrok.yaml up -d
```

ชุดนี้ใช้ Docker network `bbp-center_default` ที่มีอยู่ ส่งเฉพาะ HTTP ของ `web:3001` ออกไป ไม่มี host port, Docker socket, host network หรือ volume ข้อมูลร้านใน container tunnel ไม่เปลี่ยน container ของระบบฟาร์ม

อ่านเฉพาะ public HTTPS URL ที่ agent รายงานจาก log แล้วใส่ origin ที่ไม่มี path/ท้าย slash ใน `PUBLIC_ORIGIN` ของ `deploy/ngrok/.env` ห้ามคัด log ทั้งหมดหรือ token ลงเอกสาร

ช่วงนี้ origin ของเว็บยังเป็น LAN จึงใช้สำหรับตรวจการเชื่อมต่อและ endpoint สาธารณะก่อน ยังไม่ให้ลูกค้าเริ่ม OAuth หรือชำระเงิน

ngrok ปิด HTTP inspection/replay database และ local agent API ไว้ ไม่เปิดหน้า 4040 ทั้งบน host หรืออินเทอร์เน็ต

## 3. เปลี่ยน canonical origin

ก่อนเปลี่ยน ให้สำรอง SQLite ด้วย online backup คู่ `server/data/delivery.key` และ `server/.env` ไปโฟลเดอร์ root-only `backups/before-public-*` ห้ามคัดลอกฐานข้อมูล Windows มาทับ NAS

เปลี่ยน APP_ORIGIN ใน server/.env ให้ตรง PUBLIC_ORIGIN ที่ได้รับ แล้วใช้ Compose override:

```sh
docker compose --env-file .env --env-file deploy/ngrok/.env \
  -f compose.nas.https.yaml -f compose.nas.public.yaml \
  up -d --no-deps --force-recreate web https
```

หลังเปลี่ยน ต้องใช้สอง Compose files นี้สำหรับอัปเดต/recreate เว็บต่อไป `compose.nas.ngrok.yaml` เป็น tunnel แยกที่เริ่มอัตโนมัติหลัง Docker กลับมา

DuckDNS เดิมยังชี้ NAS ใน LAN และคงใบรับรองไว้ แต่ Caddy เปลี่ยนเป็น redirect ชั่วคราวไป PUBLIC_ORIGIN เพื่อให้ทุกเครื่องใช้ cookie/Origin เดียวกัน คนนอกต้องเข้าชื่อ ngrok จริง เพราะ DuckDNS ยังชี้ IP ภายใน

## 4. ตั้ง OAuth callback และตรวจจากภายนอก

เพิ่ม URI ต่อไปนี้ใน client เดิมของแต่ละ provider โดยแทน `PUBLIC_ORIGIN` ด้วย URL จริง เก็บ localhost และ LAN callbacks เดิมไว้ได้:

```text
Google:  PUBLIC_ORIGIN/api/auth/oauth/google/callback
Discord: PUBLIC_ORIGIN/api/auth/oauth/discord/callback
```

Google Authorized JavaScript origin ถ้ามีช่องนี้ ใช้ PUBLIC_ORIGIN การสร้าง tunnel ไม่ได้เพิ่ม callback ใน provider ให้อัตโนมัติ ต้องทดสอบ login จน `/api/auth/session` ได้บัญชีจริงด้วย

ตรวจผ่านอินเทอร์เน็ตภายนอก: หน้าเว็บและ assets, `/api/auth/providers`, flow cookie Secure/HttpOnly, callback origin, API หลังบ้านที่ไม่มี session ต้อง 401 และ TrueMoney ต้องสะท้อนการตั้งค่าร้านของเจ้าของ ไม่มีการกดรับซองจริงในการติดตั้ง

## กลับไปใช้ LAN

หยุดเฉพาะ tunnel ของร้าน:

```sh
docker compose -f compose.nas.ngrok.yaml stop
```

คืน server/.env จากสำรองก่อน public โดยไม่คืนฐานข้อมูลทับข้อมูลใหม่ จากนั้นรัน `docker compose -f compose.nas.https.yaml up -d --no-deps --force-recreate web https` ชุด HTTPS เดิมจะกลับมาใช้ DuckDNS ภายใน LAN
