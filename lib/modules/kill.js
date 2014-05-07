function exit(){
    require("fs").writeFileSync(".muon","");
    process.exit();
}

process.on('SIGINT',exit);
process.on('exit',exit);