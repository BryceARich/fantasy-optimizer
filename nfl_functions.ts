import { RedisClient } from "redis";
const redis = require("./redis-client");

const prompt = require('prompt-sync')({sigint: true});

const csv = require('csvtojson'),
request = require('request');
const {promisify} = require("util");

interface ObjSystem {
    redisClient: RedisClient
}

var objSystem: ObjSystem = {
    redisClient: redis.getNewRedisClient()
}

interface IObjNFLSeasonStats{
    DefenseTD: number,
    DefenseINT: number,
    DefenseFR: number,
    DefenseSCK: number,
    DefenseSFTY: number,
    DefenseBLK: number,
    DefensePA: number,
    DefenseYA: number,
    FG39: number,
    FGA39: number,
    FGM39: number,
    FG49: number,
    FGA49: number,
    FGM49: number,
    FG50: number,
    FGA50: number,
    FGM50: number,
    FG: number,
    FGA: number,
    FGM: number,
    XP: number,
    XPA: number,
    XPM: number,
    CA: string,
    Completions: number,
    Attempts: number,
    PassingYDS: number,
    PassingTD: number,
    PassingINT: number,
    RushingCAR: number,
    RushingYDS: number,
    RushingTD: number,
    REC: number,
    ReceivingYDS: number,
    ReceivingTD: number,
    ReceivingTAR: number,
    TWOPC: number,
    FUML: number,
    TD: number,
    fantasyValue: number,
    FPTS: number,
    AVG: number
}

interface IObjNFLPlayer {
    id: number,
    fullName: string,
    teamName: string,
    position: string,
    seasonStats: IObjNFLSeasonStats
}
let currentPosition : string = ""

async function readCSVs(arrayPositions){
    for(let index in arrayPositions){
        currentPosition = arrayPositions[index];
        let json = await csv().fromFile(`./nfl_csvs/playerDataProjections2021/2021NFLPlayerProjections-${currentPosition}.csv`);
        json.forEach(printPlayer)
    }
    console.log(statFields);
}

let statFields = [];
let activePlayers : Array<IObjNFLPlayer> = []
let currentId = 0;


function printPlayer(item, index) {
    for(let field in item){
        if(!statFields.includes(field)){
            statFields.push(field);
        }
    }
    let newPlayer: IObjNFLPlayer = {
        id: currentId,
        fullName: "",
        position: "",
        teamName: "",
        seasonStats: item
    };
    currentId++;
    newPlayer.fullName = item.PLAYER.split("\n")[0];
    console.log(item);
    console.log(item.POS)
    // newPlayer.position = currentPosition
    newPlayer.position = item.POS
    if(item.CA){
        newPlayer.seasonStats.Completions = item.CA.split("/")[0];
        newPlayer.seasonStats.Attempts = item.CA.split("/")[1];
    }
    activePlayers.push(newPlayer);
}

async function getStatisticFieldsPointValuesFromUser(statisticFields: Array<string>){
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    let bReplace = prompt(`Do you want to enter new Fantasy Fields and/or overwrite existing NFL fields point values?\t`);
    console.log(bReplace);
    if([true, 'y', 'Y', 'Yes','yes'].includes(bReplace)){
        statisticFields.forEach(async(field) => {
            let value:number;
            let timesFailed = 0;
            do{
                if(timesFailed > 0){
                    console.log("Invalid input value. Must be a float, please try again");
                }
                timesFailed++;
                value = prompt(`How many points does your league award for ${field}?\t`);
            } while(isNaN(value));
            await redisHSetAsync(`nfl_fantasy_points`, `${field}`, value.toString());
            // console.log(`Assigned ${value} points per ${field}`);
        });
    } else {
        console.log("Retaining existing fields and values for fantasy points");
    }
}

