'use strict';

// mongo db
const DbName = 'mongoFinance';
const { MongoClient } = require("mongodb");     // Bibliothek MongoDB verfügbar machen -> durch Objektzuweisung an MongoClient
const { ObjectId } = require("mongodb");        // für Zugriff auf die ID_ in der MongoDB erforderlich
const uri = 'mongodb://localhost:27017/';       // URL zur MongoDB
const options = { useNewUrlParser:true, useUnifiedTopology:true };  // Handbuch ?
 
let database;    // das Zugriffsobject auf die DB der Anwendung -> globale Variable, die nur asynchron initialisierbar ist
// general purpose function to connect to MongoDB
exports.doConnect = function () {
    return MongoClient.connect(uri, options)
        .then((db) => {
            database = db.db(DbName);
            console.log("MongoClient connected to database: " + database.databaseName);
        })
        .catch((err) => {  
            console.log("MongoClient: ERROR on Connection");
        });
}
    
exports.getConnection = function () {  
    return database;
}

function createFilterFromObjectID(id) {
 
    var filter = null;
    try {
        filter = { _id: new ObjectId(id) };    // note: typeof '_id' is ObjectID -> hier wird ein Objekt erzeut und geprüft ob erfolgreich
    } catch (error) {
        let msg =
            `ERROR createFilterFromObjectID: id ${id} has wrong format:\n` +
            `  => Argument passed in must be a single String of 12 bytes or a string of 24 hex characters\n`;
        console.log(msg);
    }
    return filter;
}

 function doFindForEach(collection, filter, sort) {

    // no toArray used - memory requirements less exhaustive    
    var db = database;
    var dbCollection = db.collection(collection);
    var cursor = dbCollection.find(filter).sort(sort);

    var docs = [];
    return cursor.forEach(doc => {
        docs.push(doc);
    }).then(() => {
        console.log(`=> forEach: ${docs.length} elements`);
        return docs;
    });
}

// Daten von MongoDB lesen mit Filter und Sortierung
exports.dbRead = function (collection, filter, sort) {
    'use strict'
    // uses toArray - memory requirements exhaustive, if data set is large
    let db = database;
    let dbCollection = db.collection(collection);

    return dbCollection.find(filter).sort(sort).toArray()
        .then((docs) => {
            return docs;
        })
        .catch((err) => {
            console.log("ERROR in doRead: " + err.stack);
            return [];
        });
}

exports.dbAsset = function (collection, pipeline) {
    'use strict'
    // uses toArray - memory requirements exhaustive, if data set is large
    let db = database;
    let dbCollection = db.collection(collection);

    return dbCollection.aggregate(pipeline).toArray()
        .then((docs) => {
            return docs;
        })
        .catch((err) => {
            console.log("ERROR in doRead: " + err.stack);
            return [];
        });
}

// Ein Document in die MongoDB schreiben
exports.dbInsertOne = function (collection, document) {
    'use strict'
    // uses toArray - memory requirements exhaustive, if data set is large
    let db = database;
    var dbCollection = db.collection(collection);

    return dbCollection.insertOne(document).then((docs) => {
            return docs;
        })
        .catch((err) => {
            console.log("ERROR in dbInsertOne: " + err.stack);
            return [];
        });
}

// Ein Document in der MongoDB löschen
exports.dbDeleteOne = function (collection, strObjectID) {
    'use strict'
    // uses toArray - memory requirements exhaustive, if data set is large
    let db = database;
    let dbCollection = db.collection(collection);

    let filter = createFilterFromObjectID(strObjectID);
    if (filter == null)
    {
        console.log("Error in dbDeleteOne");
        return;
    }
    
    // document ist ein frei wählbarer Objektname
    return dbCollection.deleteOne(filter).then((document) => {
            if (document.deletedCount === 1) {
                console.log(`> dbDeleteOne: Success! - id = `);
            }
            else {
                console.log(`> ERROR: dbDeleteOne didn't work ` +
                    `as expected - deletedCount = ${document.deletedCount}`);
            }
        })
        .catch((err) => {
            console.log("ERROR dbDeleteOne: " + err.message);
        });
}


// Ein Document in der MongoDB updaten
exports.dbUpdateOne = function (collection, strObjectID, replace) {
    'use strict'
    // uses toArray - memory requirements exhaustive, if data set is large
    let db = database;
    let dbCollection = db.collection(collection);

    let filter = createFilterFromObjectID(strObjectID);
    if (filter == null)
    {
        console.log("Error");
        return;
    }
    
    // document ist ein frei wählbarer Objektname
    return dbCollection.updateOne(filter, replace).then((document) => {
            if (document.matchedCount === 1) {
                console.log(`> dbUpdateOne: Success! - id = `);
                return true;
            }
            else {
                console.log(`> ERROR: dbUpdateOne didn't work ` +
                    `as expected - updateCount = ${document.matchedCount}`);
                    throw '> ERROR: dbUpdateOne did not work ';
            }
        });
        // .catch((err) => {
        //     console.log("ERROR dbUpdateOne: " + err.message);
        // });
}

exports.diffTimeAbs = function (date1, date2, unit){   // Zeitdifferenz ermitteln
    let diff =Math.abs(date1 - date2);
    if (unit === 'a')                       // Jahre
        return diff/365.256/3.6e6/24;
    else if (unit === 'm')                  // Monate
        return diff/3.6e6/24/30.438;
    else if (unit === 'w')                  // Wochen
        return diff/3.6e6/24/7;  
    else if (unit === 'd')                  // Tage
        return diff/3.6e6/24;      
    else if (unit === 'h')                  // Stunden
        return diff/3.6e6;
    else if (unit === 'min')                // Minuten
        return diff/3.6e6*60; 
    else if (unit === 's')                  // Sekunden
        return diff/1000;
    else if (unit === 'ms')                 // Millisekunden
        return diff;
    else
        return -1;                          // Fehlerkennung
}

exports.interestRate = function (purchaseAmount, saleAmount, holdingPeriod){       // effektiver Jahreszins in %
    if (holdingPeriod < 0.1 || purchaseAmount <= 0)
        return 0;
    else
        return 100*((saleAmount/purchaseAmount)**(1/holdingPeriod)-1);    
}