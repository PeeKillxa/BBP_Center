# BBP Center Prototype — Finish Implementation Plan

สถานะอัปเดต 2026-11-03: Task 0–4 เสร็จแล้วตามประวัติ Git และรายงาน E2E วันที่ 2026-11-01 ช่อง checkbox ด้านล่างเป็นแผนย้อนหลัง ดูผลเก็บรีวิว/TrueMoney ล่าสุดใน `2026-11-03-finish-results.md`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำโค้ดใน `app/` ให้ตรง spec: แก้ bug runtime, เพดานฟาร์ม 250k, ทดสอบในเบราว์เซอร์ตามเกณฑ์ผ่าน, เขียน README และ HANDOFF

**Architecture:** โค้ดส่วนใหญ่เสร็จแล้ว กฎธุรกิจอยู่ใน `src/domain/*` (ฟังก์ชันบริสุทธิ์ มี Vitest) ค่าตั้งอยู่ใน `src/config/*` UI เรียก `dispatch(cmd, key)` จาก `src/store/store.ts` แผนนี้แก้เฉพาะจุดที่ spec ข้อ 12 ระบุ

**Tech Stack:** React 19.3, TypeScript 7, Vite 8, Tailwind CSS 4, Motion 14, Lucide, React Router 8, Vitest 5, playwright-cli

**Spec:** `docs/superpowers/specs/2026-11-01-bbp-center-prototype-design.md`

## Global Constraints

- ไม่เชื่อม KBank, TrueMoney หรือระบบเงินจริงใด ๆ ไม่เรียก endpoint ภายนอก
- ไม่มี credentials, API key หรือข้อมูลบัญชี Roblox จริงในโค้ด ข้อมูลจำลอง หรือ log
- ไม่บันทึกรหัสผ่านหรือรหัสยืนยันใน localStorage, URL, analytics, console หรือ log
- เงินทุกจุดเป็นจำนวนเต็มหน่วยสตางค์ (`Satang`) แสดงผลแบบ `฿1,290.00`
- ฟาร์มเพชร AA: ขั้นต่ำ 10,000 · เพิ่มทีละ 10,000 · สูงสุด 250,000 · 250,000 = 310 บาท
- เวลา: รอบ = ceil(เพชร / 18), วินาที = รอบ × 120 ใช้เฉพาะฟาร์มเพชร Anime Adventures
- ทุกปุ่มหลักทำงาน แสดงเหตุผลที่ปิด หรือแจ้งว่าอยู่นอกขอบเขต
- คำสั่งทั้งหมดรันจาก `C:\Users\PC\Documents\roblox\BBP_CENTER\app` เว้นแต่ระบุอื่น · dev server ที่ `http://localhost:5173/` (ใช้ `localhost` ไม่ใช่ `127.0.0.1`)

## Review Focus

1. ข้อมูลสาธิตใน localStorage เสียหรือมาจาก build เก่า → หน้าเว็บต้องเปิดได้และสร้างข้อมูลใหม่ ไม่ขึ้นจอขาว (Task 3 Step 10)
2. ลิงก์ `?next=//example.com` หลังเข้าสู่ระบบ → ต้องไปหน้า `/account` ไม่ออกนอกเว็บ (Task 3 Step 10)
3. ผู้เยี่ยมชมหรือผู้ใช้อื่นเปิด URL คำสั่งซื้อของคนอื่นตรง ๆ → เห็นหน้าเข้าสู่ระบบหรือ "ไม่พบคำสั่งซื้อนี้" ไม่เห็นข้อมูลส่งมอบ (Task 3 Step 10)
4. กดปุ่มยืนยันซื้อสองครั้งเร็ว ๆ → หักเงินครั้งเดียว มีคำสั่งซื้อเดียว (Task 3 Step 10)
5. วางจำนวนเพชรที่มีจุลภาค ช่องว่าง หรือเลขไทย (`๑๐๐๐๐`) → จุลภาค/ช่องว่างใช้ได้ เลขไทยแสดง error ชัดเจน ไม่ crash (Task 2 Step 1)

---

### Task 0: Git repo ของโปรเจกต์

ตอนนี้ git repo เดียวที่มีคือ `C:\Users\PC` ทั้งโฟลเดอร์ ห้าม commit ที่นั่น สร้าง repo แยกใน `BBP_CENTER`

**Files:**
- Create: `BBP_CENTER/.gitignore`

- [ ] **Step 1: สร้าง repo และ .gitignore** (รันจาก `C:\Users\PC\Documents\roblox\BBP_CENTER`)

```bash
cd /c/Users/PC/Documents/roblox/BBP_CENTER
git init -b main
printf 'node_modules/\ndist/\n*.local\n.playwright-cli/\n' > .gitignore
git status --short | head -20
```

Expected: เห็น `.claude/`, `.gitignore`, `app/`, `docs/`, `skills-lock.json` ไม่เห็น `node_modules`

- [ ] **Step 2: ตรวจว่าไม่มีความลับก่อน commit**

```bash
grep -rniE "api[_-]?key|secret|token|password\s*[:=]\s*['\"][^'\"]{6,}|TRUEMONEY_RECIPIENT_PHONE\s*=" app/src docs .claude --include=*.ts --include=*.tsx --include=*.md | grep -v "DEMO-ONLY" | head
grep -rnE "0[689][0-9]{8}" app/src docs .claude | head
```

Expected: ไม่มีค่าลับจริง (ชื่อตัวแปรในเอกสาร/คำอธิบายได้ แต่ไม่มีค่า) และไม่มีเบอร์โทรจริง ถ้าพบ ให้หยุดและรายงานเจ้าของ

- [ ] **Step 3: Commit ฐาน**

```bash
git add -A
git commit -m "chore: baseline BBP Center prototype and spec" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: แก้ `TypeError: destroy is not a function` ใน `<ScrollTop>`

**สาเหตุ (ตรวจแล้ว):** Chromium ที่ใช้ทดสอบคืนค่า `window.scrollTo()` เป็น Promise (`playwright-cli eval "String(window.scrollTo(0,0))"` → `"[object Promise]"`) และ `src/App.tsx:25` เขียน `useEffect(() => window.scrollTo(0, 0), [pathname])` ซึ่งคืน Promise เป็น cleanup

**Files:**
- Modify: `app/src/App.tsx:25`

- [ ] **Step 1: ยืนยัน error ก่อนแก้**

```bash
cd /tmp && playwright-cli goto http://localhost:5173/ && playwright-cli console error | grep -c "destroy is not a function"
```

Expected: ตัวเลข ≥ 1 (ถ้า dev server ไม่รัน: `cd /c/Users/PC/Documents/roblox/BBP_CENTER/app && (npx vite --port 5173 --strictPort > /tmp/bbp-vite.log 2>&1 &)` แล้วรอ 5 วินาที · ถ้ายังไม่เปิดเบราว์เซอร์: `playwright-cli open http://localhost:5173/`)

- [ ] **Step 2: แก้เป็น block body**

ใน `app/src/App.tsx` แทน

```tsx
  useEffect(() => window.scrollTo(0, 0), [pathname])
```

ด้วย

```tsx
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
```

- [ ] **Step 3: ตรวจ effect อื่นที่อาจคืนค่าไม่ใช่ฟังก์ชัน**

