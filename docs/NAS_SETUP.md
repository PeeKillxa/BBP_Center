# BBP Center บน NAS

ตำแหน่งที่เจ้าของระบุ: `\\nas\STUDENT\BBP_CENTER`

เครื่องที่ตรวจจริง: OpenMediaVault 8 / Debian 13, x86_64, i5-9400, RAM 16GB มี Docker และ Compose แล้ว

ติดตั้งครั้งแรกวันที่ 2026-11-03 โดยนำสำเนา SQLite ที่สร้างด้วย online backup จากเครื่องเจ้าของมาด้วย บัญชีเดิมยังอยู่ ตั้งค่า Docker ให้เริ่มอัตโนมัติและใช้พอร์ต 3080 เฉพาะ IP LAN ของ NAS

## สถานะใช้งานวันที่ 2026-11-04

- เว็บหลัก: `https://bbpcenter.duckdns.org` ใช้ได้เฉพาะอุปกรณ์ที่เข้าถึงวง LAN ของ NAS
- DuckDNS ชี้ A record ไป `10.1.251.3` ตามตัวเลือกของเจ้าของ ใบรับรอง HTTPS จริงตรวจสอบได้โดยไม่ต้องข้ามคำเตือนเบราว์เซอร์ Caddy ต่ออายุผ่าน DNS challenge
- ใช้ `compose.nas.https.yaml` เป็นชุดที่กำลังรัน พอร์ต 3080 redirect ไป HTTPS แล้ว ไม่ใช้ HTTP compose อีกชุดพร้อมกัน
- Backend ใช้ NODE_ENV=production และเปิดเฉพาะใน Docker คัดลอก Google/Discord credentials เดิมมาไว้ใน server/.env แล้ว แต่ยังต้องตั้ง callback ใน provider ให้ตรงชื่อใหม่
- เจ้าของยืนยันเพิ่ม HTTPS callback แล้ว และ Google สำเร็จหนึ่งบัญชีตามรายงาน/Google identity บน NAS ยังต้องตรวจบัญชีอื่นและ Discord จริง
- TrueMoney ยังปิดระหว่างตั้งค่า LAN ไม่มีการรับซองเงินจริงในรอบนี้
- คงเว็บฟาร์มพอร์ต 3000 และ Cloudflare Tunnel เดิมไว้

สำรองก่อนเปลี่ยน HTTPS อยู่ใน `backups/before-https-*` รวม DB, delivery key, ค่าตั้งเดิมและ DNS เดิม ไฟล์ลับและ TLS data ไม่อยู่ใน Git

## วิธีติดตั้ง HTTP บน LAN ครั้งแรก (ประวัติ/ทางกลับ)

ใช้โฟลเดอร์ย่อย `BBP_CENTER` บน STUDENT โดยฐานข้อมูล bind mount จาก `server/data` บน ext4 ของ NAS โดยตรง ไม่เปิด SQLite ผ่าน SMB จากเครื่อง Windows

สร้าง `server/.env` จาก `server/.env.example` และกำหนดดังนี้สำหรับตรวจผ่าน LAN:

```dotenv
NODE_ENV=development
HOST=0.0.0.0
PORT=3001
APP_ORIGIN=http://10.1.251.3:3080
DATABASE_PATH=/opt/bbp/server/data/bbp.sqlite
TRUEMONEY_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

นี่เป็น frontend ที่ build แล้วและระบบฐานข้อมูลจริง การตั้ง NODE_ENV นี้ใช้เฉพาะช่วง HTTP บน LAN ห้ามใช้รับเงินจริงก่อนตั้ง HTTPS สำหรับลูกค้า

Google OAuth ไม่รองรับ callback แบบ HTTP ไปยัง private IP นี้ จึงยังไม่ใส่ provider secrets ในการติดตั้ง LAN ใช้บัญชีอีเมล/รหัสผ่านได้ตามปกติ เก็บ credentials เดิมบนเครื่องเจ้าของไว้จนกว่าจะมีชื่อ HTTPS ถาวร

ไฟล์ `.env` ที่ root ของโปรเจกต์เป็นการตั้งพอร์ตของ Compose (คนละไฟล์กับ `server/.env`):

```dotenv
NAS_BIND_IP=10.1.251.3
NAS_PORT=3080
```

รันในโฟลเดอร์โปรเจกต์บน NAS:

```sh
mkdir -p server/data
chown 10001:10001 server/data
chmod 700 server/data
chmod 600 server/.env .env
docker compose -f compose.nas.yaml up -d --build
docker compose -f compose.nas.yaml ps
```

เข้าเว็บด้วย URL ตรงกันทุกเครื่อง: `http://10.1.251.3:3080` การเปลี่ยนไปใช้ชื่อ NAS หรือ IP อื่นต้องเปลี่ยน APP_ORIGIN ให้ตรงก่อน เพราะ API ตรวจ Origin

