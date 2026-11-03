# BBP Center บน NAS

ตำแหน่งที่เจ้าของระบุ: `\\nas\STUDENT\BBP_CENTER`

เครื่องที่ตรวจจริง: OpenMediaVault 8 / Debian 13, x86_64, i5-9400, RAM 16GB มี Docker และ Compose แล้ว

ติดตั้งครั้งแรกวันที่ 2026-11-03 โดยนำสำเนา SQLite ที่สร้างด้วย online backup จากเครื่องเจ้าของมาด้วย บัญชีเดิมยังอยู่ ตั้งค่า Docker ให้เริ่มอัตโนมัติและใช้พอร์ต 3080 เฉพาะ IP LAN ของ NAS

## ติดตั้งผ่าน Docker Compose

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