async function calculateFantasyWorthForPlayer(activePlayers: Array<IObjNFLPlayer>){
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const redisZAddAsync = promisify(objSystem.redisClient.zadd.bind(objSystem.redisClient));
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    await Promise.all(activePlayers.map(async player => {
        let nFantasyWorth = 0;
        if(player.seasonStats != null){
            for(let index in player.seasonStats){
                nFantasyWorth = 0;
                // console.log(`Season stats`);
                // console.log(player.seasonStats);
                let seasonStats = player.seasonStats;
                for(let field in seasonStats){
                    // console.log(Number(seasonStats[field]));
                    // console.log(field);
                    let modifier = await redisHGetAsync(`nfl_fantasy_points`, field)
                    // console.log(modifier);
                    let fieldStat = Number(seasonStats[field])
                    if(!isNaN(fieldStat)){
                        nFantasyWorth = nFantasyWorth + fieldStat * modifier;
                        // console.log(nFantasyWorth);
                    }
                }
                seasonStats.fantasyValue = nFantasyWorth;
                // console.log(player.fullName, sSeason, player.arraySeasonStats[0][index].stat.fantasyValue);
            }
            // run it through and push the score for each season, this way when pulling data for a player it will be the same json data for all seasons
            for(let index in player.seasonStats){
                // let sSeason = player.arraySeasonStats[0][index].season;
                let sSeason = "2021";
                let seasonStats = player.seasonStats;
                // let leagueID = player.arraySeasonStats[0][index].league.id;
                // if(leagueID !== 133){
                //     continue;
                // }
                nFantasyWorth = seasonStats.fantasyValue
                await redisZAddAsync(`nfl_fantasy_player_value_${sSeason}`, nFantasyWorth, JSON.stringify(player));
                await redisZAddAsync(`nfl_fantasy_player_value_position_${player.position.replace(" ","_")}_${sSeason}`, nFantasyWorth, JSON.stringify(player));
                if(["RB", "TE", "WR"].includes(player.position)){
                    await redisZAddAsync(`nfl_fantasy_player_value_position_FLEX_${sSeason}`, nFantasyWorth, JSON.stringify(player));
                }
                // await redisZAddAsync(`nfl_fantasy_player_value_position_type_${player.position.replace(" ","_")}_${sSeason}`, nFantasyWorth, JSON.stringify(player));
                // console.log(sSeason);
            }
        }
        await redisHSetAsync(`nfl_player_available_to_draft`, `${player.id}`, true);
        await redisHSetAsync(`nfl_player_lookup`, `${await convertPlayerNameToRedisKey(player.fullName)}`, `${player.id}`);
    }));
}

async function convertPlayerNameToRedisKey(sPlayerName: string){
    sPlayerName = sPlayerName.toLowerCase();
    sPlayerName = sPlayerName.replace(/[^a-z0-9+]+/gi, '_');
    console.log(sPlayerName);
    return sPlayerName;
}

async function calculatePlayersWorth(){
    console.log(activePlayers[0]);
    await calculateFantasyWorthForPlayer(activePlayers);
}

async function lookupPlayerAvailability(){
    const redisHGetAsync =  promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    console.log(`\nlooking up player\n`);
    let sInput = prompt("What is the Full name of the player you want to lookup?");
    let sPlayerName = await convertPlayerNameToRedisKey(sInput);
    console.log(`\n${sPlayerName}`)
    let nPlayerId = await redisHGetAsync(`nfl_player_lookup`, `${sPlayerName}`);
    console.log(nPlayerId);
    let bAvailability = await redisHGetAsync(`nfl_player_available_to_draft`, `${nPlayerId}`);
    console.log(`${sInput} available? ${bAvailability}\n`);
}

function hasNumber(myString) {
    return /\d/.test(myString);
}

async function changeDraftStatusForPlayer(bDrafting){
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    const redisHGetAsync =  promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const sAction = bDrafting? "draft" : "undraft"
    console.log(`\n${sAction}ing player\n`);
    let sInput = prompt("What is the Full name or id of the player you want to draft?");
    // if(hasNumber(sInput)){
    //     console.log("ID provided");
    // } else {
    //     console.log("Name Provided");
    // }
    let sPlayerName = await convertPlayerNameToRedisKey(sInput);
    console.log(`\n${sPlayerName}`)
    let nPlayerId = await redisHGetAsync(`nfl_player_lookup`, `${sPlayerName}`);
    console.log(nPlayerId);
    let bAvailability = (await redisHGetAsync(`nfl_player_available_to_draft`, `${nPlayerId}`)) === "true";
    console.log(`${sInput} available? ${bAvailability}\n`);
    if(bAvailability != null && bAvailability == bDrafting){
        await redisHSetAsync(`nfl_player_available_to_draft`, `${nPlayerId}`, !bDrafting);
        console.log(`The player ${sInput} was successfully ${sAction}ed`);
    } else {
        console.error(`The player ${sInput} doesn't exist or was not available`);
    }
}

