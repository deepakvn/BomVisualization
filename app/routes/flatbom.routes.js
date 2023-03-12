module.exports = function(app) {
    var flatbom = require('../controllers/flatbom.controller.js');
    var path = require('path');
    var fs = require('fs');
    var ejs = require('ejs');
    app.get('/flatbom', flatbom.findAll);
    app.get('/flatbom/:pPId', flatbom.find);
    

    app.get('/homepage/:pidName', function(req, res) {        
        var name = req.params.pidName;
        console.log("name="+name);
        fs.readFile('index.html', 'utf-8', function(err, content) {
            if (err) {
              res.end('error occurred');
              return;
            }       
            var renderedHtml = ejs.render(content, {name: name});  //get redered HTML code
            res.end(renderedHtml);
          });
        /*Uncomment the following line to go back to working code*/ 
        //res.sendFile(path.join(__dirname + '../../../index.html'));
    });


    app.get('/testpage/:abc', function(req, res) {
        res.sendFile(path.join(__dirname + '../../../testpage.html'));
    });    
}