ข้อมูลอยู่ใน `server/data/bbp.sqlite` และ `server/data/delivery.key` ต้องสำรองคู่กัน ติดตั้งใหม่/สร้าง image ใหม่ไม่ล้างโฟลเดอร์นี้ ห้ามใช้คำสั่งลบโฟลเดอร์ข้อมูลเพื่ออัปเดตเว็บ

หลังเริ่มใช้ NAS ให้ถือฐานข้อมูลบน NAS เป็นข้อมูลหลัก ห้ามนำ DB เก่าจากเครื่อง Windows มาทับในรอบอัปเดต สำเนาก่อนติดตั้งครั้งแรกอยู่ใน `backups/initial` ซึ่งอ่านได้เฉพาะผู้ดูแล NAS

ตั้งเจ้าของร้านตาม [LAUNCH.md](LAUNCH.md): ล็อกอิน → `/account/profile` → ใส่ UUID ใน ADMIN_USER_IDS ของ `server/.env` → recreate container:

```sh
docker compose -f compose.nas.yaml up -d --force-recreate
```

Container ใช้ UID 10001 โดยไม่ใช้ root, อ่าน root filesystem อย่างเดียว และเริ่มใหม่เมื่อ Docker กลับมาทำงาน ไม่มีการเปลี่ยนเว็บฟาร์มหรือ Cloudflare Tunnel ที่มีอยู่เดิม

## ก่อนเปิดให้ลูกค้าจริง

ต้องมี HTTPS และช่องทางเข้าจากภายนอกที่ผู้ดูแลเครือข่ายอนุญาต จากนั้นเปลี่ยน NODE_ENV=production, APP_ORIGIN เป็นชื่อ HTTPS จริง, ใส่ OAuth credentials/แก้ callback ใน provider และเปิด TrueMoney ตาม LAUNCH.md

พอร์ต 3080 มีไว้ตรวจเว็บผ่าน LAN การติดตั้งนี้ไม่ได้เพิ่ม public DNS route หรือแก้ Cloudflare Tunnel เดิม

## HTTPS ผ่าน DuckDNS

`compose.nas.https.yaml` เป็นชุด HTTPS สำหรับ `bbpcenter.duckdns.org` ใช้แทน compose.nas.yaml เมื่อพร้อม ไม่ต้องรันสองชุดพร้อมกัน

ใบรับรองใช้ Caddy พร้อม DuckDNS DNS challenge จึงออกและต่ออายุได้โดยไม่ต้องเปิดพอร์ต 80 ให้ Let's Encrypt ส่วนการเข้าเว็บยังต้องมี DNS และเส้นทางถึง NAS ที่ใช้งานได้ ใบรับรองไม่ได้สร้างเส้นทางจากอินเทอร์เน็ตให้เอง

ใส่ token ใน `deploy/https/.env` จากตัวอย่าง ป้องกันไฟล์นี้ด้วย chmod 600 และเก็บ Caddy data/config บน NAS โดย UID 10002:

```sh
mkdir -p deploy/https/data deploy/https/config
chown -R 10002:10002 deploy/https/data deploy/https/config
chmod 700 deploy/https/data deploy/https/config
chmod 600 deploy/https/.env
docker compose -f compose.nas.https.yaml up -d --build
```

พอร์ต HTTPS คือ 443 ของ NAS ส่วนพอร์ต 3080 เปลี่ยนเป็น redirect ไปชื่อ HTTPS พอร์ต 80 ของ OpenMediaVault ยังคงเดิม Backend เปิดเฉพาะในเครือข่าย Docker

ชุด HTTPS บังคับ NODE_ENV=production และ APP_ORIGIN=https://bbpcenter.duckdns.org คัดลอก OAuth credentials จริงมาใส่ server/.env แล้วเพิ่ม URI ต่อไปนี้ในหน้าจัดการ client ของผู้ให้บริการก่อนล็อกอิน:

```text
Google:  https://bbpcenter.duckdns.org/api/auth/oauth/google/callback
Discord: https://bbpcenter.duckdns.org/api/auth/oauth/discord/callback
```

Google Authorized JavaScript origin (ถ้ามีช่องนี้): `https://bbpcenter.duckdns.org` คง localhost callback เดิมไว้ได้ การใส่ client credentials ทำให้ปุ่มเปิดได้ แต่ยังต้องให้เจ้าของบัญชีตั้ง callback และยืนยันการล็อกอินจริง

ถ้า DNS ชี้ IP ภายใน NAS ชื่อนี้จะใช้ได้เฉพาะอุปกรณ์ที่เข้าถึง LAN นั้น หากต้องให้ลูกค้าภายนอกเข้า ต้องเปลี่ยนไปใช้เส้นทางสาธารณะที่ใช้งานได้ก่อน ไม่ใช้ Quick Tunnel เป็น URL ถาวรของร้าน
