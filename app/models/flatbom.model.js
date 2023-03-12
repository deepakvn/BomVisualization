var mongoose = require('mongoose');

var TreeSchema = mongoose.Schema({
    _id: String,
    children:Array
});
module.exports = mongoose.model('Tree', TreeSchema);