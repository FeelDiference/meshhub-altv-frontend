# 🚀 Инструкция по сборке

## Сборка проекта

```bash
# Собрать проект
npm run build
```

**Вот и всё!** 🎉

## Что происходит при сборке?

1. ✅ **Очистка старых файлов** - автоматически удаляются старые билды из `client/assets/`
2. ✅ **Компиляция TypeScript** - проверка типов и транспиляция
3. ✅ **Сборка Vite** - оптимизация и минификация
4. ✅ **Автодеплой** - файлы попадают в `../altv-server/resources/meshhub/client/`

## Куда попадают файлы?

```
meshhub_altv_integration/
└── npm run build
         ↓
../altv-server/resources/meshhub/client/
├── script.js                    ← ALT:V клиентский скрипт (НЕ трогается)
├── modules/                     ← ALT:V модули (НЕ трогаются)
├── index.html                   ← Точка входа WebView (обновляется)
└── assets/                      ← React билд (очищается и обновляется)
    ├── index-[hash].js          ← Основной бандл
    ├── index-[hash].css         ← Стили
    └── uploadService-[hash].js  ← Чанк для загрузок
```

## Хеши в именах файлов

Vite автоматически добавляет уникальные хеши в имена файлов (например, `index-Cc0vR7ke.js`):
- 📦 **Для кэширования** - браузер закэширует файл навсегда
- 🔄 **При изменениях** - хеш меняется, браузер загружает новую версию
- 🧹 **Старые файлы** - автоматически удаляются благодаря `emptyOutDir: true`

## Разработка

```bash
# Режим разработки (Hot Reload)
npm run dev

# Открыть браузер на http://localhost:3000
```

## Важные файлы

- `vite.config.ts` - конфигурация сборки (настроен автодеплой)
- `client/src/` - исходный код React приложения
- `client/index.html` - шаблон HTML
- `client/src/main.tsx` - точка входа

## Troubleshooting

### Старые файлы не удаляются?

```bash
# Очистить вручную
rm -rf ../altv-server/resources/meshhub/client/assets/*
rm -f ../altv-server/resources/meshhub/client/index.html

# Пересобрать
npm run build
```

### Изменения не видны в игре?

1. Убедитесь что сервер перезапущен
2. Очистите кэш браузера в Alt:V (F5 в WebView)
3. Проверьте что файлы обновились: `ls -la ../altv-server/resources/meshhub/client/assets/`

## См. также

- [DEPLOYMENT_RULES.md](../DOCS/DEPLOYMENT_RULES.md) - правила развертывания
- [package.json](package.json) - скрипты и зависимости
- [vite.config.ts](vite.config.ts) - конфигурация Vite

