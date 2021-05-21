'use strict';

const collParaAktien = 'paraAktien';
const collAssetAktien = 'assetAktien';
const urlShares = 'https://www.onvista.de/';                 // Webseite mit Wertpapierpreisen
const urlIndex = 'https://www.onvista.de/index/';            // Webseite mit Markt Indices
const arrTrIndex =[2, 6, 8, 9, 12, 18, 19, 20, 24];          // Tabellenzeilen
//const arrTrIndex =[2, 6, 8, 9, 12, 18, 19, 20, 24, 66, 67, 68, 71, 72, 73, 74, 75];         // Tabellenzeilen
const urlExchange = 'https://www.iban.com/exchange-rates';   // Webseite mit Währungskursen
const arrTrExchange =[1, 5, 6, 8, 10, 11, 13, 19, 25];                                      // Tabellenzeilen
const collSales = 'sales';
const daten = require('../logic/database.js');
const auth = require('../logic/auth.js');
const request = require('request');
const cheerio = require('cheerio');

// global data
let cl={};      // Objekte für die einzelnen Clients
// let cl;
// if(typeof cl == 'undefined'){
//     cl={};
// } 

// global data (für alle Clients gemeinsam)
let data = {};  // benchIndices, countries, currencies, clients, colors,
                // shareTypes, shareSectors, fund, regions, strategies, exchange, indices
// let data;
// if(typeof data == 'undefined'){
//     data={};
// } 

exports.initSession=function(req, res, next) {
    if(typeof cl[req.session.id] == 'undefined'){
        cl[req.session.id]={};                      // Daten für angemeldeten Client
        cl[req.session.id].cnr=-1;                  // Clientnummer 1, 2, 3 ... (number)
        cl[req.session.id].snr='';                  // Clientkennung '1_', '2_', '3_' ... (string)
        cl[req.session.id].lin=false;               // Client loggedIn?  (bool)
        cl[req.session.id].nick='';                 // nick name des Clients  (string)
        cl[req.session.id].curr='';                 // currency des Clients für Vermögensaufstellung  (string)
        cl[req.session.id].diff=0.0;                // Schellwert (z.B. 3%) -> Farbumschlag Investampel grün, gelb rot
        cl[req.session.id].currPage='default';      // current Page   (string)
        cl[req.session.id].anzPage='default';       // Anzeige current Page   (string)
        // ---------------------------------------------------------------------------
        // Statusinformation für next() Weiterschaltung und Anzeige am Client
        // id=0 idle   =1...999 Hinweise  =1000-1999 Warnung  =2000-2999 Fehler
        cl[req.session.id].status={};
    }                    
    next();
}

exports.cleanStatus=function(req, res, next) {
    let info = {
        error: false,
        stamp: new Date().toLocaleString() + ':' + new Date().getMilliseconds().toString(),
        id: 0,
        message: 'idle'
    }
    cl[req.session.id].status=info;                 
    next();
}

// ---------------------------------------------------------------------------
// (exported) helper functions - Express Middleware 

exports.traceRoute = function (req, res, next) {
    console.log('> =====================================================================');
    console.log('> Trace of Route:');
    console.log(`#   Path: ${req.method} ${req.path}`);
    console.log('#   Body:   ' + JSON.stringify(req.body));
    console.log('#   Params: ' + JSON.stringify(req.params));
    console.log('#   Query:  ' + JSON.stringify(req.query));
    console.log('#   Session: ' + req.session.id);
    console.log('#   Nick: ' + cl[req.session.id].nick);
    console.log('> ---------------------------------------------------------------------');
    next();
}

exports.renderHome=function(req, res, next) {
    'use strict'
    //data.result=[];  // ???
    cl[req.session.id].currPage='home';
    cl[req.session.id].anzPage='Home';
    let lData = {
        currPage: cl[req.session.id].currPage,
        anzPage: cl[req.session.id].anzPage,
        status: cl[req.session.id].status,
        nick: cl[req.session.id].nick
    };
    res.render('pages/index.ejs', lData);
}

exports.getCurrencies=function(req, res, next) {
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    daten.dbRead('currencies', {}, {"currency": 1}).then((result) => {       // anonyme callback function
        data.currencies=result;
        next();
    }); 
}

exports.getCountries=function(req, res, next) {
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    daten.dbRead('countries', {}, {"country": 1}).then((result) => {       // anonyme callback function
        data.countries=result;
        next();
    }); 
}

exports.getShareTypes=function(req, res, next) {
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    daten.dbRead('shareTypes', {}, {"type": 1}).then((result) => {       // anonyme callback function
        data.shareTypes=result;
        next();
    }); 
}

exports.getShareSectors=function(req, res, next) {
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    daten.dbRead('sectors', {}, {"sector": 1}).then((result) => {       // anonyme callback function
        data.shareSectors=result;
        next();
    }); 
}

exports.getBenchIndices=function(req, res, next) {
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    daten.dbRead('benchIndices', {}, {"index": 1}).then((result) => {       // anonyme callback function
        data.benchIndices=result;
        next();
    }); 
}

