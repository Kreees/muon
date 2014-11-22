<img src='https://raw.githubusercontent.com/Kreees/muonjs.com/master/client/assets/img/logo_muon_new.png' width='300'></img>
<br>
<br>
<br>

Client-server Node.js  web framework for single page applications building.

It's in the state of tough development, so don't rely on its description and functionality =) 
<br>
<br>

### Table of contents ####

<br>
[Quick Launch](#quick_launch)  

[Muon CLI](#muoncli)  

[Application configuration](#config)   

[Development](#development)  

[Plugins](#plugins)   

[Modules](#modules)  

[Contributing](#contrib)  


----

<a name='quick_launch'></a>
### Quick launch ####

Make sure Node.js is installed. You could download the latest version from [its official site](http://nodejs.org/download/).
<br>
<br>

To install Muon.js on the localhost (supposed Linux of Mac but Windows should be ok too):


```
$ git clone git@github.com:Kreees/muon.git
$ cd muon
$ npm install
$ npm link . # this makes global link of Muon in your system
``` 
**Warning:** current muon NPM package in <https://www.npmjs.org> repository is totally outdated, so be aware when using Muon.js as Node.js module in your project. The most safe way to run muon-based application is using [Muon-CLI](#muoncli).
<br>
<br>

To create and start new Muon-based project:

```sh
$ m-init superproject # extract template project
$ cd superproject/
$ npm link muon # not mandatory in case you don't require("muon")
$ npm install # install other dependencies
$ m-start
```

Web server within Muon will be started at: `0.0.0.0:8000`

<br>
<a name='muoncli'></a>
### Muon CLI ####

<br>
<a name='config'></a>
### Application configuration ####

<br>
<a name='development'></a>
### Development ####

<br>
<a name='plugins'></a>
### Plugins ####



<br>
<a name='modules'></a>
### Modules ####


Muon is modular framework and consists of list of modules

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

### License ####


Muon is released under the [MIT License](http://opensource.org/licenses/MIT).

