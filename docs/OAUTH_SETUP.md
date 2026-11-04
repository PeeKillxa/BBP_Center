# ตั้งค่า Google และ Discord สำหรับ BBP Center

โค้ดรองรับ OAuth จริงฝั่ง server แล้ว ต้องสร้าง client กับผู้ให้บริการและกรอกค่าเองใน `server/.env` ก่อนใช้งาน ไม่ส่ง Client Secret ในแชตหรือใส่ใน `app/` / ตัวแปร `VITE_*`

## NAS ที่ใช้อยู่ตอนนี้

เข้า `https://bbpcenter.duckdns.org/login` ภายใน LAN ค่า credentials เดิมถูกตั้งบน NAS แล้วและ backend ส่ง callback ชื่อ HTTPS นี้:

```text
Google:  https://bbpcenter.duckdns.org/api/auth/oauth/google/callback
Discord: https://bbpcenter.duckdns.org/api/auth/oauth/discord/callback
```

เพิ่ม Google URL ใน Authorized redirect URIs ของ Web application client เดิม ส่วน Discord เพิ่มใน OAuth2 → Redirects ของ application เดิม ไม่ต้องสร้าง client/secret ใหม่ หากมีช่อง JavaScript origins ของ Google ให้เพิ่ม `https://bbpcenter.duckdns.org` ด้วย

เจ้าของยืนยันเพิ่ม HTTPS callback แล้ววันที่ 2026-11-04 และรายงานว่า Google ล็อกอินสำเร็จหนึ่งบัญชี ตรวจฐานข้อมูล NAS พบ Google identity หนึ่งรายการ แต่ยังต้องตรวจการเข้าใช้ด้วยบัญชีอื่นและ Discord จนได้ session จริง

คำแนะนำ localhost ด้านล่างใช้สำหรับพัฒนาบนเครื่อง Windows และสามารถคง URI เดิมไว้ควบคู่กันได้

## 1. Google

