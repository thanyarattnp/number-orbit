# Number Orbit — GitHub Pages + Supabase

ชุดนี้ย้ายหน้าเกมไป GitHub Pages และเก็บคะแนนบน Supabase ใช้ได้ทั้งมือถือและคอมพิวเตอร์ ยังต้องตั้งค่าฐานข้อมูลและเผยแพร่ก่อนจึงบันทึกคะแนนจริงได้ เกมเดิมบน ChatGPT Site ไม่ได้รับการแก้ไข

## 1. สร้างฐานข้อมูล

1. เข้าบัญชี https://supabase.com/dashboard แล้วสร้าง project สำหรับเกมนี้ เลือกแผนและภูมิภาคที่ต้องการตามหน้าบริการ
2. ไปที่ SQL Editor เปิดคำสั่งใน `supabase/setup.sql` วางแล้วกด Run **ครั้งเดียว** บน project ใหม่
3. ไปที่ Authentication → Sign In / Providers แล้วเปิด **Allow anonymous sign-ins** เพื่อให้ผู้เล่นใส่ชื่อแล้วเล่นได้เลย หากชื่อเมนูเปลี่ยนให้ดูคู่มือ Anonymous Sign-Ins ด้านล่าง
4. คัดลอก Project URL และ Publishable key จากหน้า Connect หรือ Settings → API Keys
5. เปิด `docs/config.js` แล้วกรอกสองค่า เช่น:

```js
window.NUMBER_ORBIT_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabasePublishableKey: 'sb_publishable_...'
};
```

Publishable key ออกแบบมาให้ใช้ในหน้าเว็บได้ โดย SQL ในชุดนี้เปิด Row Level Security เพื่อจำกัดข้อมูลตามผู้เล่น **ห้ามใส่ secret key หรือ service_role key ใน GitHub หรือ config.js**

## 2. นำขึ้น GitHub

1. สร้าง repository ชื่อ `number-orbit` หรือใช้ repository ที่ต้องการ
2. แตก ZIP แล้วอัปโหลด **ไฟล์และโฟลเดอร์ข้างใน** ให้ `docs/` อยู่ที่ราก repository ไม่ใช่อยู่ใต้โฟลเดอร์ซ้อนอีกชั้น ห้ามอัปโหลด ZIP เพียงไฟล์เดียว
3. ไปที่ Settings → Pages → Build and deployment เลือก **Deploy from a branch**
4. เลือก branch `main` และโฟลเดอร์ `/docs` แล้ว Save
5. รอ GitHub เผยแพร่ แล้วเปิด URL ที่หน้า Pages แสดง เช่น `https://USERNAME.github.io/number-orbit/`

ไม่ต้องติดตั้ง Node.js หรือ build เกม ไฟล์ CSS, JavaScript และไอคอนใช้ path แบบ relative จึงรองรับชื่อ repository อื่นได้

## 3. ทดสอบหลังตั้งค่า

1. เปิด URL ผ่าน HTTPS ใส่ชื่อผู้เล่นแล้วยิงอย่างน้อยหนึ่งครั้ง จากนั้นกดพักเกม
2. รอข้อความ **บันทึกสถิติแล้ว** กดสถิติผู้เล่น ตรวจชื่อ คะแนน และจำนวนยิง
3. รีเฟรชแล้วเปิดสถิติอีกครั้ง ประวัติควรอยู่ครบ
4. เปิดโหมดไม่ระบุตัวตน แล้วลองชื่อเดียวกัน ต้องไม่เห็นประวัติจากหน้าต่างแรก เพราะชื่อไม่ได้ใช้เป็นรหัสผ่าน
5. เจ้าของ project ตรวจตาราง `orbit_runs` ใน Supabase Table Editor เพื่อยืนยันว่าข้อมูลถูกเก็บจริง

## สถิติที่เก็บและสิทธิ์เข้าถึง

