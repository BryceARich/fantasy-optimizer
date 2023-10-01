// import { getTopAvailablePlayers } from "./fantasy_functions";

// import { undraftPlayerAPI } from "./fantasy_functions";

const express = require('express');

const api = express();
// const { loadNHLDataToRedis, getTopPlayersOfEachPosition, calculateDeltasForPlayerToDraft,
//         draftPlayerAPI, undraftPlayerAPI, clearRedis} = require("./fantasy_functions")
const { draftPlayerAPI, undraftPlayerAPI, getTopAvailablePlayers, getTopPlayersOfEachPosition, calculateDeltasForPlayerToDraft} = require("./nfl_functions")

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

async function setupRedis(){
    console.log("setting up redis");
    // clearRedis();
    // loadNHLDataToRedis(true);
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

api.get('/recommended/players/:picksUntilNextPick/season/:yearsOfSeason', async (req, res) => {
    let picksUntilNextPick = req.params.picksUntilNextPick;
    let sYearsOfSeason = req.params.yearsOfSeason;
    console.log("Request for recommended players from the year", sYearsOfSeason)
    await getTopPlayersOfEachPosition(picksUntilNextPick, sYearsOfSeason);
    let recommendations = await calculateDeltasForPlayerToDraft();
    // recommendations = await rankPositionToDraftByDeltas();
//     console.log("Recommendations:", recommendations);
    let objRecommendations = {
        arrayRecommendations: recommendations
    }
//     console.log(recommendations);
    res.send(objRecommendations);
});

api.get('/players/:numberOfPlayers/season/:yearsOfSeason', async (req, res) => {
    let nNumberOfPlayers = req.params.numberOfPlayers;
    let sYearsOfSeason = req.params.yearsOfSeason;
    console.log("Request for players from the year", sYearsOfSeason)
    let topPlayers = await getTopAvailablePlayers(false, sYearsOfSeason, nNumberOfPlayers);
    // let topPlayers = await getTopAvailablePlayers("20192020", nNumberOfPlayers)
    // console.log("TOP PLAYERS", topPlayers);
    // let recommendations = await calculateDeltasForPlayerToDraft();
    let objPlayers = {
        arrayPlayers: topPlayers
    }
    console.log("OBJPLAYERS", objPlayers);
    res.send(objPlayers);
});

api.get('/draft/:player/team/:team', async (req, res) => {
    let player = req.params.player;
    let team = req.params.team;

    let response = await draftPlayerAPI({fullName: player, id: 0}, team)
    res.send(response);
});

api.get('/undraft/:player', async (req, res) => {
    let player = req.params.player;

    let response = await undraftPlayerAPI({fullName: player, id: 0})
    res.send(response);
});

runAPI();