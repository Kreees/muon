module.exports = {
    prepare: function(data){
        data = data.replace(/\/\*[\s\S]*?\*\//g,"");
        var offset = data.indexOf("{");
        var left_data = data;
        var section_count = 0;
        var subsection_count = 0;
        var title = data.substr(0,offset).replace(/^\s+|\s+$/g,"")
        left_data = left_data.substr(left_data.indexOf("{")+1);
        left_data = left_data.substr(0,left_data.lastIndexOf("}"));

        var sections = [];
        var section = null;

        try{
        while(1){
            var open_pos = left_data.indexOf("{");
            var close_pos = left_data.indexOf("}");
            if (close_pos == -1 && open_pos == -1) break;
            if ((open_pos < close_pos) && (open_pos != -1)){
                subsection_count++;
                if (!section){
                    section = {
                        title: left_data.substr(0,open_pos).replace(/^\s+|\s+$/g,""),
                        open: offset + open_pos + 1
                    }
                    sections.push(section);
                }
                left_data = left_data.substr(open_pos+1);
                offset += open_pos + 1;
            }
            else{
                subsection_count--;
                if (subsection_count < 0) {
                    m.log("Wrong less data");
                    return data;
                }
                if (subsection_count == 0) {
                    section_count++;
                    section.close = offset + close_pos + 2;
                    section = null;
                }
                left_data = left_data.substr(close_pos+1);
                offset += close_pos + 1;
            }
        }
        }
        catch(e){console.log(e.message);}

        var new_data = [];

        for(var i = 0, len = sections.length; i < len; i++){
            var s = sections[i];
            var sect_data = data.substring(s.open, s.close);
            if (s.title.match(/^@media/))
                new_data.push(s.title +" { " +title + "{ & "+ sect_data + " } }");
            else
                new_data.push(title +" { " + s.title + sect_data + " }");
        }
        new_data = new_data.join(" ");
        return new_data;
    }
}