```bash
cd /c/Users/PC/Documents/roblox/BBP_CENTER/app && grep -rnE "useEffect\(\(\) => [^{]" src
```

Expected: ไม่มีผลลัพธ์ (ทุก effect ใช้ block body) ถ้ามี ให้แก้แบบเดียวกับ Step 2

- [ ] **Step 4: ตรวจในเบราว์เซอร์ว่า error หายและเปลี่ยนหน้าแล้วเลื่อนขึ้นบน**

```bash
cd /tmp && playwright-cli goto http://localhost:5173/ && playwright-cli goto http://localhost:5173/maps && playwright-cli goto http://localhost:5173/farm && playwright-cli console error
```

Expected: ไม่มี `destroy is not a function` และไม่มี error อื่นจาก `src/`

- [ ] **Step 5: tsc + test**

```bash
cd /c/Users/PC/Documents/roblox/BBP_CENTER/app && npx tsc --noEmit && npx vitest run
```

Expected: tsc ไม่มี output, Vitest `27 passed`

- [ ] **Step 6: Commit**

```bash
cd /c/Users/PC/Documents/roblox/BBP_CENTER
git add app/src/App.tsx
git commit -m "fix: ScrollTop effect returned scrollTo() Promise as cleanup" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: เพดานฟาร์มเพชร 250,000 และจุดราคา 250k = 310 บาท

**Files:**
- Modify: `app/src/config/farming.ts` (anchors, packages, custom.max)
- Modify: `app/src/pages/Home.tsx` (การ์ดฟาร์มยอดนิยมใช้ `packages` จาก config)
- Modify: `app/src/components/DiamondPicker.tsx` (ตัวเลือกด่วน)
- Test: `app/src/domain/farming.test.ts`

**Interfaces:**
- Consumes: `priceForDiamonds(diamonds: number, cfg: DiamondPricingConfig): PriceResult`, `validateDiamondQuantity(raw: string | number, cfg: DiamondPricingConfig['custom'])`, `estimateDiamondFarm(diamonds: number, rate)`, `formatDurationTH(seconds: number): string` (มีอยู่แล้ว ไม่เปลี่ยน signature)
- Produces: `getFarmService('aa-diamond')!.diamond!.packages` = `[10_000, 20_000, 50_000, 100_000, 250_000]`, `custom.max` = `250_000`

- [ ] **Step 1: แก้เทสให้ตรง spec (ต้อง fail ก่อน)**

แทนทั้งไฟล์ `app/src/domain/farming.test.ts` ด้วย:

```ts
import { describe, expect, it } from 'vitest'
import { getFarmService } from '../config/farming'
import { formatDurationTH } from '../lib/time'
import { estimateDiamondFarm, priceForDiamonds, validateDiamondQuantity } from './farming'

const cfg = getFarmService('aa-diamond')!.diamond!
const price = (d: number) => {
  const r = priceForDiamonds(d, cfg)
  return r.ok ? r.satang / 100 : r.reason
}
const time = (d: number) => formatDurationTH(estimateDiamondFarm(d, cfg.rate).seconds)
const v = (raw: string) => {
  const r = validateDiamondQuantity(raw, cfg.custom)
  return r.ok ? r.value : r.error.code
}

describe('Anime Adventures diamond pricing', () => {
  it('returns exact anchor prices', () => {
    expect([10, 20, 30, 50, 100, 120, 250].map((k) => price(k * 1000))).toEqual([20, 40, 60, 100, 160, 180, 310])
  })
  it('interpolates between anchors', () => {
    expect(price(40_000)).toBe(80)
    expect(price(60_000)).toBe(112)
    expect(price(110_000)).toBe(170)
    expect(price(130_000)).toBe(190)
    expect(price(200_000)).toBe(260)
  })
  it('every orderable 10k step up to the cap yields whole baht', () => {
    for (let d = cfg.custom.min; d <= cfg.custom.max; d += cfg.custom.step) expect(typeof price(d)).toBe('number')
  })
  it('does not extrapolate beyond the last anchor', () => {
    expect(price(260_000)).toBe('out-of-range')
    expect(price(9_000)).toBe('out-of-range')
  })
  it('package cards match the spec', () => {
    expect(cfg.packages).toEqual([10_000, 20_000, 50_000, 100_000, 250_000])
    expect(cfg.custom).toMatchObject({ min: 10_000, step: 10_000, max: 250_000 })
  })
})

describe('custom quantity validation', () => {
  it('accepts 10k steps from the minimum to 250k', () => {
    expect(v('10000')).toBe(10_000)
    expect(v('40,000')).toBe(40_000)
    expect(v('250000')).toBe(250_000)
  })
  it('accepts pasted values with commas and surrounding spaces', () => {
    expect(v('  100,000 ')).toBe(100_000)
  })
  it('rejects invalid input', () => {
    expect(v('15000')).toBe('off-step')
    expect(v('')).toBe('not-a-number')
    expect(v('abc')).toBe('not-a-number')
    expect(v('๑๐๐๐๐')).toBe('not-a-number')
    expect(v('1e4')).toBe('not-a-number')
    expect(v('-10000')).toBe('negative')
    expect(v('10000.5')).toBe('not-integer')
    expect(v('0')).toBe('below-min')
    expect(v('260000')).toBe('above-max')
  })
})

describe('duration estimate', () => {
  it('1k = 56 rounds = 1 ชั่วโมง 52 นาที (formula check; below order minimum)', () => {
    expect(estimateDiamondFarm(1_000, cfg.rate).rounds).toBe(56)
    expect(time(1_000)).toBe('1 ชั่วโมง 52 นาที')
  })
  it('matches the documented examples', () => {
    expect(time(10_000)).toBe('18 ชั่วโมง 32 นาที')
    expect(time(100_000)).toBe('7 วัน 17 ชั่วโมง 12 นาที')
    expect(time(120_000)).toBe('9 วัน 6 ชั่วโมง 14 นาที')
  })
  it('250k = 13,889 rounds = 19 วัน 6 ชั่วโมง 58 นาที', () => {
    expect(estimateDiamondFarm(250_000, cfg.rate).rounds).toBe(13_889)
    expect(time(250_000)).toBe('19 วัน 6 ชั่วโมง 58 นาที')
  })
})
```

- [ ] **Step 2: รันเทสให้เห็นว่า fail**

Run: `npx vitest run src/domain/farming.test.ts`
Expected: 4 tests FAIL — `returns exact anchor prices` (250k ได้ `'out-of-range'` แทน 310), `interpolates between anchors` (130k/200k), `package cards match the spec`, `accepts 10k steps from the minimum to 250k` (250k ได้ `above-max`) · อีก 7 tests ผ่าน: `every orderable 10k step` (loop ยังใช้ max เดิม 120k), `250k = 13,889 rounds` (สูตรเวลาไม่ขึ้นกับเพดาน) และ `rejects invalid input` รวมเลขไทย `๑๐๐๐๐` → `not-a-number` เพราะ `\d` ใน JS รับเฉพาะ 0-9

- [ ] **Step 3: แก้ config**

ใน `app/src/config/farming.ts` ภายใน `aa-diamond` แทน

```ts
        { diamonds: 120_000, priceBaht: 180 },
      ],
      packages: [10_000, 20_000, 30_000, 50_000, 100_000, 120_000],
      custom: { min: 10_000, step: 10_000, max: 120_000, maxIsConfirmed: false },