exports.getColors=function(req, res, next) {
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    daten.dbRead('colors', {}, {"nr": 1}).then((result) => {       // anonyme callback function
        data.colors=result;
        next();
    }); 
}

exports.getClients=function(req, res, next) {
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    daten.dbRead('clients', {}, {"nr": 1}).then((result) => {       // anonyme callback function
        data.clients=result;
        next();
    }); 
}

exports.logIn=function(req, res, next) {
    if (cl[req.session.id].status.error){                                 // Im Vorfeld schon Fehler -> Abbruch und durchleiten
        next();
        return;
    }
    if(req.body.user=='' || req.body.password==''){         // Eingaben bei user und pin erforderlich -> Abbruch und durchleiten
        cl[req.session.id].status.error=true;
        cl[req.session.id].status.id=1002;
        cl[req.session.id].status.message='Vor Login richtigen user und pin eingeben!';
        next();
        return;
        }
    let i;
    let indUser=-1;
    for(i=0; i<data.clients.length; i++){                   // Index des Users ermitteln
        if(req.body.user == data.clients[i].user){
            indUser=i; 
        }
    }
    if(indUser < 0){                                        // User nicht bekannt -> Abbruch und durchleiten
        cl[req.session.id].status.error=true;
        cl[req.session.id].status.id=1003;
        cl[req.session.id].status.message='User nicht bekannt!';
        next();
        return;
    }
    if(data.clients[indUser].fault>2){                      // min. 3x fehlerhafte PW-Eingabe -> Abbruch und durchleiten
        cl[req.session.id].status.error=true;
        cl[req.session.id].status.id=1004;
        cl[req.session.id].status.message='Passwort rücksetzen lassen!';
        next();
        return;
    }
    auth.compHashValue(req.body.password, data.clients[indUser].secret).then((result) => {       // richtiges Passwort eingegeben?
        if(result){             // richtiges Passwort
            data.clients[indUser].fault = 0;
        }
        else{                   // falsches Passwort
            data.clients[indUser].fault++;
            cl[req.session.id].status.id=1004;
            cl[req.session.id].status.message='verkehrtes Passwort eingegeben!';            
        }
        let doc={};                            // relevantes document in collection
        doc = data.clients[indUser];
        let replace = {$set: doc};
        daten.dbUpdateOne('clients', doc._id.id, replace).then((result) => {       // anonyme callback function
            ;
        })
        .catch((err) => {
            cl[req.session.id].status.error=true;
            cl[req.session.id].status.id=2004;
            cl[req.session.id].status.message='Update in DB erfolglos. Meldetext: ' + err;
        })
        .finally(() => {
            if(cl[req.session.id].status.id == 1004){
                cl[req.session.id].status.error = true;
            }
            else{
                cl[req.session.id].status.id=1;
                cl[req.session.id].status.message=data.clients[indUser].nick + ' hat sich eingeloggt!';
                // Session "eröffnen"
                cl[req.session.id].cnr=data.clients[indUser].nr;
                cl[req.session.id].snr=data.clients[indUser].snr;
                cl[req.session.id].lin=true;
                cl[req.session.id].nick=data.clients[indUser].nick;
                cl[req.session.id].curr=data.clients[indUser].currency;
                cl[req.session.id].diff=data.clients[indUser].diff;
                cl[req.session.id].status.id=1;
                cl[req.session.id].status.message=cl[req.session.id].nick + ' hat sich eingeloggt!';  // doppelt ?
            }
            next();
            return;
        });
    });
}

exports.logOut=function(req, res, next) { 
    if (cl[req.session.id].cnr>0){
        cl[req.session.id].status.id=2;
        cl[req.session.id].status.message=cl[req.session.id].nick + ' hat sich ausgeloggt!';   
    }
    cl[req.session.id].cnr=-1;
    cl[req.session.id].snr='';
    cl[req.session.id].lin=false;
    cl[req.session.id].nick='';
    next();
}

