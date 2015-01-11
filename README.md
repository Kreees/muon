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

[Модули](#modules)

[Конфигурация проекта](#config) 

[Режимы работы](#server_modes)

[Разработка](#development) 

[Контибуторам](#contrib)

----

<a name='quick_launch'></a>
### Быстрый запуск ####

Для работы с фреймворком требуется установленный в системе Node.js. Последнюю версию интерпретатора можно скачать [с официального сайта](http://nodejs.org/download/).

Чтобы установить Muon.js на Ваш локальный компьютер (Linux либо Mac, возможно Windows) следует выполнить:


```
$ git clone -recursive git@github.com:Kreees/muon.git
$ cd muon
$ npm install
$ npm link . # сделает muon-пакет глобальным среди NPM-пакетов системы
``` 
**Внимание:** muon является полноценным NPM-пакетом, однако текущая версия фреймворка, размещенная в NPM-репозитории <https://www.npmjs.org>, основательно устарела. Поэтому наиболее простой способ работы с библиотекой на текущий момент - использование последней версии проекта из GIT, и установка проекта в виде NPM-модуля глобально в системе.
В этом случае, Muon.js предоставит набор командных утилит, упрощающих работу с фреймворком (более подробно в разделе [Muon CLI](#muoncli))

Чтобы создать и запустить первый проекта на базе Muon.js, выполните:

```sh
$ m-init superproject && cd superproject/
$ npm link muon # необязательно
$ npm install # установка зависимостей по умолчанию
$ m-start
```

Это запустит веб-сервер по адресу: `0.0.0.0:8000`. Можете проверить в Вашем браузере.

<a name='muoncli'></a>
### Muon CLI

В состав фреймворка входят четыре утилиты, помогающие управлять процессом разработки проекта:

#### m-init
Создает директорию и разворачивает в ней шаблонный проект 
```bash
$ m-init <project-name>
```
В результате выполнения команды в директории с именем проекта будет развернут Muon.js проект, включающий в том числе файл `package.json` для управления зависимостями NPM-проекта, а также шаблонный файл конфигурации для запуска веб-сервера.
**Внимание:** выполнение команды приводит только к распаковке шаблона, но не выполняет установку зависимостей. Если Вы намерены использовать модуль `muon` непосредственно из проекта через метод `require`, Вам следует прописать его в файле `package.json` в качестве одной из зависимостей. Как вариант Вы можете сделать линковку модуля из глобального архива пакетов Вашей системы:
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

Любые из указанных параметров становятся приоритетными по отношению к существующей конфигурации и передаются в запускаемый процесс с помощью переменных окружения. Более подробная информация о конфигурировании Muon.js проекта представлена разделе [конфигурирование](#config). 

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
<a name='modules'></a>
### Модульная структура фреймворка
Исходно Muon.js создавался как монолитный клиент-серверный фреймворк и с течением времени превратился в голема.
Чтобы лучше структурировать код, а также упростить процесс сопровождения фреймворка в целом, он был разбит на набор составляющих - независимых модулей, каждый из которых реализует тот или иной аспект поведения веб-приложения. В настоящий момент фреймворк сам по себе не предоставляет средств по управлению веб-проектами, а лишь выступает в роли скелета, обеспечивающего связывание независимых модулей воедино и позволяющего наращивать функциональность, а также внедрять альтернативные реализации тех или иных компонентов фреймворка, не нарушая структуру и принцип работы одностраничных веб-приложений.

Более подробная информация о способах расширения функциональности фреймворка и создании собственных модулей представлена в разделе для [контрибьюторов](#contrib).

На текущий момент фреймворк включает в себя три категории модулей:
##### Служебные
- [Config](/Kreees/muon-config) - модуль формирования актуальной на момент запуска конфигурации проекта
- [Logger](/Kreees/muon-logger) - модуль обслуживания лог-данных приложения
- [Process](/Kreees/muon-process) - модуль управление состоянием запущенного процесса
- [Database](/Kreees/muon-database) - средства, предоставляющие доступ к хранилищу данных приложения (универсальный драйвер базы данных)
- [Migrations](/Neila/muon-migrations) - средства синхронизации описания структур данных (моделей) на стороне сервера кода с соответствующими структурами в составе хранилища (базе данных)
- [Plugins](/Kreees/muon-plugins) - средства обслуживания плагинной структуры Muon.js приложения
- [Utils](/Kreees/muon-utils) - набор утилит-помощников общего назначения
- [Tests utils](/Kreees/muon-testing) - набор утилит-помощников для тестирования Muon.js проектов

##### Серверные
- [HTTP](/Kreees/muon-http) - набор констант протокола HTTP.
- [Server](/Kreees/muon-server) - встроенный веб-сервер на базе библиотеки [Express.js](http://expressjs.com)
- [API](/Kreees/muon-api) - маршрутизатор HTTP-запросов, определяющий API для управления данными в процессе клиент-серверного взаимодействия.
- [Request-processor](/Kreees/muon-request-processing) - серверная реализация контроллера (обработчиков запросов) в рамках архитектуры MVC, используемой Muon.js
- [Models](/Kreees/muon-models) - серверная реализация моделей данных в рамках архитектуры MVC, используемой Muon.js
- [Initializers](/Kreees/muon-initializers) - средства инициализации исходного состояния сервера при запуске Muon.js проекта
- [Helpers](/Kreees/muon-helpers) - реализация общих вспомогательных классов, методов и объектов в составе серверного кода.

##### Клиентские
- [Muon.js](/Kreees/muon-muonjs) - реализация клиентской части одностраничного приложения на базе фреймворка [Backbone.js](http://backbonejs.org)
- [Client compiler](/Kreees/muon-client-compiler) - набор средств для обслуживания и компиляции клиентского кода в одностраничное приложение, а также формирование клиентских пакетов.

Каждый из модулей отражает отдельно взятый аспект работы веб-приложения и должен быть снабжен соответствующей документацией.
Все модули подчиняются общему правилу встраивания в фреймворк, который включает в себя в том числе требования локального юнит и интеграционного тестирования, а также наличие декларированного интерфейса.
<a name='config'></a>
### Конфигурация проекта

Конфигурация проекта включает в себя указание параметров (переменных) проекта, работы веб-сервера, используемых баз данных и плагинов.

Конфигурация проекта может быть выполнена четырьмя способами (в порядке увеличения приоритета):
- значением переменных по умолчанию,
- конфигурационного файла `config.json`, для независимого проекта
- глобальной Node переменной `global.__mcfg__`, создаваемой непосредственно перед подключением модуля `muon` в Вашем проекте (переменная должна содержать JSON-объект, альтернативный содержимогому `config.json` файла),
- с помощью переменных окружения с префиксом `M_`, для запуска проекта в режиме тестирования, либо в `production`-режиме, а также для передачи приватных ключей, не подходящих для хранения в публичных репозиториях.
 
*<small>Далее при описании каждого из параметров конфигурационного файла будет указано соответствующее имя переменной окружения (если имеется), переопределяющей значение данного параметра</small>*

Типовой вариант конфигурационного файла для Muon.js проекта выглядит следующим образом:

```json
{
    "projectName": "My super project",
    "serverMode": "development",
    "autoreload": true,
    "host": "0.0.0.0",
    "port": 8000,
    "protocol": "http",
    "domain": "www.dummy.net",
    "db": {
        "default": true
    },
    "plugins": {
        "extra-plugin": {}
    }
}
```
#### Конфигурация проекта
- `projectName` - имя проекта, если отсутствует, то заимствуется из значения атрибута `name`, содержащегося в файле `package.json`. Если последнее также отсутствует, вычисляется из имени директории, в которой размещен проект.
- `serverMode` - `M_SERVER_MODE` - режим запуска сервера, опредяляющий параметры работы модулей фреймворка (более подробная информация о режимах работы фреймворка [здесь](#server_modes)), по умолчанию `development`.
- `autoreload` - `M_AUTORELOAD` - указание на необходимость перезагрузки программного окружения сервера при наличии изменений в исходном коде (осуществляется при очередном HTTP-запросе), по умолачанию `true` для режима `development` и `false` для всех остальных.

#### Конфигурация веб-сервера
- `host` - `M_SERVER_HOST` - адрес сервера для прослушивания входящих веб-запросов, по умолачанию `0.0.0.0`
- `port` - `M_SERVER_PORT` - TCP-порт веб сервера для прослушивания входящих веб-запросов, по умолчанию `8000`.
- `protocol` - `M_SERVER_PROTOCOL` - тип сетевого соединения для входящих соединений, по умолачанию и пока единственно возможный - `http`.
- `domain` - `M_SERVER_DOMAIN` - имя обслуживаемого домена.

#### Конфигурация хранилища
Фреймворк поддерживает подключение одновременно нескольких баз данных разных типов. Поддержка подключения, ровно как и обслуживание моделей данных осуществляется с помощью сторонней библиотеки [node-orm2](https://github.com/dresende/node-orm2). 

Описание параметров доступа к базам данных должно быть помещено в переменную "db", представленную в формате JSON-объекта. Ключ в объекте определяет альяс подключения, значение - словарь с параметрами. Например:
```json
{
    ...
    "db": {
        "default": {
            "type": "mysql",
            "host": "localhost",
            "user": "user",
            "password": "",
            "database": "general_db"
        },
        "admin_base": {
            "type": "sqlite",
            "path": "./admin.db"
        }
    }
```

В число параметров подключения входят:
- `type` - `M_DB_<alias>_TYPE` - драйвер (тип) для подключения СУБД (более подробно [здесь](https://github.com/dresende/node-orm2/wiki/Connecting-to-Database)), по умолчанию `sqlite`
- `host` - `M_DB_<alias>_HOST` - адрес подключения к серверу СУБД,
- `port` - `M_DB_<alias>_PORT` - порт подключения к серверу СУБД,
- `database` - `M_DB_<alias>_DATABASE` - имя используемой базы,
- `user` - `M_DB_<alias>_USER` - имя пользователя для доступа к серверу СУБД,
- `password` - `M_DB_<alias>_PASSWORD` - пароль для доступа к серверу СУБД,
- `pathname` - `M_DB_<alias>_PATHNAME` - имя файла, для размещения базы (используется только в случае SQLite3)

Среди всех описанных подключений, подключением по умолачанию является запись с именем `default`. При этом для подключения к БД в Muon.js *из коробки* достаточно указать вместо дескриптора значение `true`. Все модели объявленные в проекте, а также плагинах проекта, если явно не указано иначе, будут отнесены к данному подключению (более подробно об этом в описании модуля [muon-models](/Kreees/muon-models)).

При указании значения:
```json
{
    "db": { "default": true }
}
```
в качестве основного подключения будет использована SQLite3 база данных, при этом файл базы будет размещен в директории Вашего проекта (не забудьте добавить паттерн `*.db` в файлы `.gitignore` и `.npmignore`). Имя файла будет определяться названием проекта, псевдонима подключения, а также режима запуска (например, `Project_default_development.db`).

Любой параметр любого из подключений может быть переопределен с помощью переменных окружения, передаваемых при запуске проекта. Наиболее целесообразно это делать при объявлении баз, используемых сервером в режиме `production`. Пример запуска проекта с подмененными параметарми подключения будет выглядеть следующим образом:
```bash
$ M_DB_DEFAULT_HOST=1.1.1.1 M_DB_DEFAULT_USER=dbuser M_DB_DEFAULT_PASSWORD=supersecret m-start
```
Такая методика позволит Вам избежать необходимости хранить параметры подключения, в том числе пароли от баз данных в исходном коде проекта.

#### Конфигурация плагинов
Фреймворк предполагает, что каждый созданный проект может выступать в роли плагина для других проектов. При этом все обяъвленные модели, контроллеры, а также клиентские файлы, входящие в состав плагина, становятся доступны в корневом проекте в выделенном пространестве имен.

Конфигурация плагинов в проекте происходит в переменной `plugins` в составе файла `config.json` при этом значения, хранящиеся в конфигурационном файле не могут быть переопределены с помощью переменных окруждения.

Переменная `plugins` представляет собой JSON-объект, в котором ключи соответствуют именам подключаемых плагинов. В силу того, что добавление плагина в состав проекта осуществляется с помощью подсистемы NPM, указанное имя должно полностью совпадать с именем его NPM-модуля (соответствующие записи должны присутствовать в файле `package.json` в разделе `dependencies`).  Конфигурация для каждого из плагинов представляет собой произвольный JSON-объект (в перспективе соответствующий спецификации плагина). Например:

```json
{
    ...
    "plugins": {
        "muon-extra-plugin": {
            "variable1": "value1",
            "variable2": ["value21","value22"]
        }
    }
}
```
Более подробно о работе плагинов в составе проектов Muon.js вы найдете  в документации к модулю [muon-plugins](/Kreees/muon-plugins).
<a name='server_modes'></a>
### Режимы работы
<a name='development'></a>
### Разработка
В силу обширности фреймворка, достаточно сложно будет уместить на этой странице описание принципов работы фреймворка и аспектов его использования.

Для первого знакомства с фреймворком я рекомендую Вам пройти через [Get Started](/Kreees/muon/wikis/Get-started-tutorial) туториал. 

Для изучения особенностей серверного программирования на Muon.js можете обратиться к [соответствующему разделу](/Kreees/muon/wikis/Server-programming), а также ознакомиться с документацией к **Серверным** и **Служебным** модулям фреймворка. Также я рекомендую изучить работу следующих сторонних Node.js модулей:
- [express](http://expressjs.com/)/[connect](https://github.com/senchalabs/connect) - фреймворк для построения веб-серверов на базе Node.js
- [node-orm2](https://github.com/dresende/node-orm2) - ORM (Object-Relational Mapping) библиотека для управления записями баз данных из JavaScript-кода в объектно-ориентированной манере.
- [Q](https://github.com/kriskowal/q) - одна из реализаций Promise технологии , активно используемой в программах на JavaScript.

Для изучения клиентской составляющей фреймворка Вы также можете посетить соответствующий раздел [wiki](/Kreees/muon/wikis/Client-programming), либо описание модуля [muon-muonjs](Kreees/muon-muonjs). Реализация одностраничных приложений выполнена на базе бибилотеки [Backbone.js](http://backbonejs.org). Присутствующая на сайте данной библиотеки документация также поможет ускорить знакомство с Muon.js.

<a name='contrib'></a>
    
### Разработка фреймворка

___

### Лицензия


Muon.js распространяется под [MIT](http://opensource.org/licenses/MIT) лицензией .

