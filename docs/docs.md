# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Рядок вище — load-bearing: застосунок націлений на **Expo SDK 56** (`react-native`
> 0.85, React 19, **New Architecture за замовчуванням**). API відрізняються між
> версіями SDK — будь-яке використання звіряй з https://docs.expo.dev/versions/v56.0.0/
> перед написанням коду. Кожна нативна залежність мусить підтримувати Fabric/TurboModules.

## Огляд

**Veil** — офлайн зашифрований сейф для фото/відео. Усі медіа шифруються локально
(AES-256-GCM), метадані — у SQLCipher-БД. Нічого не виходить за межі пристрою:
жодних мережевих викликів, аналітики чи хмарної синхронізації.

## Обсяг (v1) — робимо ТІЛЬКИ це

Платформи: **iOS + Android** (без web — нативні крипта/SQLCipher у браузері не працюють).

У обсязі:

- Розблокування: PIN (Argon2id) + біометрія; авто-лок по таймауту та при `background`.
- Імпорт фото з галереї (мультивибір);
- Імпорт = **копіювання** в сейф; оригінал у системній галереї НЕ видаляється.
- Локальне шифрування AES-256-GCM + окремі зашифровані thumbnail'и.
- Перегляд: сітка (thumbnails) + деталі (повний розмір, memory-only).
- Альбоми та «обране» (favorites).
- Видалення записів (з фактичним стиранням зашифрованого файлу).
- Захист екрана: Android FLAG_SECURE; iOS — детекція скріншотів + блюр у фоні.

Поза обсягом (не робити без окремого рішення):