export async function getTopAvailablePlayers(availablePlayersOnly: boolean, sSeason: string, nNumberOfPlayers: number, sPosition: string = ""){
    const redisZRevRangeAsync = promisify(objSystem.redisClient.zrevrange.bind(objSystem.redisClient));
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    let top10Players = [];
    let redisKey;
    if(sPosition !== ""){
        redisKey = `nfl_fantasy_player_value_position_${sPosition}_${sSeason}`
    } else {
        redisKey = `nfl_fantasy_player_value_${sSeason}`
    }
    try{
        let rank = 0;
        while(top10Players.length < nNumberOfPlayers){
            let zRangeResult = await redisZRevRangeAsync(redisKey, rank, rank, "WITHSCORES");
            // console.log(zRangeResult.length);
            for(let index=0; index < zRangeResult.length; index+=2){
                let player = JSON.parse(zRangeResult[index])
                // console.log(player.id, player.fullName, zRangeResult[index+1]);
                let owner = await redisHGetAsync("nfl_player_available_to_draft", player.id);
                if(availablePlayersOnly && "true" === owner){
                    // console.log(`${player.fullName} is Available`);
                    top10Players.push({fullName: player.fullName, id: player.id, position: player.position, fantasyValue: Number(zRangeResult[index+1]), deltas: [], deltaRanks: [], averageDeltaRank: 0});
                } else if(!availablePlayersOnly && "false" !== owner) {
                    top10Players.push({fullName: player.fullName, id: player.id, position: player.position, fantasyValue: Number(zRangeResult[index+1]), deltas: [], deltaRanks: [], averageDeltaRank: 0});
                    // console.log(`${player.fullName} is NOT Available`);
                }
            }
            rank++;
        }
    } catch(err){
        console.log(err);
    }
    // console.log(`Top 10 ${sPosition} Available:`)
    // console.log(top10Players);
    return top10Players
}

let objBestPlayersAvailable = {
    overall: [],
    running_backs: [],
    wide_receivers: [],
    quarter_backs: [],
    defense_special_teams: [],
    kickers: [],
    tightends: [],
    flex: []
}

export async function getTopPlayersOfEachPosition(nNumberOfPlayers: number, sYearsOfSeason="2021"){
    const redisSetAsync =  promisify(objSystem.redisClient.set.bind(objSystem.redisClient));
    objBestPlayersAvailable.overall = await getTopAvailablePlayers(true,sYearsOfSeason, nNumberOfPlayers);
    objBestPlayersAvailable.running_backs = await getTopAvailablePlayers(true,sYearsOfSeason, nNumberOfPlayers, "RB");
    objBestPlayersAvailable.quarter_backs = await getTopAvailablePlayers(true,sYearsOfSeason, nNumberOfPlayers, "QB");
    objBestPlayersAvailable.wide_receivers = await getTopAvailablePlayers(true,sYearsOfSeason, nNumberOfPlayers, "WR");
    objBestPlayersAvailable.defense_special_teams = await getTopAvailablePlayers(true,sYearsOfSeason, nNumberOfPlayers, "DST");
    objBestPlayersAvailable.kickers = await getTopAvailablePlayers(true,sYearsOfSeason, nNumberOfPlayers, "K");
    objBestPlayersAvailable.tightends = await getTopAvailablePlayers(true,sYearsOfSeason, nNumberOfPlayers, "TE");
    objBestPlayersAvailable.flex = await getTopAvailablePlayers(true,sYearsOfSeason, nNumberOfPlayers, "FLEX");
    // console.log(objBestPlayersAvailable);
    await redisSetAsync("nfl_top_players_available", JSON.stringify(objBestPlayersAvailable));
}


