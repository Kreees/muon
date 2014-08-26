module.exports = function(){
    var compareDBDescriptor = function(before, after, force){
        var ret = {
            need: false,
            addModel: [], // modelname
            addModelAttributes:{},// modelname - [attributes]
            rmModel: [], // modelnames
            rmModelAttributes: {}, // modelname - [attributes]
            ddlSyncAdd: {}, //modelname-descriptor
            ddlSyncRm: {}, // modelname-descriptor 
            scope: {}, // modelname-descriptor 
            modelSync: {},  // modelname-descriptor
            err:[]
        }; 
        var beforeD = JSON.parse(JSON.stringify(before));
        var afterD = JSON.parse(JSON.stringify(after));
        ret.ddlSyncAdd = beforeD;
        ret.scope = beforeD;
        ret.ddlSyncRm = afterD;
        for (var mdl in afterD) {
            var appMD = afterD[mdl]; // model descriptor
            var sncModel = beforeD[mdl];
            ret.modelSync[mdl] = afterD[mdl];
            if (sncModel) {// compare models
                //attributes
                for (var atr in appMD.attributes) {// find new model attributes
                    if (!sncModel.attributes[atr]) {
                        sncModel.attributes[atr] = appMD.attributes[atr];
                        if (!ret.addModelAttributes[mdl]) ret.addModelAttributes[mdl] = [];
                        ret.addModelAttributes[mdl].push(atr);
                        ret.need = true;
                        ret.ddlSyncAdd[mdl] = sncModel;
                        ret.scope[mdl] = sncModel;
                    } else {
                        if (!_.isEqual(sncModel.attributes[atr], appMD.attributes[atr])) {//model attribute was changed - error
                            if(!force){
                                ret.err.push("Model: " + mdl + " Attribute: " + atr + ' was changed. Migration cannot be complete.');
                            }
                        }
                    }
                }
                for (var atr in sncModel.attributes) {// find model attrs to remove
                    if (!appMD.attributes[atr]) {// remove attr
                        if (!ret.rmModelAttributes[mdl]) ret.rmModelAttributes[mdl] = [];
                        ret.rmModelAttributes[mdl].push(atr);
                        ret.need = true;
                    }
                }
                //TODO has one
                //TODO has many
            } else { // find new model
                ret.need = true;
                ret.modelSync[mdl] = appMD;
                ret.addModel.push(mdl);
                ret.scope[mdl] = appMD;
                ret.ddlSyncAdd[mdl] = appMD;
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
            addModelAttributes:{},
            rmModel: {}, 
            rmModelAttributes: {}, 
            ddlSyncAdd: {}, 
            ddlSyncRm: {},
            scope: {},
            modelSync: {},
            err: {}  
        };
       
        for (var db in after) {
            if (!before[db]) before[db] = {};
            var res = compareDBDescriptor(before[db], after[db]);
            if(!res.need) continue;
            else ret.need = true;
            if(res.err.length != 0 ){
                ret.err[db] = res.err;
            }
            
            if(_.keys(res.ddlSyncAdd).length != 0 ){
                ret.ddlSyncAdd[db] = res.ddlSyncAdd;
            }
            
            if(_.keys(res.scope).length != 0){
                _.extend(ret.scope, res.scope);
            }
            
            if(_.keys(res.rmModelAttributes).length != 0){
               ret.rmModelAttributes[db] = res.rmModelAttributes;
               ret.ddlSyncRm[db] = res.ddlSyncRm;
            } 
            if(_.keys(res.addModelAttributes).length != 0) {
                ret.addModelAttributes[db] = res.addModelAttributes;
                ret.ddlSyncAdd[db] = res.ddlSyncAdd;
            }
            if(_.keys(res.modelSync).length != 0) ret.modelSync[db] = res.modelSync;
            if(res.rmModel.length != 0) {
                ret.rmModel[db] = res.rmModel;
            }
            if(res.addModel.length != 0) ret.addModel[db] = res.addModel;
            
        }
        // for (var db in before){
            // if (!after[db]){
                // ret.need = true;
                // var res = compareDBDescriptor(before[db], {});
                // if(_.keys(res.ddlSyncAdd).length !=0 ) ret.ddlSyncAdd[db] = res.ddlSyncAdd;
                // if(_.keys(res.ddlSyncRm).length != 0) ret.ddlSyncRm[db] = res.ddlSyncRm;
                // if(_.keys(res.rmModelAttributes).length != 0) ret.rmModelAttributes[db] = res.rmModelAttributes;
                // if(_.keys(res.addModelAttributes).length != 0) ret.addModelAttributes[db] = res.addModelAttributes;
                // if(res.modelSync.length != 0) ret.modelSync[db] = res.modelSync;
                // if(res.rmModel.length != 0) ret.rmModel[db] = res.rmModel;
                // if(res.addModel.length != 0) ret.addModel[db] = res.addModel;
            // }
        // }
        return ret;
   }; 
};