exports.checkParaAktien=function(req, res, next) {
    // Fehler -> dann gleich durchreichen
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    let doc={};                            // relevantes document in collection
    let index = -1;
    // Insert
    if (req.body.hasOwnProperty('butInsert')){
        if(req.body.unt=='' || req.body.wkn=='' || req.body.typeIns=='Type' || req.body.counIns=='Land' || 
           req.body.currIns=='Währung' || req.body.sectIns=='Sektor' || req.body.benchIns=='Bench' || 
           req.body.dRy=='' || req.body.div==''){
            cl[req.session.id].status.error=true;
            cl[req.session.id].status.id=2001;
            cl[req.session.id].status.message='Alle Felder ausfüllen vor Insert!';
            next();
            return;
        }
        else{
            for(let k=0; k<cl[req.session.id].paraAktien.length; k++){
                if(req.body.wkn == cl[req.session.id].paraAktien[k].wkn){
                    cl[req.session.id].status.error=true;
                    cl[req.session.id].status.id=2002;
                    cl[req.session.id].status.message='Datensatz bereits vorhanden, insert nicht möglich!';
                    next();
                    return;
                }
            }
            doc={
                unternehmen: req.body.unt,
                wkn: req.body.wkn,
                type: req.body.typeIns,
                land: req.body.counIns,
                currency: req.body.currIns,
                sektor: req.body.sectIns,
                bench: req.body.benchIns,
                divRyt: parseInt(req.body.dRy, 10),
                div1: parseInt(req.body.div, 10),
                ertrag: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
            };
            daten.dbInsertOne(cl[req.session.id].snr+collParaAktien, doc).then((result) => {       // anonyme callback function
                cl[req.session.id].status.id=3;
                cl[req.session.id].status.message='Document erfolgreich eingefügt!';
            })
            .catch((err) => {
                cl[req.session.id].status.error=true;
                cl[req.session.id].status.id=2003;
                cl[req.session.id].status.message='Insert in DB erfolglos. Meldetext: ' + err.message.toString();
            })
            .finally(() => {
                next();
                return;
            });
        }   
    } 
    // bei Update und Delete muss Index >= 0 sein, d.h. Tabellenzeile muss angeklickt sein
    if (req.body.strIndex !== '-1'){
        let strIndex = req.body.strIndex;
        index = parseInt(strIndex);
        doc=cl[req.session.id].paraAktien[index];
        if (req.body.hasOwnProperty('butUpdate')){       // Update     
            if (req.body['unt'+strIndex] != ''){doc.unternehmen = req.body['unt'+strIndex];}
            if (req.body['wkn'+strIndex] != ''){doc.wkn = req.body['wkn'+strIndex];}
            doc.type = req.body.type[index];
            doc.land = req.body.coun[index];
            doc.currency = req.body.curr[index];
            doc.sektor = req.body.sect[index];
            doc.bench = req.body.bench[index];
            if (req.body['dRy'+strIndex] != ''){doc.divRyt = parseInt(req.body['dRy'+strIndex], 10);}
            if (req.body['div'+strIndex] != ''){doc.div1 = parseInt(req.body['div'+strIndex], 10);}
            let replace = {$set: doc};
            daten.dbUpdateOne(cl[req.session.id].snr+collParaAktien, doc._id.id, replace).then((result) => {       // anonyme callback function
                cl[req.session.id].status.id=4;
                cl[req.session.id].status.message='Document erfolgreich upgedatet!';
            })
            .catch((err) => {
                cl[req.session.id].status.error=true;
                cl[req.session.id].status.id=2004;
                cl[req.session.id].status.message='Update in DB erfolglos. Meldetext: ' + err;
            })
            .finally(() => {
                next();
                return;
            });
        }
        else if (req.body.hasOwnProperty('butDelete')){       // Delete
            daten.dbDeleteOne(cl[req.session.id].snr+collParaAktien, doc._id.id).then((result) => {       // anonyme callback function
                // console.log(result);
                cl[req.session.id].status.id=5;
                cl[req.session.id].status.message='Document erfolgreich gelöscht!';
            })
            .catch((err) => {
                cl[req.session.id].status.error=true;
                cl[req.session.id].status.id=2005;
                cl[req.session.id].status.message='Delete in DB erfolglos. Meldetext: ' + err.message.toString();
            })
            .finally(() => {
                next();
                return;
            });
        }
        else{                                               // Warnung, dieser Button kam wohl aus versehen dazu
            cl[req.session.id].status.error=true;
            cl[req.session.id].status.id=1001;
            cl[req.session.id].status.message='Diese Aktion wird nicht ausgeführt!';
            next();
            return;
        }
    }
    else{
        cl[req.session.id].status.error=true;
        cl[req.session.id].status.id=2000;
        cl[req.session.id].status.message='Zuvor in relevante Tabellenzeile klicken!';
        next();
    }  
}

exports.getParaAktien=function(req, res, next) {
    daten.dbRead(cl[req.session.id].snr+collParaAktien, {}, {"unternehmen": 1}).then((result) => {       // anonyme callback function
    cl[req.session.id].paraAktien=result;
    next();
}); 
}

