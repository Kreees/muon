module.exports = {
    prepare: function(data){
        data = data.replace(/\/\*[\s\S]*?\*\//g,"");
        var offset = data.indexOf("{");
        var leftData = data;
        var sectionCount = 0;
        var subsectionCount = 0;
        var title = data.substr(0,offset).replace(/^\s+|\s+$/g,"")
        leftData = leftData.substr(leftData.indexOf("{")+1);
        leftData = leftData.substr(0,leftData.lastIndexOf("}"));

        var sections = [];
        var section = null;

        try{
        while(1){
            var openPos = leftData.indexOf("{");
            var closePos = leftData.indexOf("}");
            if (closePos == -1 && openPos == -1) break;
            if ((openPos < closePos) && (openPos != -1)){
                subsectionCount++;
                if (!section){
                    section = {
                        title: leftData.substr(0,openPos).replace(/^\s+|\s+$/g,""),
                        open: offset + openPos + 1
                    }
                    sections.push(section);
                }
                leftData = leftData.substr(openPos+1);
                offset += openPos + 1;
            }
            else{
                subsectionCount--;
                if (subsectionCount < 0) {
                    m.log("Wrong less data");
                    return data;
                }
                if (subsectionCount == 0) {
                    sectionCount++;
                    section.close = offset + closePos + 2;
                    section = null;
                }
                leftData = leftData.substr(closePos+1);
                offset += closePos + 1;
            }
        }
        }
        catch(e){console.log(e.message);}

        var newData = [];

        for(var i = 0, len = sections.length; i < len; i++){
            var s = sections[i];
            var sectionData = data.substring(s.open, s.close);
            if (s.title.match(/^@media/))
                newData.push(s.title +" { " +title + "{ & "+ sectionData + " } }");
            else
                newData.push(title +" { " + s.title + sectionData + " }");
        }
        newData = newData.join(" ");
        return newData;
    }
}