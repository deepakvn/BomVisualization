var mongoose = require('mongoose');
var dbConfig = require('./config/database.config.js');

mongoose.connect(dbConfig.url, { useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;

db.on('error', function(err) { console.error('Connection error:', err); process.exit(1); });

db.once('open', function() {
    console.log('Connected to MongoDB');

    var Tree = require('./app/models/flatbom.model.js');

    var dummyDoc = {
        _id: 'TechVision-Corp',
        children: [
            // Root node (no parent)
            { name: 'TechVision-Corp', parent: null, Risk_Level: 'compliant', cost: null, TPSD: 'No' },

            // Level 1 - Divisions
            { name: 'CEO-Office',         parent: 'TechVision-Corp', Risk_Level: 'compliant',     cost: '$500K', TPSD: 'No' },
            { name: 'Engineering-Div',    parent: 'TechVision-Corp', Risk_Level: 'compliant',     cost: '$2M',   TPSD: 'Yes' },
            { name: 'Manufacturing-Div',  parent: 'TechVision-Corp', Risk_Level: 'non-compliant', cost: '$1.5M', TPSD: 'No' },
            { name: 'Sales-Div',          parent: 'TechVision-Corp', Risk_Level: 'compliant',     cost: '$800K', TPSD: 'No' },

            // Level 2 - CEO Office
            { name: 'Strategy-Dept', parent: 'CEO-Office', Risk_Level: 'compliant', cost: '$200K', TPSD: 'No' },
            { name: 'Legal-Dept',    parent: 'CEO-Office', Risk_Level: 'compliant', cost: '$300K', TPSD: 'No' },
            { name: 'HR-Dept',       parent: 'CEO-Office', Risk_Level: 'compliant', cost: '$150K', TPSD: 'No' },

            // Level 2 - Engineering
            { name: 'Hardware-Team', parent: 'Engineering-Div', Risk_Level: 'compliant',     cost: '$900K', TPSD: 'Yes' },
            { name: 'Software-Team', parent: 'Engineering-Div', Risk_Level: 'compliant',     cost: '$750K', TPSD: 'No' },
            { name: 'QA-Team',       parent: 'Engineering-Div', Risk_Level: 'non-compliant', cost: '$350K', TPSD: 'No' },

            // Level 3 - Hardware
            { name: 'PCB-Design',      parent: 'Hardware-Team', Risk_Level: 'compliant',     cost: '$400K', TPSD: 'Yes' },
            { name: 'Mechanical-Eng',  parent: 'Hardware-Team', Risk_Level: 'compliant',     cost: '$300K', TPSD: 'No' },
            { name: 'Firmware-Dev',    parent: 'Hardware-Team', Risk_Level: 'non-compliant', cost: '$200K', TPSD: 'Yes' },

            // Level 3 - Software
            { name: 'Frontend-Dev',  parent: 'Software-Team', Risk_Level: 'compliant', cost: '$250K', TPSD: 'No' },
            { name: 'Backend-Dev',   parent: 'Software-Team', Risk_Level: 'compliant', cost: '$300K', TPSD: 'No' },
            { name: 'DevOps',        parent: 'Software-Team', Risk_Level: 'compliant', cost: '$200K', TPSD: 'No' },

            // Level 3 - QA
            { name: 'Test-Automation', parent: 'QA-Team', Risk_Level: 'compliant',     cost: '$150K', TPSD: 'No' },
            { name: 'Manual-QA',       parent: 'QA-Team', Risk_Level: 'non-compliant', cost: '$100K', TPSD: 'No' },

            // Level 2 - Manufacturing
            { name: 'Assembly-Line', parent: 'Manufacturing-Div', Risk_Level: 'non-compliant', cost: '$600K', TPSD: 'No' },
            { name: 'Supply-Chain',  parent: 'Manufacturing-Div', Risk_Level: 'non-compliant', cost: '$500K', TPSD: 'Yes' },
            { name: 'Warehouse',     parent: 'Manufacturing-Div', Risk_Level: 'compliant',     cost: '$400K', TPSD: 'No' },

            // Level 3 - Assembly
            { name: 'Line-A', parent: 'Assembly-Line', Risk_Level: 'non-compliant', cost: '$200K', TPSD: 'No' },
            { name: 'Line-B', parent: 'Assembly-Line', Risk_Level: 'compliant',     cost: '$200K', TPSD: 'No' },
            { name: 'Line-C', parent: 'Assembly-Line', Risk_Level: 'compliant',     cost: '$200K', TPSD: 'No' },

            // Level 2 - Sales
            { name: 'NA-Sales',   parent: 'Sales-Div', Risk_Level: 'compliant', cost: '$300K', TPSD: 'No' },
            { name: 'EMEA-Sales', parent: 'Sales-Div', Risk_Level: 'compliant', cost: '$250K', TPSD: 'No' },
            { name: 'APAC-Sales', parent: 'Sales-Div', Risk_Level: 'compliant', cost: '$250K', TPSD: 'No' },

            // Level 3 - Sales regions
            { name: 'US-East',   parent: 'NA-Sales', Risk_Level: 'compliant', cost: '$150K', TPSD: 'No' },
            { name: 'US-West',   parent: 'NA-Sales', Risk_Level: 'compliant', cost: '$150K', TPSD: 'No' },
            { name: 'Europe',    parent: 'EMEA-Sales', Risk_Level: 'compliant', cost: '$150K', TPSD: 'No' },
            { name: 'Middle-East', parent: 'EMEA-Sales', Risk_Level: 'non-compliant', cost: '$100K', TPSD: 'No' },
            { name: 'Japan',     parent: 'APAC-Sales', Risk_Level: 'compliant', cost: '$120K', TPSD: 'No' },
            { name: 'ANZ',       parent: 'APAC-Sales', Risk_Level: 'compliant', cost: '$130K', TPSD: 'No' },
        ]
    };

    Tree.findById('TechVision-Corp', function(err, existing) {
        if (err) { console.error(err); db.close(); return; }

        if (existing) {
            console.log('Entry already exists. Updating...');
            Tree.updateOne({ _id: 'TechVision-Corp' }, { children: dummyDoc.children }, function(err) {
                if (err) console.error('Update error:', err);
                else console.log('Updated successfully!');
                db.close();
            });
        } else {
            var doc = new Tree(dummyDoc);
            doc.save(function(err) {
                if (err) console.error('Save error:', err);
                else console.log('Dummy data inserted successfully!');
                db.close();
            });
        }
    });
});