exports.renderParaAktien=function(req, res, next) {
    {  
        if (cl[req.session.id].cnr < 1){
            cl[req.session.id].currPage = 'home';
            cl[req.session.id].anzPage = 'Home';
            cl[req.session.id].status.error=true;
            cl[req.session.id].status.id=1000;
            cl[req.session.id].status.message='Bitte erst einloggen!';
        }
        else{
            cl[req.session.id].currPage = 'paktien';
            cl[req.session.id].anzPage = 'pAktien';
        }
        let lData = {
            currPage: cl[req.session.id].currPage,
            anzPage: cl[req.session.id].anzPage,
            status: cl[req.session.id].status,
            nick: cl[req.session.id].nick,
            countries: data.countries,
            currencies: data.currencies,
            shareTypes: data.shareTypes,
            shareSectors: data.shareSectors,
            benchIndices: data.benchIndices,
            paraAktien: cl[req.session.id].paraAktien
        };
        res.render('pages/index.ejs', lData);
     }; 
 }

 exports.checkAssetAktien=function(req, res, next) {
    // Fehler -> dann gleich durchreichen
    if (cl[req.session.id].status.error){
        next();
        return;
    }
    let doc={};                               // relevantes document in collection
    let index = -1;                          // Index welche Tabellenzeile
    let pIndex = -1;                         // Index in Parameterliste, bei Insert erforderlich
    let sellStück = 0;                       // Stückzahl die verkauft werden soll
    let sDoc={};                            // sell Document
    let replace={};
    // let aDate;                            // Datum an dem Aktie gekauft bzw. verkauft wurde
    // Insert
    if (req.body.hasOwnProperty('butBuy')){
        if(req.body.selWKN=='wkn' || req.body.stück=='' || req.body.kurs=='' || req.body.datum==''){
            cl[req.session.id].status.error=true;
            cl[req.session.id].status.id=2001;
            cl[req.session.id].status.message='Alle Felder ausfüllen vor Insert!';
            next();
            return;
        }
        else{
            pIndex = parseInt(req.body.selWKN, 10);
            if(pIndex<0){
                    cl[req.session.id].status.error=true;
                    cl[req.session.id].status.id=2007;
                    cl[req.session.id].status.message='WKN kein Index, insert nicht möglich!';
                    next();
                    return;
                }
                doc={
                unternehmen: cl[req.session.id].paraAktien[pIndex].unternehmen,
                wkn: cl[req.session.id].paraAktien[pIndex].wkn,
                stück: parseFloat(req.body.stück),
                kurs: parseFloat(req.body.kurs),
                wert: parseFloat(req.body.stück) * parseFloat(req.body.kurs),
                k_kurs: parseFloat(req.body.kurs),
                k_datum: new Date(req.body.datum),
                entwicklung: 0.0,
                h_dauer: 0.0,
                rendite: 0.0,
                type: cl[req.session.id].paraAktien[pIndex].type,
                land: cl[req.session.id].paraAktien[pIndex].land,
                currency: cl[req.session.id].paraAktien[pIndex].currency,
                sektor: cl[req.session.id].paraAktien[pIndex].sektor,
                bench: cl[req.session.id].paraAktien[pIndex].bench  
                };
            daten.dbInsertOne(cl[req.session.id].snr+collAssetAktien, doc).then((result) => {       // anonyme callback function
                cl[req.session.id].status.id=3;
                cl[req.session.id].status.message='Document erfolgreich eingefügt!';
            })
            .catch((err) => {
                cl[req.session.id].status.error=true;
                cl[req.session.id].status.id=2003;
                cl[req.session.id].status.message='Insert in DB erfolglos. Meldetext: ' + err.message.toString();
            })
            .finally(() => {
                next();
                return;
            });
        }   
    }
    // bei Update, Delete und Sell muss Index >= 0 sein, d.h. Tabellenzeile muss angeklickt sein
    if (req.body.strIndex !== '-1'){
        let strIndex = req.body.strIndex;
        index = parseInt(strIndex);
        doc=cl[req.session.id].assetAktien[index];
        if (req.body.hasOwnProperty('butUpdate')){       // Update     
            if (req.body['unt'+strIndex] != ''){doc.unternehmen = req.body['unt'+strIndex];}
            if (req.body['wkn'+strIndex] != ''){doc.wkn = req.body['wkn'+strIndex];}
            if (req.body['stück'+strIndex] != ''){doc.stück = parseFloat(req.body['stück'+strIndex]);}
            if (req.body['k_kurs'+strIndex] != ''){doc.k_kurs = parseFloat(req.body['k_kurs'+strIndex]);}
            if (req.body['k_datum'+strIndex] != ''){
                doc.k_datum = new Date(req.body['k_datum'+strIndex]);
            }
            else{
                doc.k_datum = new Date(doc.k_datum);
            }
            doc.currency = req.body.curr[index];
            replace = {$set: doc};
            daten.dbUpdateOne(cl[req.session.id].snr+collAssetAktien, doc._id.id, replace).then((result) => {       // anonyme callback function
                cl[req.session.id].status.id=4;
                cl[req.session.id].status.message='Document erfolgreich upgedatet!';
            })
            .catch((err) => {
                cl[req.session.id].status.error=true;
                cl[req.session.id].status.id=2004;
                cl[req.session.id].status.message='Update in DB erfolglos. Meldetext: ' + err;
            })
            .finally(() => {
                next();
                return;
            });
        }
        else if (req.body.hasOwnProperty('butDelete')){       // Delete
            daten.dbDeleteOne(cl[req.session.id].snr+collAssetAktien, doc._id.id).then((result) => {       // anonyme callback function
                // console.log(result);
                cl[req.session.id].status.id=5;
                cl[req.session.id].status.message='Document erfolgreich gelöscht!';
            })
            .catch((err) => {
                cl[req.session.id].status.error=true;
                cl[req.session.id].status.id=2005;
                cl[req.session.id].status.message='Delete in DB erfolglos. Meldetext: ' + err.message.toString();
            })
            .finally(() => {
                next();
                return;
            });
        }
        else if (req.body.hasOwnProperty('butSell')){       // Sell
            if(req.body.stück=='' || req.body.kurs=='' || req.body.datum==''){      // diese Angaben müssen sein!
                cl[req.session.id].status.error=true;
                cl[req.session.id].status.id=2001;
                cl[req.session.id].status.message='Alle Felder ausfüllen vor Insert!';
                next();
                return;
            }
            sellStück = parseFloat(req.body.stück);
            if(sellStück > doc.stück){                            // ausreichend Wertpapiere müssen sein!
                cl[req.session.id].status.error=true;
                cl[req.session.id].status.id=2008;
                cl[req.session.id].status.message='Stückzahl zum Verkauf nicht vorhanden!';
                next();
                return;
            }
            // Verkaufsdaten in Datenbank speichern
            sDoc={
                wertpapier: doc.unternehmen,
                wkn: doc.wkn,
                stück: sellStück,
                k_wert: sellStück * doc.k_kurs,
                k_datum: new Date(doc.k_datum),
                v_wert: sellStück * parseFloat(req.body.kurs),
                v_datum: new Date(req.body.datum),
                entwicklung: (parseFloat(req.body.kurs) - doc.k_kurs) * sellStück,
                h_dauer: daten.diffTimeAbs(sDoc.v_datum, sDoc.k_datum, 'a'),
                rendite: daten.interestRate(sDoc.k_wert, sDoc.v_wert, sDoc.h_dauer),
                art: "Aktie"
            };
            daten.dbInsertOne(cl[req.session.id].snr+collSales, sDoc).then((result) => {       // anonyme callback function
                if((doc.stück-sellStück)>0.0001){    // Restbestand vorhanden?
                    doc.stück -= sellStück;     // neuer Restbestand
                    doc.k_datum = new Date(doc.k_datum);
                    doc.wert = doc.stück * doc.kurs;
                    replace = {$set: doc};
                    daten.dbUpdateOne(cl[req.session.id].snr+collAssetAktien, doc._id.id, replace).then((result) => {       // anonyme callback function
                        cl[req.session.id].status.id=4;
                        cl[req.session.id].status.message='Document erfolgreich upgedatet!';
                        next();
                        return;
                    });
                }
                else{                           // kein Restbestand mehr!
                    daten.dbDeleteOne(cl[req.session.id].snr+collAssetAktien, doc._id.id).then((result) => {       // anonyme callback function
                        cl[req.session.id].status.id=5;
                        cl[req.session.id].status.message='Document erfolgreich gelöscht!';
                        next();
                        return;
                    });  
                }
            });    
        }
        else{                                               // Warnung, dieser Button kam wohl aus versehen dazu
            cl[req.session.id].status.error=true;
            cl[req.session.id].status.id=1001;
            cl[req.session.id].status.message='Diese Aktion wird nicht ausgeführt!';
            next();
            return;
        }
    }
    else{
        cl[req.session.id].status.error=true;
        cl[req.session.id].status.id=2000;
        cl[req.session.id].status.message='Zuvor in relevante Tabellenzeile klicken!';
        next();
    }  
}

