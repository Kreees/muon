<a name='muon'></a>
Muon.js
=======
<br>

Клиент-серверный Node.js веб-фреймворк для создания одностраничных приложений.
Проект находится в стадии глубокой разработки, так что адекватность работы и полное соответствие документации не гарантируется =)
<br>
<br>

### Содержание ####

<br>
[Быстрый запуск](#quick_launch)

[Muon CLI](#muoncli)  

[Конфигурация проекта](#config) 

[Разработка](#development) 

[Плагины](#plugins)

[Модули](#modules)

[Контибуторам](#contrib)

----

<a name='quick_launch'></a>
### Быстрый запуск ####

Для работы с фреймворком требуется установленный в системе Node.js. Последнюю версию интерпретатора можно скачать [с официального сайта](http://nodejs.org/download/).

Чтобы устновить Muon.js на Ваш локальный компьютер (Linux либо Mac, возможно Windows) следует выполнить:


```
$ git clone git@github.com:Kreees/muon.git
$ cd muon
$ npm install
$ git submodule init
$ git submodule update
$ npm link . # сделает muon-пакет глобальным среди NPM-пакетов системы
``` 
**Внимание:** muon является полноценным NPM-пакетом, однако текущая версия фреймворка, размещенная в NPM-репоитории <https://www.npmjs.org>, основательно устарела. Поэтому наиболее простой способ работы с библиотекой на текущий момент - использование последней версии проекта из GIT, и устновка проекта в виде NPM-модуля глобально в системе.
В этом случае, Muon.js предоставит набор командных утилит, упрощающих работу с фреймворком (более подробно в разделе [Muon CLI](#muoncli))

Чтобы создать и запустить первый проекта на базе Muon.js, выполните:

```sh
$ m-init superproject && cd superproject/
$ npm link muon # необязательно
$ npm install # устновка зависимостей по умолчанию
$ m-start
```

Это запустит веб сервер по адресу: `0.0.0.0:8000`. Можете проверить ваш браузер.

<a name='muoncli'></a>
### Muon CLI

В состав фреймворка входят четыре утилиты, помогающие управлять процессом разработки проекта:

#### m-init
Создает директорию и разварачивает в ней шаблонный проект 
```bash
$ m-init <project-name>
```
В результате выполнения команды в директории с именем проекта будет развернут Muon.js проект, включающий в том числе файл `package.json` для управления зависимостями NPM-проекта, а также шаблонный файл конфигурации для запуска веб-сервера.
**Внимание:** выполнение команды приводит только к распаковке шаблона, но не выполняет устновку зависимостей. Если вы намерены использовать модуль `muon` непосредственно из проекта через метод `require` возможно вы захотите прописать его в файле `package.json` в качестве одной из зависимостей. Как вариант вы можете сделать линковку модуля из глобального архива пакетов Вашей системы:
```bash
$ npm link muon
```
#### m-console
Запускает Node интерпретатор с включенной историей команд (на базе Node модуля [REPL](http://nodejs.org/api/repl.html)), предварительно запустив окружение muon-проекта.
```bash
$ m-console
Mode development is loaded.
>
```
команда не принимает никаких аргументов и запускает проект исходя из текущего состояния [конфигурационных файлов](#config).
Инициализированное программное окружение фреймворка предоставляет доступ ко всем инструментам ферймворка, включая плагины, модели, встроенный веб-сервер, средства логирования, константы и т.д. Более подробную информацию Вы найдете в разделе [Разработка](#development)
#### m-start 
Запускает проект на исполнение. В отличие от предыдущей команды позволяет указать параметры запуска сервера и не предоставляет доступ к интерпретатору.
В качестве аргументов при вызове утилиты могут быть переданы:
- `-h|--host <IP-address>` - хост (сетевой адрес, к которому будет привязан веб-сервер)
- `-p|--port <TCP port>` - порт прослушивания входящих соединений
- `-d|--daemon` - указание на демонизацию процесса
- `-l|--log <path>` - имя файла, либо сетевой адрес для отправки лога STDIN
- `-e|--error <path>` - имя файла, либо сетевой адрес для отправки лога STDERR
- `-P|--pid <path>` - имя пути, в котором должен быть сохранен PID запущенного процесса
- `<server mode>` - режим запуска сервера

Любые из указанных параметров стоновятся приоритетными по отношению к существующей конфигурации и передаются в запускаемый процесс с помощью переменных окружения. Более подробная ифнормация о конфигурировании Muon.js проекта представлена разделе [конфигурирование](#config). 

#### m-kill

Убивает запущенный Muon.js проект, путем отправки процессу POSIX сигнала SIGINT. Выбор процесса для остановки осуществляется по PID, передаваемому напрямую в качестве аргумента:
```bash
$ m-kill 12345
```
либо в виде пути к PID-файлу:
```bash
$ m-kill /var/run/project.pid
```
либо при запуске утилиты без аргументов из корневой директории проекта.

#### m-pack-client
Формирует архив клиентской части приложения путем компиляции всех клиентских файлов/шаблонов и помещает результат в директорию `/public`, которая используется в качестве директории размещения статических файлов веб-сервера.
Данная утилита может использоваться как для подготовки файлов в режиме сервера `production`, так и для создания безсерверных HTML-приложений, в том числе для мобильных устройств.
Программа принимает следующий набор аргументов:
- `-d|--domain <domain>`  - домен, по которому размещается обслуживающий сервер приложения. По умолчанию соответствует конфигурации проекта.
- `-s|--secure`  - указание на использование протокола HTTPS вместо HTTP.
- `-i|--input <path>` - исходный HTML-файл клиентского приложения. По умолчанию `client/index.html`.
- `-p|--package <package>`  - базовый пакет, являющийся точкой входа в клиентское приложение. По умолчанию `application`.
- `-l|--lang <language>`  - основной язык клиентского интерфейса. По умолчанию `default` язык проекта.
- `-a|--arch`  - флаг необходимости формирования GunZip архива, вместо директории.
- `-o|--output <path>`  - имя выходной директории, либо архива. По умолчанию './public'.

Архив сформированный с помощью данной утилиты может быть использован для создания мобильного HTML-приложения на базе Titanium SDK. Более подробная информация представлена в описании проекта [muon-titanium-template](https://github.com/Kreees/muon-titanium-template).

<br>
<a name='config'></a>
### Конфигурация проекта

<br>
<a name='development'></a>
### Разработка

<br>
<a name='plugins'></a>
### Плагины



<br>
<a name='modules'></a>
### Модульная структура фреймворка

Исходно мюон создавался как монолитный клиент-серверный фреймворк, который с течением времени разросся до неимоверных размеров.
Чтобы упорядочить структуру кода и проекта в целом он был разбит на набор составляющих, каждая из которых реализует тот или иной аспект поведения веб-приложения в целом

- [API](/Kreees/muon-api) - router processing client-server communication within MVC architecture
- [Client-compiler](/Kreees/muon-client-compiler) - bunch of methods to prepare single HTML-page and all its additions and dependencies
- [Config](/Kreees/muon-config) - module for parsing application configuration files
- [Database](/Kreees/muon-database) - database provider based on [node-orm2](https://github.com/dresende/node-orm2)
- [Express](/Kreees/muon-express) - basic [Express.js](http://expressjs.com) wrapper for framework 
- [Helpers](/Kreees/muon-helpers) - server-side helpers support
- [HTTP](/Kreees/muon-http) - HTTP standard application
- [Initializers](/Kreees/muon-initializers) - server-side data initialization support
- [Logger](/Kreees/muon-logger) - loggin/debug subsystem
- [Migrations](/Neila/muon-migrations) - module for versioning database development states
- [Models](/Kreees/muon-models) - models realization within MVC Muon.js architecture based on [node-orm2](https://github.com/dresende/node-orm2)
- [Muon.js](/Kreees/muon-muonjs) - client part of framework
- [Plugins](/Kreees/muon-plugins) - supports of plugins for Muon.js applications
- [Process](/Kreees/muon-process) - process management subsystem.
- [Request-processor](/Kreees/muon-request-processing) - controllers realization within MVC Muon.js architecture
- [Server](/Kreees/muon-server) - [Express.js](http://expressjs.com) based web server
- [Tests](/Kreees/muon-testing) - common utils for testing
- [Utils](/Kreees/muon-utils) - common utils and dependency referencies

<br>
<a name='contrib'></a>
### Contributing
___

### License


Muon is released under the [MIT License](http://opensource.org/licenses/MIT).

