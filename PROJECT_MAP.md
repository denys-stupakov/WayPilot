# WayPilot — карта проекта

Приложение для построения и **сравнения двух автомобильных маршрутов** по дорогам Словакии.
Пользователь ставит остановки на карте, выбирает два режима прокладки (например «самый короткий» против «объезд светофоров»), и backend параллельно считает оба маршрута алгоритмом A*, стримя результат в браузер.

---

## 1. Технологический стек

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, Vite 7, Leaflet + react-leaflet, Tailwind 4, framer-motion, @dnd-kit / @hello-pangea/dnd (drag-and-drop), axios, uuid |
| Backend | Node.js, Express 5, Server-Sent Events (SSE), собственный A* поверх графа |
| Пространственный поиск | kd-дерево (`kdt`, `kdbush`, `geokdbush`) для привязки клика к ближайшему узлу |
| Данные | `sk_roads_with_signals.ndjson` — дороги Словакии из OSM + точки светофоров |
| Инфраструктура | Docker + docker-compose (backend :3001, frontend :5173) |

---

## 2. Структура репозитория

```
WayPilot/
├── docker-compose.yml         # backend :3001, frontend :5173
├── backend/
│   ├── server.js              # Express + SSE-эндпоинт /route-stream
│   ├── getRoads.js            # парсинг NDJSON, дефолтные теги дорог, вызов mergeRoads
│   ├── buildGraph.js          # сборка графа из дорог и узлов
│   ├── sk_roads_with_signals.ndjson   # исходные данные (OSM)
│   ├── tests/                 # тесты алгоритмов (node:test), запуск: npm test
│   └── algorithms/
│       ├── Graph.js           # структура графа: adj-список + edgeMap
│       ├── nodes.js           # класс Nodes + mergeRoads / mergeAttributes
│       ├── astar.js           # A* + все профили маршрутизации + fallback по ёмкости
│       ├── MinHeap.js         # бинарная куча с updatePriority (приоритетная очередь A*)
│       └── fastHaversine.js   # расстояние между координатами (метры)
└── frontend/
    ├── vite.config.js         # host:true, port 5173
    └── src/
        ├── main.jsx / App.jsx # точка входа, оборачивает всё в ErrorBoundary
        ├── OSMRoads.jsx        # ГЛАВНЫЙ компонент: состояние, SSE-клиент, карта
        ├── leafletFix.js       # фикс иконок маркеров Leaflet
        └── components/
            ├── CompareRoutes.jsx    # панель выбора двух режимов + вес ТС
            ├── LocationMarker.jsx   # клик по карте → добавление остановки
            ├── StopsReorderBar.jsx  # переупорядочивание остановок (drag-and-drop)
            ├── RoutesSidebar.jsx     # список маршрутов, вкл/выкл видимости
            ├── SortableItem.jsx / Draggable.jsx / Droppable.jsx  # обёртки dnd
            └── ErrorBoundary.jsx
```

---

## 3. Поток данных (end-to-end)

```
                       СТАРТ СЕРВЕРА (один раз)
  sk_roads_with_signals.ndjson
        │  getRoads()  → парсинг строк, дефолтные теги по типу дороги,
        │                пометка светофоров, mergeRoads() (склейка сегментов)
        ▼
   { roads, nodes }
        │  buildGraph()  → рёбра между «важными» узлами, длина, minRadius, теги
        ▼
   graph  +  kd-дерево (kdt) по важным узлам
        │
        └───────────────── сервер готов, слушает :3001

                       ЗАПРОС МАРШРУТА (на каждый клик «Сравнить»)
  Браузер (OSMRoads.jsx)
        │  EventSource GET /route-stream?stops=...&mode1=...&mode2=...&vehicleWeight=...
        ▼
  server.js  для каждой пары соседних остановок:
        │  findNearest(lat,lon) — привязка к узлу (kd-дерево, лимит 5 км)
        │  astar(graph, nodes, startId, endId, {profile: mode1})  → event: route1
        │  astar(graph, nodes, startId, endId, {profile: mode2})  → event: route2
        │  (между отправками setImmediate — сброс буфера)
        ▼
  Браузер: handleRouteUpdate() рисует Polyline на Leaflet,
           обновляет остановки на «примагниченные» координаты (snapped)
```

