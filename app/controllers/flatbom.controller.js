var flatbom = require('../models/flatbom.model.js');
var FlatToNested, flatToNested, flat,trimmedFlatBom;

FlatToNested = require('flat-to-nested');

exports.findAll = function(req, res) {
    // Retrieve and return all notes from the database.
	flatbom.find({},{children:1},function(err, flatbom){
		console.log("Executing find all");
	        if(err) {
	            res.status(500).send({message: "Some error occurred while retrieving notes."+err});
	        } else {
						try {
							trimmedFlatBom = flatbom[0].children;
							flatToNested = new FlatToNested({    // The name of the property with the node id in the flat representation
									id: 'name',
									// The name of the property with the parent node id in the flat representation
									parent: 'parent',
									// The name of the property that will hold the children nodes in the nested representation
									children: 'children',
									classification: 'classification'
							});
								var nested = flatToNested.convert(trimmedFlatBom);					
								res.send(nested);
							} catch (e) {
								console.error(e);
							}
	        }
	    });
};

exports.find = function(req, res) {
	console.log("Some parameters supplied for search");
	flatbom.find({_id: req.params.pPId},{children:1},function(err, flatbom){
		if(err) {
				res.status(500).send({message: "Some error occurred while retrieving data."+err});
			} else {
				try {
					trimmedFlatBom = flatbom[0].children;
					flatToNested = new FlatToNested({    // The name of the property with the node id in the flat representation
							id: 'name',
							// The name of the property with the parent node id in the flat representation
							parent: 'parent',
							// The name of the property that will hold the children nodes in the nested representation
							children: 'children'
					});
						var nested = flatToNested.convert(trimmedFlatBom);					
						res.send(nested);
					} catch (e) {
						console.error(e);
					}

			}			
	});
};

/*exports.find = function(req, res) {
	console.log("Some parameters supplied for search");
	flatbom.findById({ _id: req.params.pPId},{children:1},function(err, flatbom){
		if(err) {
				res.status(500).send({message: "Some error occurred while retrieving data."+err});
			} else {
				try{
					//trimmedFlatBom = flatbom[0].children;					
					res.send(flatbom);
				}catch(e){
					console.error(e)
				}

			}			
	});
};*/