exports.getAssetAktien=function(req, res, next) {
    daten.dbRead(cl[req.session.id].snr+collAssetAktien, {}, {"unternehmen": 1}).then((result) => {       // anonyme callback function
        cl[req.session.id].assetAktien=result;
        for(let i=0; i<cl[req.session.id].assetAktien.length; i++){
            cl[req.session.id].assetAktien[i].k_datum=cl[req.session.id].assetAktien[i].k_datum.toISOString().slice(0, 10);
        }
    next();
}); 
}

exports.renderAssetAktien=function(req, res, next) {
    {  
        if (cl[req.session.id].cnr < 1){
            cl[req.session.id].currPage = 'home';
            cl[req.session.id].anzPage = 'Home';
            cl[req.session.id].status.error=true;
            cl[req.session.id].status.id=1000;
            cl[req.session.id].status.message='Bitte erst einloggen!';
        }
        else{
            cl[req.session.id].currPage = 'aaktien';
            cl[req.session.id].anzPage = 'aAktien';
        }
        let lData = {
            currPage: cl[req.session.id].currPage,
            anzPage: cl[req.session.id].anzPage,
            status: cl[req.session.id].status,
            nick: cl[req.session.id].nick,
            diff: cl[req.session.id].diff,
            countries: data.countries,
            currencies: data.currencies,
            shareTypes: data.shareTypes,
            shareSectors: data.shareSectors,
            benchIndices: data.benchIndices,
            paraAktien: cl[req.session.id].paraAktien,
            assetAktien: cl[req.session.id].assetAktien,
            totalAktien: cl[req.session.id].totalAktien
        };
        res.render('pages/index.ejs', lData);
     };
 }

 exports.getMarketIndex=function(req, res, next) {
    let promises = [];
    for(let k=0; k<arrTrIndex.length; k++){
        let promise = createPromiseIndex(urlIndex, arrTrIndex, k);
        promises.push(promise);
    }
    Promise.all(promises).then((result)=>{
        //alle Requests wurden abgearbeitet  -> result ist der letzte body? Schmierzeichen-Pedro ist da unsicher
        // for (let k=0; k<result.length; k++){
        //     console.log(JSON.stringify(result[k].val)); 
        // }
        data.indices = result;
        next();
    });
}

