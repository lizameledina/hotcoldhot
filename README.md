# Контрастный душ — Telegram Mini App

Приложение для трекинга контрастного душа. Помогает следовать режиму горячая/холодная вода, отслеживать сессии и строить привычку.

---

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | React + TypeScript + Vite + Zustand |
| Backend | Node.js + TypeScript + Express |
| ORM | Prisma |
| База данных | PostgreSQL |
| Auth | Telegram WebApp initData + JWT |

---

## Быстрый старт

### 1. Переменные окружения

```bash
# backend/.env
cp backend/.env.example backend/.env
# Заполните: DATABASE_URL, JWT_SECRET, TELEGRAM_BOT_TOKEN
```

### 2. Запуск через Docker

```bash
docker-compose up -d postgres
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

### 3. Только PostgreSQL через Docker

```bash
docker-compose up -d postgres
```

---

## Структура проекта

```
ContrastShower/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Модели БД
│   │   └── seed.ts             # Системные пресеты
│   └── src/
│       ├── index.ts            # Entry point
│       ├── lib/prisma.ts       # Prisma client singleton
│       ├── middleware/auth.ts  # JWT middleware
│       ├── routes/             # Express роуты
│       └── services/           # Бизнес-логика
└── frontend/
    └── src/
        ├── api/                # API клиент
        ├── hooks/              # useTimer, useTelegram
        ├── screens/            # Экраны приложения
        ├── store/              # Zustand stores
        ├── styles/             # Глобальные стили
        └── types/              # TypeScript типы
```

---

## API

### Аутентификация
```
POST /api/auth/telegram
Body: { initData: string }
```

### Пресеты
```
GET    /api/presets
POST   /api/presets
PATCH  /api/presets/:id
DELETE /api/presets/:id
```

### Сессии
```
POST /api/sessions/start       { presetId }
POST /api/sessions/:id/finish  { status, completedCycles, actualHotSec, actualColdSec, actualBreakSec }
GET  /api/sessions
GET  /api/sessions/:id
```

### Статистика
```
GET /api/stats/summary
```

---

## Системные пресеты

| Название | Горячая | Холодная | Пауза | Циклы |
|----------|---------|----------|-------|-------|
| Новичок | 60с | 15с | 10с | 2 |
| Стандарт | 90с | 30с | 10с | 3 |
| Продвинутый | 120с | 60с | 0с | 5 |

---

## Telegram Bot Setup

1. Создайте бота через @BotFather
2. Включите Mini App: `/newapp`
3. Установите URL вашего фронтенда
4. Добавьте `TELEGRAM_BOT_TOKEN` в `.env`

---

## Ключевые особенности реализации

### Таймер
- Использует `requestAnimationFrame` для плавного обновления
- Хранит `phaseStartedAt` (timestamp) вместо countdown — переживает перезагрузку
- При паузе сохраняет `pausedRemainingMs` и восстанавливает смещением `phaseStartedAt`
- State персистится в `localStorage` через Zustand persist

### Стрик
- Считается на бэкенде по уникальным дням (UTC)
- Стрик ломается, если пропущен день
- Стрик "текущий" — если последняя сессия была сегодня или вчера

### Офлайн-режим
- Сессия стартует локально если нет сети
- Результат сохраняется когда сеть появится (при следующем открытии)
- Local session ID: `local_<timestamp>`
