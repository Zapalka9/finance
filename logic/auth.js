'use strict';
const bcrypt = require('bcrypt');

// Hashwert erzeugen
exports.hashValue = function (password, lzKosten) {
    return bcrypt.hash(password, lzKosten)
        .then((hash) => {
            console.log('Your hash: ', hash);
            return hash;
        })
        .catch((err) => {
            console.log("ERROR in hash: " + err);
            return err;
        });
}

// Hashwert vergleichen
exports.compHashValue = function (password, hash) {
    return bcrypt.compare(password, hash)
        .then((result) => {
            console.log('Erfolgreiches Login?: ', result);
            return result;
        })
        .catch((err) => {
            console.log("Fehler bei Login: " + err);
            return err;
        });
}