function createPromiseIndex(url, trArr, index){
    return new Promise(function (resolve, reject){
        request(url, function (error, response, body){
            let val = {};
            const $ = cheerio.load(body);
            const div = $('tr');
            val.index = index;
            val.tr = trArr[index];
            div.each((ind, element) => {
                if (ind === val.tr) {
                    val.wert = element.children[1].children[1].children[0].data;
                    if (ind < 29){
                        val.kurs = parseFloat(element.children[5].children[0].data.replace(/\./g, '').replace(/,/, '.'));
                        val.pmAbs = parseFloat(element.children[6].children[0].data.replace(/\./g, '').replace(/,/, '.'));
                        val.pmProz = parseFloat(element.children[7].children[0].data.replace(/\./g, '').replace(/,/, '.'));
                    }
                    else{
                        val.kurs = parseFloat(element.children[2].children[0].data.replace(/\./g, '').replace(/,/, '.'));
                        val.pmAbs = parseFloat(element.children[3].children[0].data.replace(/\./g, '').replace(/,/, '.'));
                        val.pmProz = parseFloat(element.children[4].children[0].data.replace(/\./g, '').replace(/,/, '.'));
                    }
                }
            });
            resolve({val});
        });
    });
}

exports.updAllAssetAktien=function(req, res, next) {
    let promises = [];
    for(let k=0; k<cl[req.session.id].assetAktien.length; k++){
        let promise = createPromiseUpdAllAssetAktien(cl[req.session.id].assetAktien, k, cl[req.session.id].snr);
        promises.push(promise);
    }
    Promise.all(promises).then((result)=>{
        //alle Requests wurden abgearbeitet  -> result ist der letzte body? Schmierzeichen-Pedro ist da unsicher
        next();
    });
}

function createPromiseUpdAllAssetAktien(assArr, index, snr){
    return new Promise(function (resolve, reject){
        let doc={};                               // relevantes document in collection
        let val = {};
        let replace={};
        doc=assArr[index];
        //val=assArr[index];
        replace = {$set: doc};
        val.index = index;
        //console.log('Werner'+index.toString());
        daten.dbUpdateOne(snr+collAssetAktien, doc._id.id, replace).then((res) => {       // anonyme callback function
            val.assetAktien = res;
            // cl[req.session.id].status.id=4;
            // cl[req.session.id].status.message='Document erfolgreich upgedatet!';
            resolve({val});
        });   
    });
}

exports.getExchangeRate=function(req, res, next) {
    let promises = [];
    for(let k=0; k<arrTrExchange.length; k++){
        let promise = createPromiseExchange(urlExchange, arrTrExchange, k);
        promises.push(promise);
    }
    Promise.all(promises).then((result)=>{
        //alle Requests wurden abgearbeitet  -> result ist der letzte body? Schmierzeichen-Pedro ist da unsicher
        // for (let k=0; k<result.length; k++){
        //     console.log(JSON.stringify(result[k].val)); 
        // }
        data.exchange = result;
        next();
    });
}

function createPromiseExchange(url, trArr, index){
    return new Promise(function (resolve, reject){
        request(url, function (error, response, body){
            let val = {};
            const $ = cheerio.load(body);
            const div = $('tr');
            val.index = index;
            val.tr = trArr[index];
            div.each((ind, element) => {
                if (ind === val.tr) {
                    val.curr = element.children[0].children[1].data.replace(/ /, '').replace(/\t/, '');
                    val.name = element.children[2].children[0].data;
                    val.rate = parseFloat(element.children[3].children[0].children[0].data);
                }
            });
            resolve({val});
        });
    });
}

