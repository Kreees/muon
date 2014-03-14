var args = {
        index_file: "client/index.html",
        default_pack: "application",
        output_name: "output",
        domain: undefined,
        port: undefined,
        arch: true,
        lang: "default",
        secure: false
    },
    arg = false;

var wait_next = false;

var error = function(msg){
    console.error(msg);
    console.error("Use: "+process.argv[1]);
    console.error("\t[-d|--domain] <domain>  - host domain for data access. Deafult is config domain.");
    console.error("\t[-P|--port <port>]  - host port for data access. Default is 80.");
    console.error("\t[-a|--arch]  - compress dir with client to archive. Default is true.");
    console.error("\t[-i|--input <file>] - main HTML file without extension. Default is 'client/index.html'.");
    console.error("\t[-p|--package <package>]  - base package name instead of application pack. Default is 'application'.");
    console.error("\t[-l|--lang <language>]  - inerface language. Default is 'default' project language.");
    console.error("\t[-o|--output <output>]  - output arch name without extension. Default is 'output'.");
    console.error("\t[-s|--secure]  - enables HTTPS protocol.");
    process.kill();
}

var light_error = function(msg){
    console.error(msg);
    process.kill();
}

for(var i = 2, len = process.argv.length; i < len; i++){
    var arg = process.argv[i];
    if (wait_next){
        args[wait_next] = arg;
        wait_next = false;
        continue;
    }
    if (/^(-i)|(--index)$/.test(arg)){
        wait_next = "index_file";
        continue;
    }
    if (/^(-p)|(--package)$/.test(arg)){
        wait_next = "default_pack";
        continue;
    }
    if (/^(-o)|(--output)$/.test(arg)){
        wait_next = "output_name";
        continue;
    }
    if (/^(-d)|(--domain)$/.test(arg)){
        wait_next = "domain";
        continue;
    }
    if (/^(-P)|(--port)$/.test(arg)){
        wait_next = "port";
        continue;
    }
    if (/^(-s)|(--secure)$/.test(arg)){
        args.secure = true;
        continue;
    }
    error("Unknown option: '"+arg.replace(/^-*/,"")+"'. Exiting...")
}

module.exports = args;