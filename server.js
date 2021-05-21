'use strict';
const port=8080;

// load the things we need
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const database = require('./logic/database.js');
const routes = require('./routes/call.js');

const app = express();
app.use(session({secret: 'Pedro',
             resave: true,
             saveUninitialized: true}));
// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));  // support encodies bodies
app.use(bodyParser.json());

// die kommenden 4 Routen nur für Testzwecke
app.post('/test', [routes.traceRoute, routes.cleanStatus, routes.getCountries, routes.getCurrencies, routes.getMyAktien, routes.renderAktien]);
app.get('/test', [routes.traceRoute, routes.cleanStatus, routes.getCountries, routes.getCurrencies, routes.renderAktienPara]);
app.get('/aktien', [routes.traceRoute, routes.cleanStatus, routes.getMyAktien, routes.aggMyAktien, routes.totalMyAktien, routes.renderAktien]);
app.get('/about', [routes.traceRoute, routes.cleanStatus, routes.getMyAktien, routes.getColors, routes.renderAbout]);

// ab hier die relevanten Routen
app.get('/', [routes.initSession, routes.traceRoute, routes.cleanStatus, routes.renderHome]);
app.post('/', [routes.traceRoute, routes.cleanStatus, routes.renderHome]);
app.post('/login', [routes.traceRoute, routes.cleanStatus, routes.getCountries, routes.getCurrencies, routes.getShareTypes, routes.getShareSectors, routes.getBenchIndices, routes.getClients, routes.getHashValue, routes.compHashValue, routes.logIn, routes.renderHome]);
app.post('/logout', [routes.traceRoute, routes.cleanStatus, routes.getClients,routes.logOut, routes.renderHome]);
app.get('/para/paktien', [routes.traceRoute, routes.cleanStatus, routes.getParaAktien, routes.renderParaAktien]);
app.post('/para/paktien', [routes.traceRoute, routes.cleanStatus, routes.checkParaAktien, routes.getParaAktien, routes.renderParaAktien]);
app.get('/asset/aaktien', [routes.traceRoute, routes.cleanStatus, routes.getParaAktien, routes.getAssetAktien, routes.totalAktien, routes.renderAssetAktien]);
app.post('/asset/aaktien', [routes.traceRoute, routes.cleanStatus, routes.checkAssetAktien, routes.getAssetAktien, routes.totalAktien, routes.renderAssetAktien]);
app.get('/cash/market', [routes.traceRoute, routes.cleanStatus, routes.getParaAktien, routes.getAssetAktien, routes.getMarketIndex, routes.getExchangeRate, routes.getSharePrice, routes.updAllAssetAktien, routes.totalAktien, routes.renderCashMarket]);
//app.get('/cash/market', [routes.traceRoute, routes.cleanStatus, routes.getParaAktien, routes.getAssetAktien, routes.getExchangeRate, routes.getSharePrice, routes.updAllAssetAktien, routes.totalAktien, routes.renderCashMarket]);

// launch server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    return database.doConnect().then(() => {
        console.log(`RESTful Service API now working ...`);
        console.log('=======================================================================');
    });
});


