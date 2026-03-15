var flatbom = require('../models/flatbom.model.js');
var FlatToNested, flatToNested, flat,trimmedFlatBom;

FlatToNested = require('flat-to-nested');

exports.findAll = function(req, res) {
    console.log("Executing find all");
    flatbom.find({},{children:1}).then(function(result){
        try {
            trimmedFlatBom = result[0].children;
            flatToNested = new FlatToNested({
                id: 'name',
                parent: 'parent',
                children: 'children',
                classification: 'classification'
            });
            var nested = flatToNested.convert(trimmedFlatBom);
            res.send(nested);
        } catch (e) {
            console.error(e);
        }
    }).catch(function(err) {
        res.status(500).send({message: "Some error occurred while retrieving notes."+err});
    });
};

exports.find = function(req, res) {
    console.log("Some parameters supplied for search");
    flatbom.find({_id: req.params.pPId},{children:1}).then(function(result){
        try {
            trimmedFlatBom = result[0].children;
            flatToNested = new FlatToNested({
                id: 'name',
                parent: 'parent',
                children: 'children'
            });
            var nested = flatToNested.convert(trimmedFlatBom);
            res.send(nested);
        } catch (e) {
            console.error(e);
        }
    }).catch(function(err) {
        res.status(500).send({message: "Some error occurred while retrieving data."+err});
    });
};