- บันทึกชื่อ คะแนน จำนวนยิง เวลา จำนวนลูกที่เคลียร์ คอมโบ สถานะรอบ และเวลาเริ่ม
- อัปเดตทุก 15 วินาที เมื่อพักเกม เริ่มใหม่ และจบเกม ใช้รหัสรอบเดิมเพื่อไม่ให้จำนวนรอบซ้ำ
- ประวัติหน้าเกมแสดง 200 รอบล่าสุดของตัวตนผู้เล่นในเบราว์เซอร์นั้น สรุปคำนวณจากรอบทั้งหมดของตัวตนนั้น และดาวน์โหลดประวัติที่แสดงเป็น CSV ได้
- คะแนนเก็บบนฐานข้อมูลออนไลน์ ส่วนเบราว์เซอร์เก็บ session ที่ใช้ระบุตัวตน ผู้เล่นไม่ต้องมีบัญชี GitHub หรือ Supabase
- การเปลี่ยนอุปกรณ์ ล้างข้อมูลเว็บ หรือออกจากหน้าต่างไม่ระบุตัวตน จะทำให้เข้าถึงประวัติเดิมผ่านหน้าเกมไม่ได้ ชื่อเดียวกันไม่ได้กู้คืนตัวตนเดิม แต่คะแนนที่ส่งสำเร็จยังอยู่ในฐานข้อมูลของเจ้าของ project
- อาจารย์ดูคะแนนรวมทุกเครื่องได้ใน Supabase Table Editor ตาราง `orbit_runs` และส่งออก CSV จากที่นั่น หน้าเกมไม่ได้เปิดคะแนนของทุกคนให้สาธารณะอ่าน
- ประวัติเดิมบน ChatGPT Site ไม่ได้ย้ายมาโดยอัตโนมัติ
- ถ้าเน็ตขาดให้กด “บันทึกอีกครั้ง” ก่อนรีเฟรชหรือปิดหน้า คะแนนที่ยังส่งไม่สำเร็จอยู่ในหน่วยความจำของหน้านั้น
- เหมาะกับกิจกรรมการเรียนรู้ คะแนนคำนวณในเบราว์เซอร์ จึงไม่ใช่ระบบป้องกันการโกงสำหรับการแข่งขันที่มีรางวัล

## แก้ปัญหา

- “ยังไม่ได้ตั้งค่าฐานข้อมูล”: ตรวจ URL และ key ใน `docs/config.js` แล้ว commit การแก้ไข
- Anonymous sign-ins disabled: เปิด anonymous sign-ins ใน Supabase Authentication
- function does not exist: รัน `supabase/setup.sql` ให้สำเร็จบน project เดียวกับ config
- Permission denied: ตรวจว่า SQL รันครบ และใช้ Publishable key ของ project ถูกต้อง อย่าปิด RLS เพื่อแก้ปัญหา
- ดาวน์โหลดสคริปต์ไม่ได้: ตรวจการเข้าถึง `esm.sh` และ `*.supabase.co` จากเครือข่ายโรงเรียน ชุดนี้โหลด Supabase JavaScript SDK รุ่น major 2 จาก CDN
- ถ้าตั้ง CAPTCHA ใน Supabase ต้องเพิ่มหน้ารับ CAPTCHA และส่ง token ก่อน sign-in; ชุดเริ่มต้นนี้ยังไม่มี CAPTCHA ควรเพิ่มก่อนเปิดรับผู้เล่นสาธารณะจำนวนมาก

## เอกสารอ้างอิง

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security

## สถานะชุดติดตั้ง

เตรียมจาก Number Orbit รุ่นที่รองรับมือถือ ธีมอวกาศ และสถิติ วันที่ 30 กันยายน 2026 ยังไม่ได้สร้าง Supabase project หรือเผยแพร่เข้า repository ของผู้ใช้ ต้องทดสอบเชื่อมต่อจริงตามข้อ 3 หลังตั้งค่า
