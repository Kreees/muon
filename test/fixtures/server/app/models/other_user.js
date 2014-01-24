module.exports = {
    extends: "user",
    attrs: {
        "type": "number",
        "other": "string"
    },
    collectionName: "dummy_collection_name",
    db: "default",
    methods: {
        "run": function(){/*do run*/ return;}
    },
    hooks: {
        afterLoad: function(){
            this.dummyAttribute = "attr"
        }
    }
}