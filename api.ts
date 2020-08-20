// import { undraftPlayerAPI } from "./fantasy_functions";

const express = require('express');

const api = express();
const { loadNHLDataToRedis, getTopPlayersOfEachPosition, calculateDeltasForPlayerToDraft,
        draftPlayerAPI, undraftPlayerAPI, clearRedis} = require("./fantasy_functions")

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

async function setupRedis(){
    console.log("setting up redis");
    // clearRedis();
    loadNHLDataToRedis(true);
    console.log("finished setting up redis");
    return;
}

async function runAPI(){
    await setupRedis();
    api.listen(3001, () => {
        console.log('API up and running!');
    });
}

api.get('/', (req, res) => {
    // console.log(req);
    res.send('Hello, world!');
});

api.get('/recommended/players/:picksUntilNextPick', async (req, res) => {
    let picksUntilNextPick = req.params.picksUntilNextPick
    await getTopPlayersOfEachPosition(picksUntilNextPick);
    let recommendations = await calculateDeltasForPlayerToDraft();
    let objRecommendations = {
        arrayRecommendations: recommendations
    }
    res.send(objRecommendations);
});

api.get('/draft/:player', async (req, res) => {
    let player = req.params.player;

    let response = await draftPlayerAPI({fullName: player, id: 0})
    res.send(response);
});

api.get('/undraft/:player', async (req, res) => {
    let player = req.params.player;

    let response = await undraftPlayerAPI({fullName: player, id: 0})
    res.send(response);
});

runAPI();