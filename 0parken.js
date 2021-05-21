<li class="nav-item active">
    <a class="nav-link" href="/">Home <span class="sr-only">(current)</span></a>
  </li>

<input class="form-control" type="text" placeholder=<%= paraAktien[0].ertrag[3] %> name="ert3" id="ert3">

daten.dbInsertOne('paraAktien', doc).then((result) => {       // anonyme callback function
    data.status.id=3;
    data.status.message='Document erfolgreich eingefügt!';
    next();
    return;
});





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
            }
            else {
                console.log(`> ERROR: dbUpdateOne didn't work ` +
                    `as expected - updateCount = ${document.matchedCount}`);
            }
        })
        .catch((err) => {
            console.log("ERROR dbUpdateOne: " + err.message);
        });
}