exports.getSharePrice=function(req, res, next) {
    let promises = [];
    for(let k=0; k<cl[req.session.id].assetAktien.length; k++){
        let promise = createPromiseSharePrice(urlShares + cl[req.session.id].assetAktien[k].wkn, cl[req.session.id].assetAktien, k);
        promises.push(promise);
    }
    Promise.all(promises).then((result)=>{
        //alle Requests wurden abgearbeitet  -> result ist der letzte body? Schmierzeichen-Pedro ist da unsicher
        for (let k=0; k<result.length; k++){
            //console.log(JSON.stringify(result[k].val));
            cl[req.session.id].assetAktien[k].kurs = parseFloat(JSON.stringify(result[k].val.kurs));
            if (result[k].val.währung != data.curr){  // falls Onvistawährung <> Clientwährung
                let rate = 1.0;
                for (let j=0; j<data.exchange.length; j++){
                    if (data.exchange[j].val.curr == result[k].val.währung)
                        rate = data.exchange[j].val.rate;
                }
                cl[req.session.id].assetAktien[k].kurs /= rate;
            }
            if (cl[req.session.id].assetAktien[k].wkn == '723610' || cl[req.session.id].assetAktien[k].wkn == 'ENER6Y')      // Siemens und Energy
                cl[req.session.id].assetAktien[k].k_kurs = cl[req.session.id].assetAktien[k].kurs;
            cl[req.session.id].assetAktien[k].wert = cl[req.session.id].assetAktien[k].kurs * cl[req.session.id].assetAktien[k].stück;
            cl[req.session.id].assetAktien[k].k_datum=new Date(cl[req.session.id].assetAktien[k].k_datum);
            cl[req.session.id].assetAktien[k].entwicklung = (cl[req.session.id].assetAktien[k].kurs - cl[req.session.id].assetAktien[k].k_kurs) * cl[req.session.id].assetAktien[k].stück;
            cl[req.session.id].assetAktien[k].h_dauer = daten.diffTimeAbs(new Date(), cl[req.session.id].assetAktien[k].k_datum, 'a');
            cl[req.session.id].assetAktien[k].rendite = daten.interestRate(cl[req.session.id].assetAktien[k].k_kurs, cl[req.session.id].assetAktien[k].kurs, cl[req.session.id].assetAktien[k].h_dauer);
        }
        next();
    });
}

function createPromiseSharePrice(url, shArr, index){
    return new Promise(function (resolve, reject){
        request(url, function (error, response, body){
            let val = {};
            const $ = cheerio.load(body);
            const div = $('span');
            val.index = index;
            val.wkn = shArr[index].wkn;
            div.each((ind, element) => {
                if (ind === 26) {
                    val.unternehmen = element.children[1].children[0].data;
                }
                if (ind === 27) {
                    val.typ = element.children[0].data;
                }
                if (ind === 30) {
                    val.kurs = parseFloat(element.children[0].data.replace(/\./g, '').replace(/,/, '.'));
                }
                if (ind === 31) {
                    val.währung = element.children[0].data;
                }
            });
            resolve({val});
        });
    });
}

exports.renderCashMarket=function(req, res, next) {
{  
    if (cl[req.session.id].cnr < 1){
        cl[req.session.id].currPage = 'home';
        cl[req.session.id].anzPage = 'Home';
        cl[req.session.id].status.error=true;
        cl[req.session.id].status.id=1000;
        cl[req.session.id].status.message='Bitte erst einloggen!';
    }
    else{
        cl[req.session.id].currPage = 'market';
        cl[req.session.id].anzPage = 'Märkte';
    }
    let lData = {
        currPage: cl[req.session.id].currPage,
        anzPage: cl[req.session.id].anzPage,
        status: cl[req.session.id].status,
        nick: cl[req.session.id].nick,
        diff: cl[req.session.id].diff,
        countries: data.countries,
        currencies: data.currencies,
        shareTypes: data.shareTypes,
        shareSectors: data.shareSectors,
        benchIndices: data.benchIndices,
        paraAktien: cl[req.session.id].paraAktien,
        assetAktien: cl[req.session.id].assetAktien
    };
    res.render('pages/index.ejs', lData);
    };
}

 
 
 let pw = '$2b$10$JijLi4iQZMZP5m5KnCHJgeVFlKuyFNV5m1tJ.G21oMTcna5ySUaEO';   // Hashwert für Top Secret
 exports.getHashValue=function(req, res, next) {
     if (cl[req.session.id].status.error){
         next();
         return;
     }
     auth.hashValue('Top Secret', 10).then((result) => {       // anonyme callback function
         data.hashValue=result;
         next();
     }); 
 }
 
 exports.compHashValue=function(req, res, next) {
     if (cl[req.session.id].status.error){
         next();
         return;
     }
     auth.compHashValue('Top Secret', pw).then((result) => {       // anonyme callback function
         next();
     }); 
 }

 exports.insertAktie=function(req, res, next) {
    'use strict'
    let position = {WKN: "723610", Unternehmen: "Siemens", Anzahl: 309.324, Preis: 117.28};
    daten.dbInsertOne(cl[req.session.id].snr + 'myAktien', position).then((result) => {       // anonyme callback function
    next();
    }); 
}

exports.deleteAktie=function(req, res, next) {
    'use strict'
    let strObjectID = "5faab02e1cce5f171c446567";
    daten.dbDeleteOne(cl[req.session.id].snr + 'myAktien', strObjectID).then((result) => {       // anonyme callback function
    next();
    }); 
}

exports.updateAktie=function(req, res, next) {
    'use strict'
    let strObjectID = "5fbf7226d228454d2cc67a5e";
    let replace={$set: {"Anzahl": 844.0}};
    daten.dbUpdateOne(cl[req.session.id].snr + 'myAktien', strObjectID, replace).then((result) => {       // anonyme callback function
    next();
    }); 
}