- Видалення/приховування оригіналів із системної галереї. Veil не чіпає медіатеку (`expo-media-library` не використовуємо. Прибрати оригінал із Фото/Google Photos — відповідальність користувача. Не реалізовувати «тихе приховування»: ОС його все одно забороняє (обов'язковий діалог «Нещодавно видалені» на 30 днів).
- Хмарна синхронізація, шеринг назовні, експорт у відкритому вигляді.
- Будь-яка мережа, аналітика, телеметрія.
- Web-таргет.
- Маскування застосунку (калькулятор тощо) — ризик реджекту в App Store.

## Команди

```bash
npm start            # Metro dev server (expo start)
npm run ios          # build + run на iOS (expo run:ios) — потрібен dev build, не Expo Go
npm run android      # build + run на Android (expo run:android)
npm run lint         # expo lint (ESLint)
npx tsc --noEmit     # typecheck (strict) — основний gate, ганяй після змін
npx expo prebuild    # регенерувати native проєкти після зміни config-плагінів
```

`expo-dev-client` обов'язковий: нативні модулі (op-sqlite/SQLCipher, argon2, IAP, MMKV)
не працюють в Expo Go. Після додавання/зміни нативної залежності або config-плагіна —
`expo prebuild` + новий dev build. Тестового раннера немає; `tsc --noEmit` — основна перевірка.

## Технологічний стек (усе сумісне з Expo dev-client)

| Задача                       | Пакет                       | Примітка                                                                 |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| БД + шифрування метаданих    | `@op-engineering/op-sqlite` | `enableSQLCipher: true`, через Expo config-плагін                        |
| Файлові операції             | `expo-file-system`          | DocumentDirectory, потокове читання/запис (новий API SDK 56)             |
| Вибір медіа                  | `expo-image-picker`         | мультивибір; камера — `expo-camera` за потреби                           |
| AES-256-GCM (фото)           | `expo-crypto`               | нативні `aesEncryptAsync`/`aesDecryptAsync` — окремий модуль не потрібен |
| AES-GCM стрім (великі відео) | `react-native-quick-crypto` | JSI; лише якщо потрібен chunked-стрім (див. нижче)                       |
| KDF (Argon2id)               | `react-native-argon2`       | нативний; fallback — `@noble/hashes` argon2id (pure-JS, повільніше)      |
| Біометрія                    | `expo-local-authentication` | FaceID/TouchID/Fingerprint                                               |
| Захист екрана                | `expo-screen-capture`       | Android FLAG_SECURE + детекція скріншотів iOS                            |
| Відображення фото            | `expo-image`                | `cachePolicy="memory"` — **ніколи не на диск** (див. безпеку)            |
| Платежі                      | `react-native-iap` v12+     | StoreKit2 on-device verification (офлайн)                                |
| Локальні налаштування        | `react-native-mmkv`         | теми/таймаути/кеш; Pro-статус — НЕ джерело істини                        |

## Архітектура та потік даних

```
[UI] PIN / біометрія
   ↓
[Native] Argon2id(PIN + Salt, params) → 32B MasterKey (тільки в ArrayBuffer/RAM)
   ↓
[op-sqlite] open з RAW key: PRAGMA key = "x'<64-hex>'"  → БД готова (хибний ключ = БД не відкриється = верифікація PIN)
   ↓
[Import] expo-image-picker → тимчасовий шлях
   ↓
[Crypto] subKey = HMAC-SHA256(MasterKey, fileId); AES-256-GCM → файл у DocumentDir/.vault/  (layout: IV(12B) ‖ ciphertext ‖ tag(16B))
   ↓                                              + зашифрований thumbnail для сітки
[DB] INSERT metadata (original_name, encrypted_path, thumb_path, mime, size, album_id, ...)
   ↓
[UI] Grid рендерить дешифровані thumbnail'и; повний розмір — лише в деталях (decrypt → пам'ять → expo-image memory-only)
   ↓
[AppState background / таймаут / logout] close DB + занулити MasterKey-буфер нативно + очистити кеш зображень
```

## Модель безпеки (обов'язкова до реалізації)

- **KDF.** Argon2id (`react-native-argon2`). **Salt і параметри** (memoryCost,
  iterations, parallelism) не секретні, але обов'язкові для повторної деривації —
  зберігай у `app_settings`. Перевір, що бібліотека збирається на RN 0.85/New Arch
  під prebuild; інакше fallback на pure-JS `@noble/hashes` argon2id (вхід раз за
  сесію, ~1–2 с прийнятно).
- **SQLCipher — raw key, не passphrase.** Передавай 32-байтний ключ як
  `PRAGMA key = "x'<hex>'"`, щоб SQLCipher НЕ робив повторний PBKDF2 поверх Argon2id.
- **Шифрування файлів.** AES-256-GCM, **унікальний 12B IV на файл**, окремий
  `subKey = HMAC-SHA256(MasterKey, fileId)`. Зберігай `IV ‖ ciphertext ‖ tag` у самому
  файлі. Фото — одна GCM-операція через `expo-crypto`.
- **Великі відео / chunked.** GCM не можна «чанкати» з тим самим IV. Якщо файл не
  влазить у пам'ять — потокова схема: per-chunk nonce = `baseIV ‖ counter`, окремий
  тег на чанк + фінальний прапорець (через `react-native-quick-crypto`). Без визначеної
  схеми chunked-GCM не реалізовувати.
- **Життєвий цикл ключа.** Ключ ніколи не пишеться на диск. Тримай у JSI ArrayBuffer і
  **зануляй сам буфер нативно** — `MasterKey = null` у JS/Hermes нічого не гарантує
  (рядки незмінні, GC лишає копії; не конвертуй ключ у JS-string). Очищення на
  `AppState === 'background'` та по таймауту: close DB → wipe буфера → clear image cache.
- **Плейнтекст не на диск.** Дешифровані фото — у пам'ять, `expo-image` з
  `cachePolicy="memory"` (НІКОЛИ `disk`/`memory-disk`). Не віддавай дешифрований
  `file://` нічому, що має власний дисковий кеш.
- **Скріншоти.** Android: `expo-screen-capture` `preventScreenCaptureAsync()` (FLAG_SECURE).
  iOS: **повне блокування неможливе** — лише детекція (`addScreenshotListener`) + блюр
  оверлей при `background`. Не закладай «блокування примусового скріншоту на iOS».
- **Бекапи.** Файли зашифровані, тож потрапляння у iCloud/Google Backup безпечне.
  Виключення з бекапу (`NSURLIsExcludedFromBackupKey`) — опційний bonus (може
  потребувати дрібного config-плагіна).
- **Pro-статус.** Джерело істини — `react-native-iap` (StoreKit2 on-device JWS,
  офлайн). MMKV-прапорець — лише кеш (на root легко править → не довіряй йому).
- **Офлайн.** Жодних `fetch`/`axios`/`netinfo`/аналітики/телеметрії в кодовій базі.
- **PIN.** 6 цифр = 10⁶ простір; Argon2id сповільнює перебір, але додай **лімітер
  спроб з ескалацією локауту** (персист у MMKV/SecureStore) і розглянь опційний довший пароль.

## Схема БД (SQLCipher)

```sql
CREATE TABLE IF NOT EXISTS vault_items (
  id TEXT PRIMARY KEY,               -- UUID; також вхід для HMAC-деривації subKey
  original_name TEXT NOT NULL,
  encrypted_path TEXT NOT NULL UNIQUE,
  thumb_path TEXT,                   -- окремий зашифрований thumbnail для сітки
  mime_type TEXT,
  size_bytes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  album_id TEXT,
  is_favorite INTEGER DEFAULT 0
  -- IV(12B)+tag(16B) зберігаються префіксом усередині файлу, не в БД
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cover_item_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,             -- зокрема: kdf_salt, kdf_params, schema_version
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_album ON vault_items(album_id);
CREATE INDEX IF NOT EXISTS idx_favorite ON vault_items(is_favorite);
```

## Структура коду

Очікувана конвенція (як у проєкті-дононі): Expo Router у `src/app/`; feature-модулі в
`src/features/<feature>/` (`screens/`, `components/`, `hooks/`, `lib/`) з barrel `index.ts`;
імпорт між фічами через barrel, не глибокими шляхами. Аліаси `@/*` → `src/*`,
`@/assets/*` → `assets/*`. TypeScript strict.

## Етапи (MVP → Pro)

| Етап          | Завдання                                                     | Результат                                 |
| ------------- | ------------------------------------------------------------ | ----------------------------------------- |
| 1. Ядро       | Auth → Argon2id → op-sqlite raw-key init → CRUD              | Вхід за PIN, відкривається зашифрована БД |
| 2. Імпорт     | вибір → AES-256-GCM + thumbnail → `.vault` → INSERT          | Файли в сітці, система їх не бачить       |
| 3. Перегляд   | decrypt-в-пам'ять → memory-only рендер → автоочищення        | Плавний скрол, RAM не переповнюється      |
| 4. Безпека UI | `expo-screen-capture` → blur у background → lock-по-таймауту | Захист прев'ю, автоблокування             |
| 5. Pro        | `react-native-iap` on-device verification → анлок фіч        | Офлайн-валідація покупки                  |

## Compliance (App Store / Google Play)

- **Privacy Policy:** "All media files are encrypted locally using AES-256-GCM. No data
  leaves the device. No analytics, telemetry, or cloud sync."
- **Export Compliance:** AES-256, офлайн особистий security-tool, без експортних обмежень.
- `android:allowBackup="false"` у `AndroidManifest.xml`.
- iOS: `NSFileProtectionComplete` (врахуй: файли недоступні при заблокованому екрані).
- **Ризик реджекту:** категорія «прихований сейф/хованки» Apple ретельно перевіряє
  (Guideline 2.3.1, приховані функції). Для рев'ю давай повноцінний **демо-режим із
  тестовими даними**, а НЕ «вимикання шифрування» (це червоний прапор проти заявленої приватності).

## Як працювати з користувачем

- **Мова відповідей — українська.**
- Формат: чіткі блоки — `Код`, `Пояснення`, `Типові помилки`, `Як уникнути`, `Наступний крок`.
- Точні назви пакетів і версії; за потреби — посилання на npm/docs.
- Якщо рішення може злити дані в RAM/кеш/фон — одразу зазнач ризик і альтернативу.
- Код мінімальний, але production-ready: TypeScript, `async/await`, `try/catch`,
  очищення ресурсів у `finally`.
- Додавай як перевірити на пристрої (напр. Android «Don't keep activities», перевірка
  кешу, симуляція фону).
