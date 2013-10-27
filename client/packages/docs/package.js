module.exports = {
    name: "docs",
    dependencies: [],
    use_app_layout:true,
    models: ["doc.*"],
    pages: ["*"],
    middleware: [],
    routes: [
        {
            route: "",
            redirect: "start"
        },
        {
            route: "start"
        },
        {
            page: "index",
            route: ":type",
            callback: "index"
        },
        {
            page: "description",
            routes:{
                ":type/:id": "abstract_description",
                "file/:id": "file_page",
                "file/:id/:line": "file_page"
            }
        }
    ],
    surrogate: {
        "index": function(type){
            var coll = new m.collections["/apis/doc.doc_item."+type];
            coll.fetch();
            m.setProjection("doc.index.list", coll);
        },
        "abstract_description": function(type,id){
            m.setProjection("doc.description.summary",new m.models["doc.doc_item."+type](id));
        },
        "file_page": function(name,line){
            m.setProjection("doc.description.summary",new m.models["doc.doc_item.file"](name));
        }
    },
    ready: function(callback){
        m.Collection.extend({url: "/apis/doc.doc_item.namespace",model: m.models["doc.doc_item.namespace"]});
        m.Collection.extend({url: "/apis/doc.doc_item.topic",model: m.models["doc.doc_item.doc_itemtopic"]});
        m.Collection.extend({url: "/apis/doc.doc_item.subtopic",model: m.models["doc.doc_item.subtopic"]});
        m.Collection.extend({url: "/apis/doc.doc_item.attribute",model: m.models["doc.doc_item.attribute"]});
        m.Collection.extend({url: "/apis/doc.doc_item.file",model: m.models["doc.doc_item.file"]});
        m.Collection.extend({url: "/apis/doc.doc_item.method",model: m.models["doc.doc_item.method"]});
        m.Collection.extend({url: "/apis/doc.doc_item.class",model: m.models["doc.doc_item.class"]});
        callback();
    }
};