async function getAverageDeltaRank(player){
    player.averageDeltaRank = player.deltaRanks.reduce((a,b) => a+b) / player.deltaRanks.length;
    // console.log(player);
}

async function rankPositionToDraftByDeltas(){
    let overall = objBestPlayersAvailable.overall[0],
        running_back = objBestPlayersAvailable.running_backs[0],
        quarter_back = objBestPlayersAvailable.quarter_backs[0],
        wide_receiver = objBestPlayersAvailable.wide_receivers[0],
        defense_special_team = objBestPlayersAvailable.defense_special_teams[0],
        kicker = objBestPlayersAvailable.kickers[0],
        tightend = objBestPlayersAvailable.tightends[0],
        flex = objBestPlayersAvailable.flex[0];
    for(let index = 0; index < objBestPlayersAvailable.overall.length; index++){
        let arr = [overall.deltas[index], running_back.deltas[index], quarter_back.deltas[index], wide_receiver.deltas[index], defense_special_team.deltas[index], kicker.deltas[index], tightend.deltas[index], flex.deltas[index]];
        let sorted = arr.slice().sort(function(a,b){return b-a})
        let ranks = arr.map(function(v){ return sorted.indexOf(v)+1 });
        // console.log(overall)
        overall.deltaRanks.push(ranks[0]);
        running_back.deltaRanks.push(ranks[1]);
        quarter_back.deltaRanks.push(ranks[2]);
        wide_receiver.deltaRanks.push(ranks[3]);
        defense_special_team.deltaRanks.push(ranks[4]);
        kicker.deltaRanks.push(ranks[5]);
        tightend.deltaRanks.push(ranks[6]);
        flex.deltaRanks.push(ranks[7]);
        // console.log(`original array ${arr}, and associate ranks ${ranks}`);
    }
    await getAverageDeltaRank(overall);
    await getAverageDeltaRank(defense_special_team);
    await getAverageDeltaRank(running_back);
    await getAverageDeltaRank(quarter_back);
    await getAverageDeltaRank(wide_receiver);
    await getAverageDeltaRank(kicker);
    await getAverageDeltaRank(tightend);
    await getAverageDeltaRank(flex);
    overall.category = "overall";
    defense_special_team.category = "defense_special_team";
    running_back.category = "running_back";
    quarter_back.category = "quarter_back";
    wide_receiver.category = "wide_receiver";
    kicker.category = "kicker";
    tightend.category = "tightend";
    flex.category = "flex";
    let positions = [overall,running_back,quarter_back,wide_receiver,defense_special_team,kicker,tightend,flex]
    positions = positions.slice().sort(function(a,b){return a.averageDeltaRank-b.averageDeltaRank})
    let recommendations = []
    positions.forEach(player => {
        let averageDelta = player.deltas.reduce((a,b) => Number(a) + Number(b), 0) / player.deltas.length;
        // console.log(player.fantasyValue);
        // console.log(`${player.fullName}, ${player.id}, ${player.position}, ${player.category}`)
        recommendations.push({fullName: player.fullName, id: player.id, position: player.position, category: player.category, fantasyValue: player.fantasyValue, averageDelta: averageDelta, deltas: player.deltas, firstDelta: player.deltas[1], lastDelta: player.deltas[player.deltas.length - 1], averageDeltaRank: player.averageDeltaRank})
    });
    return recommendations;
    // console.log(positions);
}

export async function calculateDeltasForPlayerToDraft(){
    const redisGetAsync =  promisify(objSystem.redisClient.get.bind(objSystem.redisClient));
    objBestPlayersAvailable = JSON.parse(await redisGetAsync("nfl_top_players_available"));
    for(let position in objBestPlayersAvailable){
        // console.log(objBestPlayersAvailable[position])
        let topPlayer = objBestPlayersAvailable[position][0];
        objBestPlayersAvailable[position].forEach(player => {
            // console.log("topPlayer\n", topPlayer, "player\n", player);
            topPlayer.deltas.push(Number(topPlayer.fantasyValue - player.fantasyValue).toFixed(2));
        });
        // console.log(objBestPlayersAvailable[position][0].deltas);
    }
    return await rankPositionToDraftByDeltas();
    // console.log(objBestPlayersAvailable);
}