exports.renderAbout=function(req, res, next) {
    var dataBar = {type: 'bar'};
    dataBar.data={};
    dataBar.data.labels=[];
    var preise=[];
    var backgroundColor=[];
    var borderColor=[];
    for(var i=0; i<cl[req.session.id].myAktien.length; i++)
    {
        dataBar.data.labels.push(cl[req.session.id].myAktien[i].Unternehmen);
        preise.push(cl[req.session.id].myAktien[i].Preis);
        backgroundColor.push(data.colors[i].backgroundColor);
        borderColor.push(data.colors[i].borderColor);
    }
    dataBar.data.datasets=[];
    var entry={
        label: 'Kurse',
        data: preise,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        borderWidth: 1,
        offsetWidth: 0  
    };
    dataBar.data.datasets[0]=entry;
    //dataBar.data.maintainAspectRatio=false;
    dataBar.data.options={
        responsive: true,
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    };

    if (cl[req.session.id].cnr < 1){
        cl[req.session.id].currPage = 'home';
        cl[req.session.id].anzPage = 'Home';
        cl[req.session.id].status.error=true;
        cl[req.session.id].status.id=1000;
        cl[req.session.id].status.message='Bitte erst einloggen!';
    }
    else{
        cl[req.session.id].currPage = 'about';
        cl[req.session.id].anzPage = 'tAbout';
    } 
    cl[req.session.id].BarData=dataBar;
    cl[req.session.id].status.id=1200;
    cl[req.session.id].status.message='Dies ist eine Warnmeldung!';
    res.render('pages/index.ejs', cl[req.session.id]);
 }

 exports.renderAktienPara=function(req, res, next) {
    {  
     if (cl[req.session.id].cnr < 1){
         cl[req.session.id].currPage = 'home';
         cl[req.session.id].anzPage = 'Home';
         cl[req.session.id].status.error=true;
         cl[req.session.id].status.id=1000;
         cl[req.session.id].status.message='Bitte erst einloggen!';
     }
     else{
         cl[req.session.id].currPage = 'aktienParameter';
         cl[req.session.id].anzPage = 'tPara';
     }
     let lData = {
        currPage: cl[req.session.id].currPage,
        anzPage: cl[req.session.id].anzPage,
        status: cl[req.session.id].status,
        nick: cl[req.session.id].nick,
        countries: data.countries,
        currencies: data.currencies,
        myAktien: cl[req.session.id].myAktien
    };
     res.render('pages/index.ejs', lData);
     }; 
 }
 
 exports.getMyAktien=function(req, res, next) {
         daten.dbRead(cl[req.session.id].snr+'myAktien', {}, {"Unternehmen": 1}).then((result) => {       // anonyme callback function
             cl[req.session.id].myAktien=result;
         next();
     }); 
 }
 
 exports.aggMyAktien=function(req, res, next) {
         daten.dbAsset(cl[req.session.id].snr+'myAktien', [{"$group":{"_id":"$Unternehmen", "Wert":{$sum:{$multiply:["$Anzahl","$Preis"]}}}},{"$sort":{_id:1}}]).then((result) => {       // anonyme callback function
             cl[req.session.id].aggAktien=result;
         next();
     }); 
 }
 
 exports.totalMyAktien=function(req, res, next) {
    daten.dbAsset(cl[req.session.id].snr+'myAktien', [{"$group":{"_id":0, "Wert":{$sum:{$multiply:["$Anzahl","$Preis"]}}}},{"$sort":{_id:1}}]).then((result) => {       // anonyme callback function
        cl[req.session.id].totalAktien=result;
    next();
}); 
}

 exports.totalAktien=function(req, res, next) {
         daten.dbAsset(cl[req.session.id].snr+collAssetAktien, [{"$group":{"_id":0, "Wert":{$sum:{$multiply:["$stück","$kurs"]}}}},{"$sort":{_id:1}}]).then((result) => {       // anonyme callback function
            cl[req.session.id].totalAktien=result;
            next();
     }); 
 }
 
 exports.renderAktien=function(req, res, next) {
     {   
         if (cl[req.session.id].cnr < 1){
             cl[req.session.id].currPage = 'home';
             cl[req.session.id].anzPage = 'Home';
             cl[req.session.id].status.error=true;
             cl[req.session.id].status.id=1000;
             cl[req.session.id].status.message='Bitte erst einloggen!';
         }
         else{
             cl[req.session.id].currPage = 'aktien';
             cl[req.session.id].anzPage = 'tAktien';
         }
         let lData = {
            currPage: cl[req.session.id].currPage,
            anzPage: cl[req.session.id].anzPage,
            status: cl[req.session.id].status,
            nick: cl[req.session.id].nick,
            countries: data.countries,
            currencies: data.currencies,
            myAktien: cl[req.session.id].myAktien,
            aggAktien: cl[req.session.id].aggAktien,
            totalAktien: cl[req.session.id].totalAktien
        };
         res.render('pages/index.ejs', lData);
      }; 
  }