1. เปิด [Google Cloud Console](https://console.cloud.google.com/apis/credentials) เลือก/สร้าง project สำหรับร้าน
2. ตั้งค่า OAuth consent screen (ชื่อร้าน อีเมลติดต่อ และกลุ่มผู้ใช้) หากอยู่ในโหมด Testing ให้เพิ่มอีเมลที่ต้องการทดลองเป็น Test users
3. สร้าง OAuth Client ชนิด **Web application**
4. เพิ่ม Authorized redirect URI ตรงตัว:

   `http://localhost:5173/api/auth/oauth/google/callback`

5. ใส่ Client ID และ Client Secret ใน `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`

ถ้าหน้าตั้งค่าต้องการ JavaScript origin ให้ใช้ `http://localhost:5173` การแลก token ของแอปนี้ทำบนเซิร์ฟเวอร์

อ้างอิง [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)

## 2. Discord

1. เปิด [Discord Developer Portal](https://discord.com/developers/applications) แล้วสร้าง application สำหรับร้าน
2. ในหน้า OAuth2 เพิ่ม Redirect ตรงตัว:

   `http://localhost:5173/api/auth/oauth/discord/callback`

3. คัดลอก Client ID และ Client Secret ใส่ `DISCORD_CLIENT_ID` และ `DISCORD_CLIENT_SECRET`
4. ระบบขอเฉพาะ `identify email` ไม่ต้องสร้าง bot หรือเชิญ bot เข้าเซิร์ฟเวอร์

อ้างอิง [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2)

## 3. ไฟล์ `.env` และวิธีลอง

```env
APP_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

ไฟล์ local `.env` มีช่องว่างเตรียมไว้แล้ว ให้ใส่ค่าหลัง `=` และเก็บค่า TrueMoney เดิมไว้ ไฟล์นี้ถูก ignore จาก Git

เปิดสอง terminal: ใน `server/` รัน `npm ci` และ `npm start`; ใน `app/` รัน `npm run dev` เปิด `http://localhost:5173/login` หรือ `/wallet/live` แล้วกด Google/Discord เมื่อใส่ค่าครบปุ่มจึงเปิด ถ้าแก้ `.env` ต้อง restart server

ใช้ `localhost` ให้ตรงทุกตำแหน่ง รวม `APP_ORIGIN` และ URI ใน provider ถ้า Vite ใช้พอร์ตอื่น ให้แก้ทั้งสามที่ให้ตรงกัน

เมื่อ deploy จริง เปลี่ยน `APP_ORIGIN` เป็น HTTPS origin ของร้าน แล้วเพิ่ม redirect URI ที่ provider ทั้งสองเป็น origin เดียวกันต่อด้วย `/api/auth/oauth/google/callback` หรือ `/api/auth/oauth/discord/callback` proxy `/api/*` ไป Node server ตาม README

## บัญชีและยอดเงิน

- เข้าสู่ระบบสำเร็จจะกลับสู่กระเป๋าเงิน โดยใช้ session ของ server และบัญชีเดิมเมื่อกลับมา login ซ้ำ (`/wallet/live` เป็นลิงก์ redirect เดิมไป `/wallet`)
- ไม่มีการส่ง access token / ID token / refresh token ให้ browser หรือเก็บลง localStorage/DB; ใช้ token ระหว่าง callback แล้วทิ้ง
- state ใช้ครั้งเดียว หมดอายุ 10 นาที และผูกกับ cookie HttpOnly/SameSite=Lax; session ปกติยังเป็น SameSite=Strict
- Google ตรวจลายเซ็น ID token กับ Google JWKS, issuer, audience, expiry, nonce และ authorized party; Discord ตรวจ issuer callback แล้วอ่านตัวตนจาก `/users/@me` ผ่าน access token
- ต้องมีอีเมลยืนยันแล้วจาก provider และอ้างอิงบัญชีด้วย `(provider, subject)` ไม่ใช่อีเมลอย่างเดียว
- หากอีเมลตรงบัญชีเดิม ระบบไม่รวมบัญชีอัตโนมัติ ให้เข้าบัญชีเดิมก่อน แล้วในกระเป๋าเงินจริงกด **เชื่อมบัญชี Google/Discord** การเชื่อมใช้ยอดเดิม ไม่สร้างยอดใหม่ และไม่ย้าย provider จากบัญชีอื่น
- หน้า login/register ใช้ social และอีเมล/รหัสผ่านจริงผ่าน server ทั้งหมด ใช้บัญชีและยอดเงินเดียวกัน
- การซื้อ/จอง/ฟาร์มใช้ server และฐานข้อมูลแล้ว อ่านการตั้งบัญชีเจ้าของร้านและเปิดรับคำสั่งซื้อใน `LAUNCH.md`

## ผลตรวจของการพัฒนา

Server tests 21 กรณี และ frontend 13 กรณีผ่าน พร้อม type/build ผ่าน ทดสอบ provider token exchange/profile ด้วย mock HTTP และทดสอบลายเซ็น Google ด้วย RSA key ที่สร้างใน test

NAS มี credentials และ HTTPS แล้ว ตรวจ redirect เริ่มต้นของทั้งสอง provider ได้และ flow cookie เป็น Secure/HttpOnly การเข้าสู่ระบบจนได้ session จริงยังต้องทดสอบหลังตั้ง callback ใน provider โดยเจ้าของบัญชี

ตรวจ Chromium ที่ `/login` แล้ว: ปุ่ม Google/Discord ปิดพร้อมเหตุผลเมื่อ credentials ว่าง และ console ไม่มี error ขณะโหลดหน้า

## เมื่อเลือกเมลอื่นแล้วไม่เห็นผล

แอปไม่มี email allowlist และ Google request ใช้เฉพาะ `openid email profile` พร้อม `prompt=select_account` ตามเอกสาร Google สิทธิ์พื้นฐานนี้ได้รับข้อยกเว้นจากรายชื่อ Test users แม้อยู่ใน Testing จึงไม่ควรสรุปว่าต้อง Publish ก่อนโดยไม่มี error จริง

OAuth callback กลับมาที่ `/wallet/live?oauth_error=...` ซึ่ง redirect ไป `/wallet` โดยรักษา query ไว้ หน้า wallet แสดงข้อความผิดพลาดก่อน gate ตรวจ session เพื่อไม่ซ่อนสาเหตุจากผู้ที่ยังล็อกอินไม่สำเร็จ

หากขึ้น `oauth-account-exists` ให้เข้าบัญชีเดิมก่อน แล้วไป `/account/profile` เพื่อเชื่อม Google ระบบไม่รวมบัญชีหรือยอดเงินโดยอาศัยอีเมลเพียงอย่างเดียว
