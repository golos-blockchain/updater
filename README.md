# Golos Updater

Golos Blockchain постоянно развивается, появляются новые десктопные, мобильные приложения, расширения для браузеров и другие компоненты.

Данный сервис позволяет хранить разные версии приложений, расширений и других дистрибутивов, с возможностью отдавать эти версии как в виде дерева файлов, так и в виде JSON API, чтобы клиенты могли автоматически проверять обновления и обновляться.

## Использование

В docker-compose.yaml необходимо заполнить папку files.

В ней создаются папки вида `имя_приложения-платформа`, например `desktop-win` или `messenger-android`.

В этой папке размещаются файлы с именами в формате:
- `имя_продукта-версия.exe`
- `имя_продукта-версия.txt`

где имя_продукта - это просто имя файла (совпадение с именем приложения необязательно), а версия - это версия в формате 1.0.0, с двумя точками.

Вместо `.exe` может быть любое другое расширение, кроме `.txt`

`.txt` - это информация о данном релизе. Будет отображаться, когда пользователю будет предложено скачать его.

Сборка и запуск:

```sh
docker compose build
docker compose up
```

