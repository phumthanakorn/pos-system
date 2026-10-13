# pos-system

ระบบ POS หลายร้าน (multi-tenant) สำหรับร้านค้าในไทย

- `pos-backend` — NestJS + Prisma + MySQL
- `pos-frontend` — Vue 3 + Vite + Tailwind

## เริ่มต้นใช้งาน

```bash
# backend
cd pos-backend
cp .env.example .env        # แก้ DATABASE_URL และ JWT secret
npm install --legacy-peer-deps
npx prisma db push
npm run start:dev           # http://localhost:3000

# frontend
cd pos-frontend
cp .env.example .env
npm install --legacy-peer-deps
npm run dev                 # http://localhost:5173
```

ทดสอบ backend: `npm test`