Ключевая идея архитектуры: **тяжёлый препроцессинг (парсинг + граф) делается один раз при старте**, а на каждый запрос выполняется только A* по готовому графу. Маршруты отдаются потоком через SSE, поэтому первый маршрут появляется на карте, пока считается второй.

---

## 4. Модель графа и данных

**Узлы (`nodes.js`).** Координата `lat,lon` дедуплицируется в целочисленный `nodeId` (`getOrCreateNode`). «Важные» узлы — концы дорог, перекрёстки (степень > 1) и светофоры; только они попадают в граф как вершины. Промежуточные точки сохраняются как `pathSegments` — геометрия для отрисовки линии.

**Рёбра (`Graph.js`).** Хранятся в двух структурах: `adj` (список смежности для обхода) и `edgeMap` с ключом `"from,to"` (быстрый доступ к весам/тегам ребра). У ребра есть `distance`, `weights` (lanes, maxspeed, maxweight, maxheight, maxwidth, hgv, smoothness, minRadius) и `tags` (highway).

**Склейка дорог (`mergeRoads`).** Дороги группируются в «корзины» по одинаковым атрибутам, затем цепочки последовательных сегментов сливаются вперёд и назад в одну дорогу. Уменьшает число рёбер и ускоряет A*.

---

## 5. Профили маршрутизации (`astar.js` → `PROFILES`)

Все профили используют один и тот же A*; отличаются только функцией стоимости `cost`, эвристикой `heuristic` и опциональным фильтром `canTraverse`.

| Профиль (значение в UI) | Что оптимизирует |
|-------------------------|------------------|
| `shortest` | Минимальная длина |
| `fastest` | Минимальное время (distance / maxspeed) |
| `avoidTrafficLights` | Время + штраф за проезд светофора |
| `smoothness` | Длина × коэффициент качества покрытия |
| `hgv` | Грузовики: множители по типу дороги и полосам; фильтр по `hgv=no` и `maxweight` |
| `weight` | Кратчайший путь с ограничением по массе ТС |

Эвристика A* всегда допустимая (admissible): для расстояния — haversine, для времени — расстояние / максимально возможная скорость (130 км/ч).

---

## 6. Как запустить

```bash
docker compose up          # backend :3001, frontend :5173
cd backend && npm test     # тесты алгоритмов (node:test)
```

Frontend берёт адрес API из `VITE_API_URL` (см. `.env`, он в `.gitignore`).

---

## 7. Тесты

Каталог `backend/tests/` (встроенный `node:test`, без зависимостей), запуск `npm test`.
Покрыты самые хрупкие места: A* и все 5 UI-профилей, `MinHeap` (decrease-key + стресс),
`mergeRoads`, `buildGraph`, фильтры массы и `hgv=no`, светофоры, `fastHaversine`.
Смысл — чтобы будущие правки профилей или графа не сломали маршрутизацию молча.

---

## 8. Состояние кода (после ревью 2026-07-02)

Исправлено: невалидные дефолты профиля + отсутствие try/catch в `/route-stream`
(могли ронять SSE-запрос), единый JSON-формат ошибок, стабильный `id` дороги,
сброс веса ТС на 7.5, корректная нумерация сегментов в `RoutesSidebar`.

Удалён мёртвый код: `frontend/src/preprocess.js`, `algorithms/calculateMinRadius.js`,
класс `Edge` и методы `getSortedEdges`/`getSmallestWeight` в `Graph.js`,
отладочные `console.log`.

Подробности — в `CODE_REVIEW.md`.
