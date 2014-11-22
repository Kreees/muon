<br>
<a name='muon'></a>
Muon.js
=======
<br>

Client-server Node.js  web framework for single page applications building.

It's in the state of tough development, so don't rely on its description and functionality =) 
<br>
<br>

### Table of contents ####

<br>
[Quick Launch](#quick)  

[Muon CLI](#cli)  

[Application configuration](#config)   

[Development](#development)  

[Plugins](#plugins)   

[Modules](#modules)  

[Contributing](#contrib)  


----

<a name='quick_launch'></a>
### Quick launch

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
**Warning:** current muon NPM package in <https://www.npmjs.org> repository is totally outdated, so be aware when using Muon.js as Node.js module in your project. The most safe way to run muon-based application is using [Muon-CLI](#cli).
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
<a name='cli'></a>
### Muon CLI

<br>
<a name='config'></a>
### Application configuration

<br>
<a name='development'></a>
### Development

<br>
<a name='plugins'></a>
### Plugins



<br>
<a name='modules'></a>
### Modules


Muon is modular framework and consists of list of modules

- [API](/Kreees/muon-api) - router processing all application client-server communication within MVC architecture
- Client-compiler - bunch of methods to prepare single HTML-page and all its additions
- Config - module for parsing application configuration files
- Database - database provider based on [node-orm2](https://github.com/dresende/node-orm2)
- Express - basic Express 
- Helpers - 
- HTTP - 
- Initializers - 
- Logger - loggin subsystem
- Migrations - module versioning database development states
- Models - models realization within MVC Muon.js architecture based on [node-orm2](https://github.com/dresende/node-orm2)
- Muon.js - client part of framework
- Plugins - supports of  
- Process - process management subsystem.
- Request-processor - controllers realization within MVC Muon.js architecture
- Server - 
- Tests - 
- Utils - 

<br>
<a name='contrib'></a>
### Contributing
___

###License


Muon is released under the [MIT License](http://opensource.org/licenses/MIT).

