var path = require('path');
var fixtPath = path.normalize(path.resolve(m.__syspath+'/test/fixtures'));
var fixtServerPath = path.normalize(path.resolve(m.__syspath+'/test/fixtures/server/app'));

var checkController = function(type,ctrlr,path,sup){
    ctrlr.should.ownProperty("super",type+" controller should have super controller reference");
    ctrlr.should.ownProperty("actions",type+" controller should have dictionary actions");
    ctrlr.should.ownProperty("extend",type+" controller should have method extend");
    ctrlr.should.ownProperty("permissions",type+" controller should have property permissions");
    ctrlr.should.ownProperty("dependencies",type+" controller should have property dependencies");
    ctrlr.should.ownProperty("modulePath",type+" controller should have property modulePath");
    ctrlr.should.ownProperty("pluginName",type+" controller should have property pluginName");

    ctrlr.modulePath.should.be.equal(path);
    ctrlr.super.should.be.equal(sup);
    ctrlr.pluginName.should.be.equal("DUMMY");
}

describe('MODELS module', function(){
    before(function(){
        this.module = require('./models');
        this.cfg = {
            path: fixtPath,
            name: "DUMMY"
        };
    });

    it('should return a scope with "User" model instance', function(done){
        try{
        this.module.init(this.cfg).done(function(scope){
            try {
            scope.should.ownProperty("models");
            scope.should.ownProperty("modelNames");
            scope.should.ownProperty("urlAccess");


            scope.modelNames.should.include('user');
            var User = scope.models.user;

            User.should.ownProperty("attributes");
            User.should.ownProperty("db");
            User.should.ownProperty("dbName");
            User.should.ownProperty("collection");
            User.should.ownProperty("collectionName");
            User.should.ownProperty("controller");
            User.should.ownProperty("fullName");
            User.should.ownProperty("id");
            User.should.ownProperty("idName");
            User.should.ownProperty("model");
            User.should.ownProperty("modelName");
            User.should.ownProperty("modulePath");
            User.should.ownProperty("pluginName");
            User.should.ownProperty("objects");
            User.should.ownProperty("scopes");
            User.should.ownProperty("url");
            User.should.ownProperty("validations");

//            attributes and properties

            User.properties.should.be.instanceOf(Object);
            User.properties.should.ownProperty("nick");
            User.properties.should.ownProperty("password");
            User.properties.should.ownProperty("created_at");
            User.properties.should.ownProperty("modified_at");

//            db && dbName

            User.db.should.be.equal("default");
            User.db.should.be.equal(User.dbName);

//            collectionName

            User.collection.should.be.equal("DUMMY_user");
            User.collection.should.be.equal(User.collectionName);

//            controller

            User.controller.should.be.instanceOf(Object);

            checkController("Model",
                            User.controller,
                            path.normalize(fixtServerPath + "/controllers/user.js"),
                            require(path.normalize(fixtServerPath + "/controllers/user.js"))
            );

//            fullName

            User.fullName.should.be.equal("DUMMY:user");

//            id && idName

            User.id.should.be.eql(["_id"],"id should be an array of id attributes");
            User.id.should.be.eql(User.idName,"idName duplicates id attribute");

//            model

            User.model.should.be.equal(User,"model should refers to itself via model attr");

//            modelName

            User.modelName.should.be.equal("user","moduleName should be a name of file (with dot separated dirs)");

//            modulePath

            User.modulePath.should.be.equal(path.normalize(fixtServerPath + "/models/user.js"),"modulePath should be an exact path to file with model description")

//            pluginName

            User.pluginName.should.be.equal("DUMMY","pluginName should be equal DUMMY");

//            objects

            User.objects.should.be.instanceOf(Object,"Should be an objects dictionary to be defined");
            User.objects.should.ownProperty("obj1");
            User.objects.should.ownProperty("obj2");
            User.objects.should.ownProperty("obj3");

            User.objects.obj1.should.have.keys(["objectName","controller","model","modelName"],"Model Object should have keys");
            User.objects.obj1.model.should.be.equal(User);
            User.objects.obj1.modelName.should.be.equal(User.modelName);
            User.objects.obj1.objectName.should.be.equal("obj1");

            checkController("Object",
                User.objects.obj1.controller,
                path.normalize(fixtServerPath + "/controllers/user/obj1.js"),
                User.controller
            );

//            scopes

            User.scopes.should.be.instanceOf(Object,"Should be a scopes dictionary to be defined");
            User.scopes.should.ownProperty("scope1");
            User.scopes.should.ownProperty("scope2");

            User.scopes.scope1.should.have.keys(["scopeName","controller","model","modelName"],"Model Object should have keys");
            User.scopes.scope1.model.should.be.equal(User);
            User.scopes.scope1.modelName.should.be.equal(User.modelName);
            User.scopes.scope1.scopeName.should.be.equal("scope1");

            checkController("Scope",
                User.scopes.scope1.controller,
                path.normalize(fixtServerPath + "/controllers/user/scope1.js"),
                User.controller
            );

//            urls

            User.url.should.be.equal("user","Model api url should respond to file name in case when url property is not defined explicitly")

//            TODO check validators




            done();
            }
            catch(e){
                console.log(e);
                console.log(e.stack);
                done();
            }
        });
        }
        catch(e){
            console.log(e);
            console.log(e.stack);
            done();
        }
    })


})