module.exports = function(){
    var compareDBDescriptor = function(before, after){
        var ret = {
            need: false,
            addModel: [], // modelname
            rmModel: [], // modelnames
            changeModelDb: {}, // modelname - {defore: , after: }
            addAttr:{},// modelname - [attributes]
            rmAttr: {}, // modelname - [attributes]
            addOneA: {}, // modelname - [ass-names]
            rmOneA: {}, // modelname - [ass-names]
            addManyA: {}, // modelname - [ass-names]
            rmManyA: {}, // modelname - [ass-names]
            ddlSyncExt: {}, //modelname-descriptor
            ddlSyncRm: {}, // modelname-descriptor 
            changes: {}, // modelname - string
            err:[]
        }; 
        var beforeD = JSON.parse(JSON.stringify(before));
        var afterD = JSON.parse(JSON.stringify(after));
        ret.ddlSyncExt = beforeD;
        // ret.ddlSyncRm = afterD;
        for (var mdl in afterD) {
            var appMD = afterD[mdl]; // model descriptor
            var sncModel = beforeD[mdl];
            if (sncModel) {// compare models
                //attributes
                for (var atr in appMD.attributes) {
                    if (!sncModel.attributes[atr]) { // find new model attributes
                        ret.need = true;
                        sncModel.attributes[atr] = appMD.attributes[atr];
                        if (!ret.addAttr[mdl]) ret.addAttr[mdl] = [];
                        ret.addAttr[mdl].push(atr);
                        ret.ddlSyncExt[mdl] = sncModel;
                    } else {
                        if (!_.isEqual(sncModel.attributes[atr], appMD.attributes[atr])) {//model attribute was changed - error
                            if(!ret.changes[mdl]) ret.changes[mdl] = [];
                            ret.changes[mdl].push(" Attribute: " + atr);
                            ret.err.push("Model: " + mdl + " Attribute: " + atr + ' was changed. Migration cannot be complete.');
                        }
                    }
                }
                for (var atr in sncModel.attributes) {// find model attrs to remove
                    if (!appMD.attributes[atr]) {// remove attr
                        ret.need = true;
                        if (!ret.rmAttr[mdl]) ret.rmAttr[mdl] = [];
                        ret.rmAttr[mdl].push(atr);
                        ret.ddlSyncRm[mdl] = appMD; 
                    }
                }
                //has one   впринципе это никому не нужно, т.к. в аттрибутах уже учтено
                _.each(appMD.hasOne, function(obj,key){
                    if(!sncModel.hasOne[key]){ //new hasOne association
                        ret.need = true;
                        if(!ret.addOneA[mdl])ret.addOneA[mdl] = [];
                        ret.addOneA[mdl].push(key);
                    } else {
                        if (!_.isEqual(sncModel.hasOne[key], appMD.hasOne[key])) {//model association was changed - error
                            if(!ret.changes[mdl]) ret.changes[mdl] = [];
                            ret.changes[mdl].push(" Has One association: " + key);
                            ret.err.push("Model: " + mdl + " HasOne association: " + key + ' was changed. Migration cannot be complete.');
                        }
                    }
                });
                _.each(sncModel.hasOne, function(obj, key){
                    if(!appMD.hasOne[key]){
                        ret.need = true;
                        if(!ret.rmOneA[mdl]) ret.rmOneA[mdl] = [];
                        ret.rmOneA[mdl].push(key);
                    }
                });
                
                //has many таблицы исчезнувших ассоциации останутся в базе ели модель не будет удалена полностью
                _.each(appMD.hasMany, function(obj,key){
                    if(!sncModel.hasMany[key]){ //new hasMany association
                        ret.need = true;
                        if(!ret.addManyA[mdl])ret.addManyA[mdl] = [];
                        ret.addManyA[mdl].push(key);
                    } else {
                        if (!_.isEqual(sncModel.hasMany[key], appMD.hasMany[key])) {//model association was changed - error
                            if(!ret.changes[mdl]) ret.changes[mdl] = [];
                            ret.changes[mdl].push(" HasMany association: " + key);
                            ret.err.push("Model: " + mdl + " HasMany association: " + key + ' was changed. Migration cannot be complete.');
                        }
                    }
                });
                _.each(sncModel.hasMany, function(obj, key){
                    if(!appMD.hasMany[key]){
                        ret.need = true;
                        if(!ret.rmManyA[mdl]) ret.rmManyA[mdl] = [];
                        ret.rmManyA[mdl].push(key);
                    }
                });
                
            } else { // find new model
                ret.need = true;
                ret.addModel.push(mdl);
                ret.ddlSyncExt[mdl] = appMD;
            }
        }
        for (var mdl in beforeD) {
            if (!afterD[mdl]){ // remove this model
                ret.rmModel.push(mdl);
                ret.need = true;
            }
        }
        return ret;
    }; 
        
   return function(bf, af){
       var before = JSON.parse(JSON.stringify(bf));
       var after = JSON.parse(JSON.stringify(af));
       var ret = {
            need: false,
            addModel: {}, 
            rmModel: {}, 
            changeModelDb: {},
            addAttr: {}, 
            rmAttr: {},  
            addOneA: {},
            rmOneA: {},
            addManyA: {},
            rmManyA: {},
            ddlSyncExt: {},
            ddlSyncRm: {}, 
            extScope: {},
            changes: {},
            err:[]
        };
       
        for (var db in after) {
            if (!before[db]) before[db] = {};
            var res = compareDBDescriptor(before[db], after[db]);
            if(!res.need) continue;
            else ret.need = true;
            if(res.err.length != 0 ) ret.err[db] = res.err;
            if(_.keys(res.ddlSyncExt).length != 0 ) ret.ddlSyncExt[db] = res.ddlSyncExt;
            if(_.keys(res.extScope).length != 0) {
                _.extend(ret.ddlSyncExt, res.ddlSyncExt); //TODO if db changed
                // _.each(ret.changeModelDb, function(obj, key){
                    // ret.ddlSyncExt[key] = after[obj.after]    
                // });
            }
            if(_.keys(res.rmAttr).length != 0){
               ret.rmAttr[db] = res.rmAttr;
               ret.ddlSyncRm[db] = res.ddlSyncRm;
            } 
            if(_.keys(res.addAttr).length != 0) {
                ret.addAttr[db] = res.addAttr;
                ret.ddlSyncExt[db] = res.ddlSyncExt;
            }
            if(_.keys(res.modelSync).length != 0) ret.modelSync[db] = res.modelSync;
            if(res.rmModel.length != 0) ret.rmModel[db] = res.rmModel;
            if(res.addModel.length != 0) ret.addModel[db] = res.addModel;
            if(_.keys(res.rmOneA).length != 0 ) ret.rmOneA[db] = res.rmOneA;
            if(_.keys(res.addOneA).length != 0 ) ret.addOneA[db] = res.addOneA;
            if(_.keys(res.addManyA).length != 0 ) ret.addManyA[db] = res.addManyA;
            if(_.keys(res.rmManyA).length != 0 ) ret.rmManyA[db] = res.rmManyA;
            if(_.keys(res.changeModelDb).length != 0 ) _.extend(ret.changeModelDb, res.changeModelDb);
            if(_.keys(res.changes).length != 0 ) ret.changes[db] = res.changes;
            
        }
        // for (var db in before){
            // if (!after[db]){
                // ret.need = true;
                // var res = compareDBDescriptor(before[db], {});
                // if(_.keys(res.ddlSyncExt).length !=0 ) ret.ddlSyncExt[db] = res.ddlSyncExt;
                // if(_.keys(res.ddlSyncRm).length != 0) ret.ddlSyncRm[db] = res.ddlSyncRm;
                // if(_.keys(res.rmAttr).length != 0) ret.rmAttr[db] = res.rmAttr;
                // if(_.keys(res.addAttr).length != 0) ret.addAttr[db] = res.addAttr;
                // if(res.modelSync.length != 0) ret.modelSync[db] = res.modelSync;
                // if(res.rmModel.length != 0) ret.rmModel[db] = res.rmModel;
                // if(res.addModel.length != 0) ret.addModel[db] = res.addModel;
            // }
        // }
        return ret;
   }; 
};