export async function draftPlayerAPI(player, draftTeam=false){
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    // let sDraftedPlayer = prompt(`What is the full name of the drafted player?\t`);
    if(player.fullName != 'undefined' && player.fullName != ''){
        console.log(await convertPlayerNameToRedisKey(player.fullName));
        // let sDraftingTeam = prompt(`What team drafted the player?\t`);
        // console.log(`${sDraftedPlayer} drafted by ${sDraftingTeam}`);
        player.id = await redisHGetAsync(`nfl_player_lookup`, await convertPlayerNameToRedisKey(player.fullName));
    }
    console.log(player.id);
    await redisHSetAsync(`nfl_player_available_to_draft`, `${player.id}`, draftTeam);
}

export async function undraftPlayerAPI(player, draftTeam){
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    // let sDraftedPlayer = await convertPlayerNameToRedisKey(prompt(`What is the full name of the drafted player?\t`));
    if(player.fullName != 'undefined' && player.fullName != ''){
        console.log(await convertPlayerNameToRedisKey(player.fullName));
        // let sDraftingTeam = prompt(`What team drafted the player?\t`);
        // console.log(`${sDraftedPlayer} drafted by ${sDraftingTeam}`);
        player.id = await redisHGetAsync(`nfl_player_lookup`, await convertPlayerNameToRedisKey(player.fullName));
    }
    console.log(player.id);
    await redisHSetAsync(`nfl_player_available_to_draft`, player.id, true);
}



async function runProgram(){
    let sInput = ""
    console.log("Starting");
    let nfl_positions = ["All"]
    // let nfl_positions = ["D_ST","K", "QB", "RB", "TE", "WR"]
    sInput = prompt("Do you want to reload the players?")
    if([true, 'y', 'Y', 'Yes','yes'].includes(sInput)){
        await readCSVs(nfl_positions);
    }
    console.log(activePlayers);
    await getStatisticFieldsPointValuesFromUser(statFields);
    await calculatePlayersWorth();
    console.log("Ending");


    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    let bContinueRunning = true;

    const redisHGetAsync =  promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    while(bContinueRunning){sInput = "";
        sInput = prompt(`Do you want to draft (1), lookup(2), undraft(3), or get recommendation(4) for a player?`);
        if(sInput === "1"){
            await changeDraftStatusForPlayer(true);
        } else if(sInput === "2"){
            await lookupPlayerAvailability();
        } else if(sInput === "3"){
            await changeDraftStatusForPlayer(false);
        } else if (sInput === "4"){
            console.log(`\nRecommended players selected\n`)
            sInput = prompt(`How many positions til your next draft?`)
            await getTopPlayersOfEachPosition(Number(sInput));
            let recommendations = await calculateDeltasForPlayerToDraft()
            console.log(`The top players for each position in order of biggest dropoff are:`)
            recommendations.forEach(player => {
                console.log(`${player.fullName}, ${player.category} valued at ${player.fantasyValue} is on Average Ranked ${player.averageDeltaRank}/8.0. \nFirst dropoff ${player.firstDelta}, run on position dropoff ${player.lastDelta}, average dropoff ${player.averageDelta}.\n All Deltas ${player.deltas}\n\n\n`)
            });
            // console.log(recommendations);
        } else {
            console.log(`\nInvalid option. No Action taken continue to try again.\n`)
        }
        sInput = prompt(`To quit stop drafting players type "quit", "exit", or "false". Otherwise hit enter:\t`);
        if (['false', 'quit', 'exit'].includes(sInput)){
            bContinueRunning = false;
        }
    }
    objSystem.redisClient.quit()
}

// runProgram();

// console.log(request("https://api.nfl.com/v1/games", { json: true }));