```

ด้วย

```ts
        { diamonds: 120_000, priceBaht: 180 },
        // Owner set the 250k cap in chat (2026-11-01) and let us choose the price:
        // 1 THB per 1,000 diamonds, continuing the 100k–120k rate. Prototype offer only.
        { diamonds: 250_000, priceBaht: 310 },
      ],
      packages: [10_000, 20_000, 50_000, 100_000, 250_000],
      custom: { min: 10_000, step: 10_000, max: 250_000, maxIsConfirmed: false },
```

และแก้ comment ของ `max` ใน interface `DiamondPricingConfig` จาก

```ts
    /** Highest orderable amount. Markdown.md defines no cap; the last price anchor is used because no extrapolation rule exists. */
```

เป็น

```ts
    /** Highest orderable amount. Must not exceed the last price anchor: no extrapolation rule exists. */
```

- [ ] **Step 4: รันเทสให้ผ่าน**

Run: `npx vitest run`
Expected: ทุกไฟล์ผ่าน (farming.test.ts 11 tests, รวมทั้งหมด 30 passed)

- [ ] **Step 5: หน้าแรกใช้ packages จาก config**

ใน `app/src/pages/Home.tsx` แทน

```tsx
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[10_000, 20_000, 50_000, 100_000].map((d) => {
```

ด้วย

```tsx
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {diamond.diamond!.packages.map((d) => {
```

- [ ] **Step 6: ตัวเลือกด่วนในแท็บกำหนดจำนวนเอง**

ใน `app/src/components/DiamondPicker.tsx` แทน

```tsx
  const quick = [10_000, 40_000, 60_000, 80_000, 110_000].filter((x) => x >= cfg.custom.min && x <= cfg.custom.max)
```

ด้วย

```tsx
  const quick = [10_000, 40_000, 60_000, 150_000, 200_000].filter((x) => x >= cfg.custom.min && x <= cfg.custom.max)
```

- [ ] **Step 7: ตรวจในเบราว์เซอร์**

```bash
cd /tmp
playwright-cli goto "http://localhost:5173/farm/aa-diamond?d=250000"
playwright-cli find "฿310.00"
playwright-cli find "19 วัน 6 ชั่วโมง 58 นาที"
playwright-cli goto http://localhost:5173/
playwright-cli find "250,000"
```

Expected: ทั้งสามคำสั่ง `find` พบข้อความ

- [ ] **Step 8: tsc + build**

Run: `npx tsc --noEmit && npx vite build 2>&1 | tail -3`
Expected: tsc ไม่มี output, build ขึ้น `✓ built`

- [ ] **Step 9: Commit**

```bash
cd /c/Users/PC/Documents/roblox/BBP_CENTER
git add app/src/config/farming.ts app/src/pages/Home.tsx app/src/components/DiamondPicker.tsx app/src/domain/farming.test.ts
git commit -m "feat: raise custom diamond cap to 250k with 250k = 310 THB anchor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ทดสอบในเบราว์เซอร์ตามเกณฑ์ผ่าน (spec ข้อ 11) และแก้สิ่งที่พบ

งานนี้เป็นการตรวจ ไม่มีโค้ดใหม่ที่รู้ล่วงหน้า ถ้าขั้นใด Expected ไม่ตรง ให้ทำ Step 12 (ดีบัก แก้ เพิ่มเทส) แล้วรันขั้นนั้นซ้ำ ห้ามข้ามหรือแก้ Expected ให้ผ่าน

ข้อมูลตั้งต้นจาก `src/mock/seed.ts`: ผู้ใช้ A ยอด ฿3,430.00 · B ฿20.00 · C ฿0.00 · `aa-001` ฿1,290 พร้อมขาย · `aa-004` ฿190 พร้อมขาย · `av-001` ฿1,590 พร้อมขาย · `av-003` ฿240 พร้อมขาย · Skeleton แสดง 700 ms ก่อนรายการ · ผลเติมเงินจำลองออกหลังส่ง ~2.2 วินาที

**Files:**
- Create: `/tmp/bbp-e2e/slip.png` (ไฟล์ทดสอบ อยู่นอกโปรเจกต์)
- Modify: ไฟล์ที่ Step 12 ต้องแก้ (ระบุตอนพบปัญหา)

- [ ] **Step 1: เตรียมไฟล์สลิปทดสอบและล้างข้อมูล**

```bash
mkdir -p /tmp/bbp-e2e
python -I -c "import base64;open('/tmp/bbp-e2e/slip.png','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='))"
cd /tmp && playwright-cli resize 1280 800 && playwright-cli localstorage-clear && playwright-cli goto http://localhost:5173/ && playwright-cli console error
```

Expected: ไฟล์ขนาด ~70 bytes · หน้าแรกโหลด · console ไม่มี error

- [ ] **Step 2: ธีม Dark / Light / System และจำค่าหลังรีเฟรช**

```bash
cd /tmp
playwright-cli click "getByRole('radio', { name: 'ธีมมืด' })"
playwright-cli reload
playwright-cli eval "document.documentElement.classList.contains('dark') + ' ' + localStorage.getItem('bbp-theme')"
playwright-cli click "getByRole('radio', { name: 'ธีมสว่าง' })"
playwright-cli eval "document.documentElement.classList.contains('dark')"
playwright-cli click "getByRole('radio', { name: 'ตามระบบ' })"
playwright-cli set-color-scheme dark
playwright-cli eval "document.documentElement.classList.contains('dark')"
playwright-cli set-color-scheme light
playwright-cli eval "document.documentElement.classList.contains('dark')"
playwright-cli clear-color-scheme
```

Expected ตามลำดับ: `"true dark"` · `false` · `true` · `false`

- [ ] **Step 3: หมวดแมพแสดงเฉพาะไอดีของแมพนั้น**

```bash
cd /tmp
playwright-cli goto http://localhost:5173/maps/anime-vanguards
playwright-cli eval "new Promise(r => setTimeout(() => r([...document.querySelectorAll('main article h3')].map(h => h.textContent).join(' | ')), 1200))"
playwright-cli goto http://localhost:5173/maps/anime-adventures
playwright-cli eval "new Promise(r => setTimeout(() => r([...document.querySelectorAll('main article h3')].map(h => h.textContent).join(' | ')), 1200))"
playwright-cli goto "http://localhost:5173/maps/all?q=zzzz"
playwright-cli eval "new Promise(r => setTimeout(() => r(document.body.innerText.includes('ไม่พบไอดีที่ตรงกับเงื่อนไข')), 1200))"
```

Expected: ครั้งแรกมีแต่ `AV #00x` 4 รายการ · ครั้งที่สองมีแต่ `AA #00x` 6 รายการ · ครั้งที่สาม `true`

- [ ] **Step 4: เข้าสู่ระบบ → ยอดไม่พอ → เติมเงิน → กลับมาซื้อ → เปิดข้อมูลส่งมอบ (ผู้ใช้ C)**

```bash
cd /tmp
playwright-cli goto "http://localhost:5173/login?next=/listing/aa-004"
playwright-cli fill "getByLabel('อีเมล')" "demo.c@example.invalid"
playwright-cli fill "getByLabel('รหัสผ่าน')" "any-pass-123"
playwright-cli click "getByRole('button', { name: 'เข้าสู่ระบบ', exact: true })"
playwright-cli eval "new Promise(r => setTimeout(() => r(location.pathname), 1200))"
playwright-cli click "getByRole('button', { name: 'ซื้อเต็มจำนวน' })"
playwright-cli find "ขาดอีก ฿190.00"
playwright-cli click "getByRole('button', { name: 'เติมเงินแล้วกลับมาทำรายการต่อ' })"
playwright-cli eval "location.pathname + location.search + ' amount=' + document.querySelector('input[inputmode=decimal]').value"
playwright-cli run-code "async page => { await page.setInputFiles('input[type=file]', '/tmp/bbp-e2e/slip.png') }"
playwright-cli find "ตัวอย่างสลิปที่เลือก"
playwright-cli click "getByRole('button', { name: 'ส่งสลิปตรวจสอบ (จำลอง)' })"
playwright-cli eval "new Promise(r => setTimeout(() => r(document.body.innerText.includes('เติมเงินสำเร็จ')), 4000))"
playwright-cli click "getByRole('button', { name: 'กลับไปทำรายการต่อ' })"
playwright-cli click "getByRole('button', { name: 'ซื้อเต็มจำนวน' })"
playwright-cli click "getByRole('button', { name: /ยืนยันหักยอด/ })"
playwright-cli eval "new Promise(r => setTimeout(() => r(document.body.innerText.includes('ซื้อสำเร็จ')), 1500))"
playwright-cli click "getByRole('link', { name: 'ดูคำสั่งซื้อและข้อมูลส่งมอบ' })"
playwright-cli eval "document.body.innerText.includes('demo_bbp_') + ' ' + document.body.innerText.includes('••••••••••••')"
playwright-cli click "getByRole('button', { name: 'เปิดดู' }).first()"
playwright-cli eval "document.body.innerText.includes('demo_bbp_')"
playwright-cli find "฿0.00"
```

Expected: path `/listing/aa-004` หลังเข้าสู่ระบบ · พบ `ขาดอีก ฿190.00` · URL เป็น `/wallet?amount=190&next=%2Flisting%2Faa-004` และช่องจำนวนเงินเป็น `190` · พบพรีวิวสลิป · `true` (เติมสำเร็จ) · `true` (ซื้อสำเร็จ) · `"false true"` (ซ่อนก่อน) · `true` (เปิดดูแล้ว) · พบยอด `฿0.00` ใน navbar

- [ ] **Step 5: จองแล้วชำระยอดคงเหลือ และรีเฟรชแล้ว deadline ไม่เริ่มใหม่ (ผู้ใช้ A)**

```bash
cd /tmp
playwright-cli goto "http://localhost:5173/login?next=/listing/aa-001"
playwright-cli fill "getByLabel('อีเมล')" "demo.a@example.invalid"
playwright-cli fill "getByLabel('รหัสผ่าน')" "any-pass-123"
playwright-cli click "getByRole('button', { name: 'เข้าสู่ระบบ', exact: true })"
playwright-cli click "getByRole('button', { name: /จองด้วยเงิน 50%/ })"
playwright-cli eval "[...document.querySelectorAll('[role=dialog] button')].find(b => /ยืนยันจอง/.test(b.textContent)).disabled"
playwright-cli check "getByRole('checkbox', { name: /ฉันยอมรับว่า/ })"
playwright-cli click "getByRole('button', { name: /ยืนยันจอง/ })"
playwright-cli eval "new Promise(r => setTimeout(() => r(document.body.innerText.includes('จองสำเร็จ')), 1500))"
playwright-cli click "getByRole('link', { name: 'ดูรายการจอง' })"
playwright-cli eval "JSON.parse(localStorage.getItem('bbp-demo-state-v1')).reservations[0].holdEndsAt"
playwright-cli reload
playwright-cli eval "JSON.parse(localStorage.getItem('bbp-demo-state-v1')).reservations[0].holdEndsAt"
playwright-cli find "11:5"
playwright-cli click "getByRole('button', { name: 'ชำระยอดคงเหลือ ฿645.00' })"
playwright-cli eval "new Promise(r => setTimeout(() => r(document.body.innerText.includes('ชำระครบแล้ว')), 1500))"
playwright-cli find "฿2,140.00"
```

Expected: ปุ่มยืนยันจองปิดก่อนติ๊ก (`true`) · `true` จองสำเร็จ · ค่า `holdEndsAt` สองครั้งเท่ากัน · countdown ขึ้นต้น `11:5` (ไม่ใช่ `12:00:00`) · `true` ชำระครบ · ยอด A ใน navbar = 3,430 − 645 − 645 = `฿2,140.00`

- [ ] **Step 6: จองแล้วปล่อยหมดเวลา → ริบ → จองซ้ำไม่ได้ แต่ซื้อเต็มได้ (ผู้ใช้ A)**

```bash
cd /tmp
playwright-cli goto http://localhost:5173/listing/av-001
playwright-cli click "getByRole('button', { name: /จองด้วยเงิน 50%/ })"
playwright-cli check "getByRole('checkbox', { name: /ฉันยอมรับว่า/ })"
playwright-cli click "getByRole('button', { name: /ยืนยันจอง/ })"
playwright-cli eval "new Promise(r => setTimeout(r, 1500))"
playwright-cli click "getByRole('link', { name: 'ดูรายการจอง' })"
playwright-cli find "฿1,345.00"
playwright-cli click "getByRole('button', { name: 'Demo Controls' })"
playwright-cli click "getByRole('button', { name: '+12 ชม.' })"
playwright-cli click "getByRole('button', { name: '+2 ชม.' })"
playwright-cli press Escape
playwright-cli eval "new Promise(r => setTimeout(() => r(document.body.innerText.includes('ริบเงินจองแล้ว')), 1500))"
playwright-cli find "฿1,345.00"
playwright-cli goto http://localhost:5173/listing/av-001
playwright-cli eval "[...document.querySelectorAll('button')].filter(b => /จองด้วยเงิน/.test(b.textContent)).map(b => b.disabled) + ' ' + document.body.innerText.includes('จองรายการนี้ซ้ำได้อีกครั้ง')"
playwright-cli click "getByRole('button', { name: 'ซื้อเต็มจำนวน' })"
playwright-cli find "฿1,590.00"
playwright-cli press Escape
```

Expected: หลังจองยอด = 2,140 − 795 = `฿1,345.00` · `true` ริบแล้ว · ยอดยังเป็น `฿1,345.00` (ไม่คืนเงินจอง) · `"true true"` (ปุ่มจองปิด + แสดงเวลาที่จองซ้ำได้) · หน้าสรุปซื้อเต็มแสดงราคาเต็ม `฿1,590.00` ไม่หักเงินที่ริบ

- [ ] **Step 7: สั่งฟาร์มและเดินขั้นสแตนด์บายจนเสร็จ (ผู้ใช้ A)**

```bash
cd /tmp
playwright-cli goto "http://localhost:5173/farm/aa-diamond?d=20000"
playwright-cli click "getByRole('button', { name: /^สั่งฟาร์ม/ })"
playwright-cli click "getByRole('button', { name: /ยืนยันหักยอด/ })"
playwright-cli eval "new Promise(r => setTimeout(r, 1500))"
playwright-cli click "getByRole('link', { name: 'ไปหน้าติดตามงาน' })"
playwright-cli eval "location.pathname"
playwright-cli fill "getByLabel('Roblox username (สมมติ)')" "realplayer"
playwright-cli fill "getByLabel('Password (สมมติ)')" "E2E_PW_7f3k"
playwright-cli click "getByRole('button', { name: 'ส่งข้อมูลบัญชีสมมติ' })"
playwright-cli find "ชื่อผู้ใช้ต้องขึ้นต้นด้วย demo_"
playwright-cli fill "getByLabel('Roblox username (สมมติ)')" "demo_tester"
playwright-cli fill "getByLabel('Password (สมมติ)')" "E2E_PW_7f3k"
playwright-cli click "getByRole('button', { name: 'ส่งข้อมูลบัญชีสมมติ' })"
playwright-cli find "รอเรียกลูกค้า"
```

บันทึก job id จาก `location.pathname` (เช่น `/account/farm/FJ-XXXX`) เป็น `$JOB` แล้วทำต่อ:

```bash
cd /tmp
JOB=$(playwright-cli --raw eval "location.pathname.split('/').pop()" | tr -d '"')
playwright-cli goto http://localhost:5173/owner/farm
playwright-cli click "getByRole('button', { name: 'สลับเป็นมุมมองเจ้าของร้าน (สาธิต)' })"
playwright-cli click "getByRole('button', { name: new RegExp('$JOB') })"
playwright-cli click "getByRole('button', { name: 'เรียกสแตนด์บาย', exact: true })"
playwright-cli click "getByRole('button', { name: 'กลับมุมมองลูกค้า', exact: true })"
playwright-cli goto http://localhost:5173/account/farm/$JOB
playwright-cli find "4:5"
playwright-cli click "getByRole('button', { name: 'พร้อมแล้ว' })"
playwright-cli goto http://localhost:5173/owner/farm
playwright-cli click "getByRole('button', { name: 'สลับเป็นมุมมองเจ้าของร้าน (สาธิต)' })"
playwright-cli click "getByRole('button', { name: new RegExp('$JOB') })"
playwright-cli click "getByRole('button', { name: 'เริ่มเข้าสู่ระบบ', exact: true })"
playwright-cli click "getByRole('button', { name: 'ขอรหัสยืนยัน', exact: true })"
playwright-cli click "getByRole('button', { name: 'กลับมุมมองลูกค้า', exact: true })"
playwright-cli goto http://localhost:5173/account/farm/$JOB
playwright-cli fill "getByLabel('รหัสยืนยัน (สมมติ)')" "E2ECODE99"
playwright-cli click "getByRole('button', { name: 'ส่งรหัสยืนยัน' })"
playwright-cli find "กำลังตรวจผล"
playwright-cli goto http://localhost:5173/owner/farm
playwright-cli click "getByRole('button', { name: 'สลับเป็นมุมมองเจ้าของร้าน (สาธิต)' })"
playwright-cli click "getByRole('button', { name: new RegExp('$JOB') })"
playwright-cli click "getByRole('button', { name: 'เข้าใช้งานสำเร็จ', exact: true })"
playwright-cli click "getByRole('button', { name: 'เริ่มฟาร์ม', exact: true })"
playwright-cli fill "getByLabel('อัปเดตงาน: จำนวนเพชรที่วัดได้')" "5000"
playwright-cli click "getByRole('button', { name: 'อัปเดตงาน', exact: true })"
playwright-cli click "getByRole('button', { name: 'เสร็จสิ้น', exact: true })"
playwright-cli click "getByRole('button', { name: 'กลับมุมมองลูกค้า', exact: true })"
playwright-cli goto http://localhost:5173/account/farm/$JOB
playwright-cli find "งานเสร็จสิ้น"
```

Expected: ชื่อ `realplayer` ถูกปฏิเสธ · หลังส่ง `demo_tester` สถานะ `รอเรียกลูกค้า` · countdown สแตนด์บายขึ้นต้น `4:5` · หลังส่งรหัส สถานะ `กำลังตรวจผล` (ไม่ใช่ `เข้าใช้งานสำเร็จ`) · ขั้นสุดท้ายพบ `งานเสร็จสิ้น` และไทม์ไลน์มี `วัดได้ 5,000 / 20,000 เพชร`

- [ ] **Step 8: สแตนด์บายหมดเวลา → รอนัดใหม่ ยอดเงินไม่เปลี่ยน (งาน seed `FJ-SEED6`)**

```bash
cd /tmp
BAL=$(playwright-cli --raw eval "document.querySelector('a[href=\"/wallet\"]').textContent")
playwright-cli goto http://localhost:5173/owner/farm
playwright-cli click "getByRole('button', { name: 'สลับเป็นมุมมองเจ้าของร้าน (สาธิต)' })"
playwright-cli click "getByRole('button', { name: /FJ-SEED6/ })"
playwright-cli click "getByRole('button', { name: 'เรียกสแตนด์บาย', exact: true })"
playwright-cli click "getByRole('button', { name: 'Demo Controls' })"
playwright-cli click "getByRole('button', { name: '+5 นาที' })"
playwright-cli press Escape
playwright-cli eval "new Promise(r => setTimeout(() => r(document.body.innerText.includes('ไม่มีการเรียกเก็บเงินเพิ่มหรือริบค่าฟาร์ม')), 1500))"
playwright-cli click "getByRole('button', { name: 'กลับมุมมองลูกค้า', exact: true })"
playwright-cli eval "document.querySelector('a[href=\"/wallet\"]').textContent"
echo "before: $BAL"
```

Expected: `true` · ยอดหลังเท่ากับ `before`

- [ ] **Step 9: ไม่มีรหัสผ่าน/รหัสยืนยันในที่บันทึกถาวร**

```bash
cd /tmp
playwright-cli eval "JSON.stringify({...localStorage}).includes('E2E_PW_7f3k') + ' ' + JSON.stringify({...localStorage}).includes('E2ECODE99') + ' ' + JSON.stringify({...localStorage}).includes('any-pass-123') + ' ' + location.href.includes('E2E')"
playwright-cli console | grep -cE "E2E_PW_7f3k|E2ECODE99|any-pass-123"
```

Expected: `"false false false false"` และ `0`

- [ ] **Step 10: Review Focus (5 กรณี)**

```bash
cd /tmp
# 1) localStorage เสีย → เปิดได้ สร้างข้อมูลใหม่
playwright-cli localstorage-set bbp-demo-state-v1 "{not json"
playwright-cli goto http://localhost:5173/maps/all
playwright-cli eval "new Promise(r => setTimeout(() => r(document.querySelectorAll('main article').length), 1200))"
playwright-cli localstorage-set bbp-demo-state-v1 '{"version":0}'
playwright-cli goto http://localhost:5173/maps/all
playwright-cli eval "new Promise(r => setTimeout(() => r(document.querySelectorAll('main article').length), 1200))"
playwright-cli console error

# 2) open redirect
playwright-cli goto "http://localhost:5173/login?next=//example.com"
playwright-cli fill "getByLabel('อีเมล')" "demo.a@example.invalid"
playwright-cli fill "getByLabel('รหัสผ่าน')" "any-pass-123"
playwright-cli click "getByRole('button', { name: 'เข้าสู่ระบบ', exact: true })"
playwright-cli eval "new Promise(r => setTimeout(() => r(location.href), 1200))"

# 3) เปิดคำสั่งซื้อของคนอื่นตรง ๆ (OD-SEED1 เป็นของ A)
playwright-cli click "getByRole('button', { name: 'Demo Controls' })"
playwright-cli click "getByRole('button', { name: /ผู้ใช้ตัวอย่าง B/ })"
playwright-cli press Escape
playwright-cli goto http://localhost:5173/account/orders/OD-SEED1
playwright-cli eval "document.body.innerText.includes('ไม่พบคำสั่งซื้อนี้') + ' ' + document.body.innerText.includes('demo_bbp_')"
playwright-cli click "getByRole('button', { name: 'Demo Controls' })"
playwright-cli click "getByRole('button', { name: 'ออกจากระบบ (ผู้เยี่ยมชม)' })"
playwright-cli press Escape
playwright-cli goto http://localhost:5173/account/orders/OD-SEED1
playwright-cli eval "document.body.innerText.includes('เข้าสู่ระบบ / สมัครสมาชิก') + ' ' + document.body.innerText.includes('demo_bbp_')"

# 4) กดยืนยันซื้อสองครั้งเร็ว ๆ (ผู้ใช้ A, aa-004 ราคา 190)
playwright-cli click "getByRole('button', { name: 'Demo Controls' })"
playwright-cli click "getByRole('button', { name: /ผู้ใช้ตัวอย่าง A/ })"
playwright-cli press Escape
playwright-cli goto http://localhost:5173/listing/aa-004
playwright-cli click "getByRole('button', { name: 'ซื้อเต็มจำนวน' })"
playwright-cli run-code "async page => { const b = page.getByRole('button', { name: /ยืนยันหักยอด/ }); await Promise.all([b.click(), b.click({ force: true })]) }"
playwright-cli eval "new Promise(r => setTimeout(() => { const s = JSON.parse(localStorage.getItem('bbp-demo-state-v1')); r(s.orders.filter(o => o.listingId === 'aa-004').length + ' ' + s.ledger.filter(e => e.kind === 'purchase' && e.note.includes('AA #004')).length) }, 1500))"
```

Expected ตามลำดับ:
1. ทั้งสองครั้งได้ `10` (สร้าง seed ใหม่ ไอดีครบ 10 รายการ) และ console ไม่มี error จาก `src/`
2. URL เป็น `http://localhost:5173/account`
3. `"true false"` แล้ว `"true false"`
4. `"1 1"` (คำสั่งซื้อ aa-004 เดียว หักเงินครั้งเดียว)
5. (เลขไทย/จุลภาค) ครอบคลุมใน Task 2 Step 1 แล้ว — ตรวจ UI เพิ่ม:

```bash
cd /tmp
playwright-cli goto http://localhost:5173/farm/aa-diamond
playwright-cli click "getByRole('tab', { name: 'กำหนดจำนวนเอง' })"
playwright-cli fill "getByLabel('จำนวนเพชร')" "๑๐๐๐๐"
playwright-cli find "กรุณากรอกจำนวนเพชรเป็นตัวเลข"
playwright-cli fill "getByLabel('จำนวนเพชร')" " 100,000 "
playwright-cli find "฿160.00"
```

Expected: พบข้อความ error · พบ `฿160.00` และปุ่มสั่งฟาร์มเปิดใช้

- [ ] **Step 11: มือถือ 360 px, คีย์บอร์ด, reduced motion, ปุ่มไม่เงียบ**

```bash
cd /tmp
playwright-cli resize 360 740
playwright-cli goto http://localhost:5173/listing/aa-006
playwright-cli eval "document.documentElement.scrollWidth <= 360"
playwright-cli screenshot --filename=/tmp/bbp-e2e/listing-360.png
playwright-cli goto http://localhost:5173/farm/aa-diamond
playwright-cli screenshot --filename=/tmp/bbp-e2e/farm-360.png
playwright-cli resize 1280 800
playwright-cli goto http://localhost:5173/
playwright-cli press Tab
playwright-cli eval "document.activeElement.textContent"
playwright-cli press Tab
playwright-cli eval "document.activeElement.tagName + ' ' + getComputedStyle(document.activeElement).outlineStyle"
playwright-cli set-reduced-motion reduce
playwright-cli reload
playwright-cli eval "[...document.querySelectorAll('main span')].filter(s => s.className.includes('bg-cyan-300')).length"
playwright-cli clear-reduced-motion
playwright-cli goto http://localhost:5173/farm/aa-secret
playwright-cli eval "[...document.querySelectorAll('main button:disabled')].map(b => b.getAttribute('aria-describedby') && document.getElementById(b.getAttribute('aria-describedby'))?.textContent).join(' | ')"
```

Expected: `true` (ไม่มี scroll แนวนอน) · ดูภาพหน้าจอทั้งสอง: ปุ่ม `ซื้อเต็มจำนวน` / `สั่งฟาร์ม` มองเห็นครบ ไม่ถูก bottom nav บังเมื่อเลื่อนลงสุด · Tab แรก = `ข้ามไปยังเนื้อหา` · Tab ถัดไปเป็น `A` และ outline เป็น `solid` · จำนวนอนุภาค = `0` · ปุ่มที่ปิดใช้มีข้อความเหตุผล (`ปุ่มปิดใช้: รอร้านกำหนดรายละเอียด`)

เปิดภาพด้วย Read tool เพื่อตรวจด้วยตา: `/tmp/bbp-e2e/listing-360.png`, `/tmp/bbp-e2e/farm-360.png`

- [ ] **Step 12: เมื่อมีขั้นใดไม่ผ่าน**

1. ใช้ superpowers:systematic-debugging หาสาเหตุ (ดู `playwright-cli console`, `localstorage-get`, snapshot)
2. ถ้าเป็นกฎธุรกิจใน `src/domain/*` ให้เขียนเทส Vitest ที่ fail ก่อนในไฟล์เทสของโดเมนนั้น (`farming.test.ts` / `engine.test.ts` / `reservation.test.ts` / `workflow.test.ts`) แล้วแก้
3. ถ้าเป็น UI ให้แก้ไฟล์ใน `src/pages` หรือ `src/components` แล้วรันขั้นที่ไม่ผ่านซ้ำ
4. ถ้าสาเหตุคือ Expected ในแผนผิด (เช่น selector) ให้แก้คำสั่งทดสอบ ไม่ใช่แก้พฤติกรรม และจดในรายงาน
5. รัน `npx tsc --noEmit && npx vitest run` ทุกครั้งหลังแก้

- [ ] **Step 13: รายงานผลและ commit**

เขียนสรุปผลการทดสอบ (ผ่าน / ไม่ผ่าน / ไม่ได้รัน พร้อมเหตุผล) ลง `docs/superpowers/plans/2026-11-01-e2e-results.md` แล้ว:

```bash
cd /c/Users/PC/Documents/roblox/BBP_CENTER
git add -A app/src docs/superpowers/plans/2026-11-01-e2e-results.md
git commit -m "test: browser verification of prototype acceptance criteria" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: README (วิธีรัน) และ HANDOFF สำหรับ Codex

**Files:**
- Create: `app/README.md`
- Create: `docs/HANDOFF.md`

- [ ] **Step 1: เขียน `app/README.md`**

````markdown
# BBP Center — Prototype (โหมดสาธิต)

ต้นแบบหน้าร้านและบัญชีลูกค้า ใช้ข้อมูลจำลองทั้งหมด ไม่มีการเชื่อมระบบเงินจริง บัญชี Roblox จริง หรือ API ภายนอก

## วิธีรัน

ต้องมี Node.js 24+ และ npm 11+

```bash
cd app
npm install
npm run dev        # http://localhost:5173/
npm test           # Vitest: กฎราคา เวลา ซื้อ จอง เติมเงิน สแตนด์บาย
npm run build      # ตรวจ type แล้ว build ไปที่ dist/
npm run preview    # เปิด build ที่ http://localhost:4173/
```

## ลองใช้

- ปุ่ม **Demo Controls** มุมล่างซ้าย: สลับผู้ใช้ตัวอย่าง A / B / C, ปรับยอดเงิน, เลือกผลเติมเงินครั้งถัดไป, เดินนาฬิกาทดสอบ, สลับมุมมองลูกค้า/เจ้าของร้าน, จำลองโหลดผิดพลาด, รีเซ็ตข้อมูล
- เข้าสู่ระบบด้วย `demo.a@example.invalid` และรหัสผ่านใดก็ได้ 8 ตัวขึ้นไป (ไม่ถูกบันทึก)
- คูปองตัวอย่าง: `DEMO10` (ไอดี), `FARM5` (ฟาร์ม), `OLD50` (หมดอายุ)
- ชื่อผู้ใช้ Roblox ในฟอร์มฟาร์มต้องขึ้นต้นด้วย `demo_`
- หน้าควบคุมงานฟาร์ม: `/owner/farm` (ต้องสลับเป็นมุมมองเจ้าของร้านก่อน)

## โครงสร้าง

| โฟลเดอร์ | หน้าที่ |
| --- | --- |
| `src/config/` | ราคา อัตรา เพดาน เวลา ช่องทางติดต่อ |
| `src/domain/` | กฎธุรกิจแบบฟังก์ชันบริสุทธิ์ + เทส |
| `src/mock/` | ข้อมูลตัวอย่างและข้อมูลส่งมอบปลอม |
| `src/store/` | state สาธิตใน localStorage และนาฬิกาทดสอบ |
| `src/components/`, `src/pages/` | หน้าจอ |

## โลโก้และภาพ

โลโก้อยู่ที่ `public/brand/bbp-center-logo.png` คัดลอกจากไฟล์ของเจ้าของร้านโดยไม่แก้ไข ถ้าจะเปลี่ยนให้แทนไฟล์นี้ (ภาพสี่เหลี่ยมจัตุรัส) ภาพสินค้าเป็น placeholder ที่สร้างด้วยโค้ดใน `src/components/shop.tsx` (`ListingArt`)

ดูเอกสารส่งต่อระบบจริงที่ `../docs/HANDOFF.md`
````

- [ ] **Step 2: เขียน `docs/HANDOFF.md` ส่วนที่ 1 (ขอบเขตและการแยก mock)**

```markdown
# BBP Center — Handoff สำหรับพัฒนาระบบจริง

เอกสารนี้สำหรับผู้พัฒนาต่อจากต้นแบบใน `app/` ต้นแบบทำงานในเบราว์เซอร์อย่างเดียว ทุกการตรวจสิทธิ์ เงิน สต็อก และเวลาในต้นแบบเป็นการจำลอง **ไม่ใช่การควบคุมความปลอดภัย**

ข้อกำหนดหลัก: `docs/Markdown.md` · การตัดสินใจเพิ่มเติม: `docs/superpowers/specs/2026-11-01-bbp-center-prototype-design.md` ข้อ 9–10 · กฎธุรกิจเฉพาะร้าน: `.claude/skills/bbp-*`

## 1. อะไรเป็น mock และต้องแทนด้วยอะไร

| ต้นแบบ | ระบบจริง |
| --- | --- |
| `src/store/store.ts` เก็บ state ทั้งหมดใน localStorage | API client เรียก backend; localStorage เก็บได้เฉพาะธีม |
| `src/domain/engine.ts` รันในเบราว์เซอร์ | ย้ายตรรกะไปเซิร์ฟเวอร์ ใช้ชื่อคำสั่งเดิมเป็น endpoint/use case (`purchaseListing`, `createReservation`, `settleReservation`, `submitTopUp`, `orderFarm`, `submitFarmCredentials`, `ownerCallStandby`, `customerReady`, `ownerRequestVerification`, `customerSubmitCode`, `customerConfirmApproval`, `ownerMarkAccess`, `ownerStartFarm`, `ownerReportProgress`, `ownerComplete`, `ownerReschedule`) |
| `run(state, now, key, cmd)` จำผลตาม idempotency key ใน state | ตาราง idempotency ฝั่งเซิร์ฟเวอร์ ผูกกับผู้ใช้และประเภทคำสั่ง |
| `sweepInto` ตรวจ deadline ทุก 1 วินาทีในแท็บที่เปิดอยู่ | job ฝั่งเซิร์ฟเวอร์ (scheduled/queue) ที่รันซ้ำได้โดยไม่มีผลซ้ำ |
| นาฬิกาทดสอบ `clockOffsetMs` | เวลาเซิร์ฟเวอร์เท่านั้น ห้ามเชื่อนาฬิกาเครื่องลูกค้า |
| `resolveTopUp` ใช้ผลที่เลือกใน Demo Controls | ตรวจสลิปและรับอั่งเปาฝั่งเซิร์ฟเวอร์กับผู้ให้บริการจริง |
| `src/mock/seed.ts`, `src/mock/delivery.ts` | ลบทิ้ง ข้อมูลจริงมาจากฐานข้อมูล |
| Demo Switch ลูกค้า/เจ้าของร้าน และ `RequireAuth` | server-side authentication + role-based authorization |
| `DemoControls.tsx` | ลบทิ้ง |
| Login Google/Discord โหมดสาธิต | OAuth จริงผ่าน backend |

สิ่งที่ใช้ต่อได้: `src/config/*` (ย้ายไปโหลดจาก backend), `src/domain/farming.ts` (ใช้ซ้ำได้ทั้งสองฝั่ง แต่ราคาที่เรียกเก็บต้องคำนวณบนเซิร์ฟเวอร์), `src/lib/money.ts`, `src/lib/time.ts`, components และ pages ส่วนใหญ่
```

- [ ] **Step 3: เพิ่ม `docs/HANDOFF.md` ส่วนที่ 2 (ข้อกำหนดระบบจริง)**

ต่อท้ายไฟล์:

```markdown
## 2. ข้อกำหนดที่ระบบจริงต้องมี

1. **Authentication และ authorization ฝั่งเซิร์ฟเวอร์** ทุก endpoint ตรวจผู้ใช้และสิทธิ์เอง แอดมินแยก role และเห็นข้อมูลบัญชีลูกค้าเฉพาะงานที่ได้รับมอบหมาย
2. **ธุรกรรมฐานข้อมูล** การหักยอด + สร้างคำสั่งซื้อ/การจอง + เปลี่ยนสถานะสินค้า ต้อง commit พร้อมกันหรือไม่เกิดเลย
3. **กันขายไอดีเดียวกันซ้ำ** ล็อกแถวสินค้าหรือใช้ conditional update (`WHERE status = 'available'`) ผู้แพ้ต้องไม่ถูกหักเงิน
4. **Idempotency** ทุกคำสั่งที่เคลื่อนเงิน (เติม หัก จอง ชำระคงเหลือ สั่งฟาร์ม) รับ idempotency key ส่งซ้ำได้ผลเดิม ไม่เกิดผลซ้ำ · เติมเงินเพิ่มยอดครั้งเดียวต่อสลิป/ซอง
5. **Ledger ตรวจย้อนหลังได้** ยอดคงเหลือคำนวณจาก ledger แบบ append-only เก็บจำนวนเต็มหน่วยสตางค์ มีประเภท อ้างอิง และเวลา · การริบเงินจองเป็นรายการแยก
6. **การจอง** deadline 12 + 2 ชั่วโมงคำนวณจากเวลาเซิร์ฟเวอร์ตอนสร้าง · การชำระคงเหลือและการหมดเวลาแข่งกันได้ผลเดียว · การริบทำครั้งเดียวแม้ job รันซ้ำ · cooldown 6 ชั่วโมงผูก (ผู้ใช้, สินค้า)
7. **ข้อมูลส่งมอบ** เข้ารหัสฝั่งเซิร์ฟเวอร์ เปิดได้เฉพาะเจ้าของคำสั่งซื้อที่ชำระครบ บันทึก audit log ทุกครั้งที่เปิดดู ไม่ส่งไปหน้าสินค้าสาธารณะ
8. **ข้อมูลเข้าถึงบัญชีลูกค้าสำหรับงานฟาร์ม** ประเมินก่อนว่าจำเป็นต้องรับรหัสผ่านหรือไม่ ใช้วิธียืนยันทางการที่ไม่ต้องแชร์รหัสผ่านหากรองรับ · ถ้าต้องเก็บ: เข้ารหัสฝั่งเซิร์ฟเวอร์ จำกัดสิทธิ์ตามงาน มีนโยบายลบเมื่องานจบ · ห้ามขอ backup codes, session cookies หรือให้ปิด 2FA · ห้ามเขียนรหัสผ่านหรือรหัสยืนยันลง log, analytics, URL หรือ timeline
9. **สแตนด์บาย** เวลา 5 นาทีสองช่วงแยกกันจากเวลาเซิร์ฟเวอร์ · แต่ละคำขอยืนยันมี id และคำขอใหม่ทำให้คำขอเก่าใช้ไม่ได้ · ส่งรหัสไม่เท่ากับล็อกอินสำเร็จ แอดมินยืนยันผลเอง · ความคืบหน้ามาจากค่าที่วัดได้เท่านั้น
10. **การตรวจข้อกำหนดภายนอก** ตรวจข้อกำหนดการใช้งานของ Roblox และของเกมที่เกี่ยวข้องเรื่องการซื้อขายบัญชีและการฝากเล่น และเงื่อนไขของผู้ให้บริการชำระเงินแต่ละราย ก่อนเปิดใช้จริง

## 3. การชำระเงิน (ห้ามทำใน frontend)

- **โอนธนาคาร/QR + สลิป:** ตรวจสลิปฝั่งเซิร์ฟเวอร์ ตรวจยอด ผู้รับ และกันสลิปซ้ำ ห้ามเชื่อผลจากเบราว์เซอร์หรือภาพหน้าจออย่างเดียว · TODO(owner): เลือกผู้ให้บริการตรวจสลิปและบัญชีรับเงิน
- **อั่งเปา TrueMoney:** เจ้าของเลือกแพ็กเกจ `@fortune-inc/tw-voucher` ไว้สำหรับระบบจริง (ดู `docs/BBP_SKILLS_GUIDE.md`) แพ็กเกจนี้ส่งรหัสซองและเบอร์ผู้รับไปยัง proxy ภายนอกเพื่อ **redeem** ซึ่งทำให้ซองถูกใช้และเงินเคลื่อนจริง จึงต้องเรียกจาก backend เท่านั้น · เก็บเบอร์ใน env ฝั่งเซิร์ฟเวอร์ชื่อ `TRUEMONEY_RECIPIENT_PHONE` ห้าม commit ค่าจริง ห้ามส่งไป browser หรือ log · ตรวจผู้ให้บริการ proxy เงื่อนไข และพฤติกรรมเมื่อ timeout ก่อนใช้จริง · timeout หลังส่ง redeem ห้าม retry หรือเพิ่มยอดทันที ต้องตรวจผลกับผู้ให้บริการก่อน · เทสอัตโนมัติใช้ mock เท่านั้น
- ห้ามฝัง API key หรือ secret ใด ๆ ใน frontend

## 4. เรื่องที่ยังรอเจ้าของร้านตัดสินใจ

ดูรายการเต็มใน spec ข้อ 10 สรุป: ราคาฟาร์มและเพดานจริง · บริการหาตัวลับ/ฟาร์มเลเวล · นโยบายยกเลิก คืนเงิน ร้านส่งมอบไม่ได้ ระบบขัดข้อง · จำนวนครั้งลองใหม่ของคำขอยืนยัน · รูปแบบรหัสยืนยัน · ช่องทางส่งข้อมูลบัญชี · ข้อความเงื่อนไขการโอน การรับประกัน · ลิงก์ LINE/Discord · บัญชีรับเงิน · ภาพสินค้า · การปัดเศษเงินจองถ้าราคามีเศษสตางค์

## 5. เทสที่มีและที่ต้องเพิ่ม

- มีแล้ว: `app/src/domain/*.test.ts` (Vitest) ครอบคลุมราคา เวลา ซื้อ จอง เติมเงิน สแตนด์บาย และการไม่บันทึกรหัส
- ผลทดสอบในเบราว์เซอร์: `docs/superpowers/plans/2026-11-01-e2e-results.md`
- ต้องเพิ่มในระบบจริง: integration test กับฐานข้อมูลจริงสำหรับการแข่งซื้อพร้อมกัน, การชำระคงเหลือแข่งกับการหมดเวลา, job หมดเวลารันซ้ำ, idempotency ของเติมเงิน, และการปฏิเสธผู้ที่ไม่ใช่เจ้าของคำสั่งซื้อ
```

- [ ] **Step 4: ตรวจเอกสาร**

```bash
cd /c/Users/PC/Documents/roblox/BBP_CENTER
test -f app/README.md && test -f docs/HANDOFF.md && echo ok
grep -nE "[0-9]{3}-?[0-9]{3}-?[0-9]{4}" docs/HANDOFF.md app/README.md
cd app && npm run build 2>&1 | tail -2
```

Expected: `ok` · grep ไม่มีผลลัพธ์ (ไม่มีเบอร์โทร) · build `✓ built`

- [ ] **Step 5: Commit**

```bash
cd /c/Users/PC/Documents/roblox/BBP_CENTER
git add app/README.md docs/HANDOFF.md
git commit -m "docs: README and production handoff for the prototype" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## นอกขอบเขตแผนนี้

- แยก bundle ตามหน้า (spec ข้อ 12.5 ไม่บังคับ) — JS ตอนนี้ 608 kB ก่อน gzip ใช้งานได้ ทำภายหลังถ้าเจ้าของต้องการ
