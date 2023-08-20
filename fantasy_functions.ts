import { RedisClient } from "redis";
const redis = require("./redis-client");

const prompt = require('prompt-sync')({sigint: true});

const csv = require('csvtojson'),
request = require('request');
const {promisify} = require("util");

interface IObjScoring {
    arrayFields: Array<IObjScoringField>
}

interface IObjScoringField {
    sFieldname: string,
    fPointModfier: number
}

interface IObjPosition {
    code: string,
    name: string,
    type: string,
    abbreviation: string
}

interface IObjSeasonStats{
    season: string,
    stat: any,
    team: any,
    league: any,
    sequenceNumber: number
}

export interface IObjPlayer {
    id: number,
    fullName: string,
    position: IObjPosition,
    arraySeasonStats?: Array<Array<IObjSeasonStats>>
}

interface ObjSystem {
    redisClient: RedisClient
}

var objSystem: ObjSystem = {
    redisClient: redis.getNewRedisClient()
}

const asyncRequest = promisify(request.bind(request))

let objScoring: IObjScoring = {
    arrayFields: []
}

async function loadScoringSystem(){
    const converter= await csv()
    .fromFile('./testFiles/fantasy_hockey_point_system.csv')
    .then((json)=>{
        console.log("Loading Scoring System");
        // console.log(json);
        for(let field in json[0]){
            let objStatsField: IObjScoringField = {sFieldname: field, fPointModfier: json[0][field]};
            // console.log(objStatsField);
            objScoring.arrayFields.push(objStatsField);
        }
    });
}

export async function getTeamIds(): Promise<Array<number>>{
    let arrayTeamIds = [];
    try{
        let response = await asyncRequest("https://statsapi.web.nhl.com/api/v1/teams", { json: true }),
        body = response.body;
        body.teams.forEach(element => {
            arrayTeamIds.push(element.id);
        });
    } catch(err){
        throw console.log(err);
    }
    return arrayTeamIds;
}

export async function getActivePlayers(teamIds: Array<number>): Promise<Array<IObjPlayer>>{
    let activePlayerIds = []
    await Promise.all(teamIds.map(async teamId => {
        let response = await asyncRequest(`https://statsapi.web.nhl.com/api/v1/teams/${teamId}/roster`, { json: true }),
        body = response.body;
        body.roster.forEach(async playerOnRoster => {
            // console.log(playerOnRoster)
            let objPlayer: IObjPlayer = {
                id: playerOnRoster.person.id,
                fullName: playerOnRoster.person.fullName,
                position: playerOnRoster.position,
                arraySeasonStats: []
            }
            activePlayerIds.push(objPlayer);
        });
    }));
    return activePlayerIds;
}

async function getSeasonStatsForPlayers(arrayPlayers: Array<IObjPlayer>, season:string){
    console.log(`Collecting stats for all players for the ${season} season`);
    // await Promise.all(arrayPlayers.map(async(player) => {
        for(let playerIndex in arrayPlayers){
            let player = arrayPlayers[playerIndex];
            // `https://statsapi.web.nhl.com/api/v1/people/8476459/stats?stats=statsSingleSeason&season=20192020`
            try{
                console.log(player.id);
                // let response = await asyncRequest(`https://statsapi.web.nhl.com/api/v1/people/${player.id}/stats?stats=yearByYear`, { json: true }),
                let response = await asyncRequest(`https://statsapi.web.nhl.com/api/v1/people/${player.id}/stats?stats=statsSingleSeason&season=${season}`, { json: true }),
                body = response.body;
                // console.log(player,body);
                // console.log(body.stats[0].splits[0]);
                player.arraySeasonStats.push(body.stats[0].splits);
            } catch(err){
                console.log(err);
            }
        }
    // }));
}

export function sortPlayersByStats(first: IObjPlayer, second: IObjPlayer){
    // console.log("first", first, "second", second);
    if(first.arraySeasonStats[0].length > 0 && typeof first.arraySeasonStats[0][0] != "undefined" && second.arraySeasonStats[0].length > 0  && typeof second.arraySeasonStats[0][0] != "undefined"){
        if(Number(first.arraySeasonStats[0][0].stat.timeOnIce) > Number(second.arraySeasonStats[0][0].stat.timeOnIce)){
            return 1
        } else if(Number(second.arraySeasonStats[0][0].stat.timeOnIce) > Number(first.arraySeasonStats[0][0].stat.timeOnIce)){
            return -1
        } else {
            return 0
        }
    } else if (first.arraySeasonStats[0].length == 0 && typeof first.arraySeasonStats[0][0] != "undefined"){
        return -1
    } else if (second.arraySeasonStats[0].length == 0 && typeof second.arraySeasonStats[0][0] != "undefined"){
        return 1
    } else {
        return 0
    }
}

export async function loadStats(){
    let activePlayers
    const redisExistsAsync =  promisify(objSystem.redisClient.exists.bind(objSystem.redisClient));
    const redisGetAsync =  promisify(objSystem.redisClient.get.bind(objSystem.redisClient));
    const redisSetAsync =  promisify(objSystem.redisClient.set.bind(objSystem.redisClient));
    try{
        const playerStatsExist:boolean = await redisExistsAsync("all_nhl_player_stats");
        if(playerStatsExist){
            console.log("stats already exist not making new api calls");
            activePlayers = JSON.parse(await redisGetAsync("all_nhl_player_stats"));
        } else {
            console.log("Loading Statistics from NHL Stats api");
            const teamIds: Array<number> = await getTeamIds();
            console.log("Team Ids:", teamIds);
            activePlayers = await getActivePlayers(teamIds);
            let sSeason = "20212022"
            // for(let sSeason = 20192020; Number(sSeason) > 20092010; sSeason -= 10001){
            await getSeasonStatsForPlayers(activePlayers, String(sSeason));
            // }
            // console.log(activePlayers[0]);
            try{
                await redisSetAsync("all_nhl_player_stats", JSON.stringify(activePlayers));
                console.log("successfully wrote to redis");
            } catch(err) {
                console.log("failed to write to redis", err);
            }
        }
        // console.log(activePlayers);
        return activePlayers;
    } catch (err){
        console.log("there was an error looking for the desired key", err);
    }

    // request("https://statsapi.web.nhl.com/api/v1/teams/1/roster", { json: true }, (err, res, body) => {
    //     if (err) { return console.log(err); }
    //     console.log(body);
    //     console.log(body.roster[1])
    // });
}

async function getStatisticFields(activePlayers: Array<IObjPlayer>){
    let statisticsFields = []
    activePlayers.forEach(player => {
        if(player.arraySeasonStats[0].length > 0 && player.arraySeasonStats[0][0] != null){
            // console.log(element.arraySeasonStats[0][0].stat);
            for(let field in player.arraySeasonStats[0][0].stat){
                if(!statisticsFields.includes(field)){
                    statisticsFields.push(field);
                }
            }
        }
    });
    return statisticsFields;
}

async function getStatisticFieldsPointValuesFromUser(statisticFields: Array<string>){
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    let bReplace = prompt(`Do you want to enter new Fantasy Fields and/or overwrite existing fields point values?\t`);
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
            await redisHSetAsync(`nhl_fantasy_points`, `${field}`, value.toString());
            // console.log(`Assigned ${value} points per ${field}`);
        });
    } else {
        console.log("Retaining existing fields and values for fantasy points");
    }
}

async function calculateFantasyWorthForPlayer(activePlayers: Array<IObjPlayer>){
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const redisZAddAsync = promisify(objSystem.redisClient.zadd.bind(objSystem.redisClient));
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    await Promise.all(activePlayers.map(async player => {
        let nFantasyWorth = 0;
        if(player.arraySeasonStats[0].length > 0 && player.arraySeasonStats[0][0] != null){
            for(let index in player.arraySeasonStats[0]){
                nFantasyWorth = 0;
                let sSeason = player.arraySeasonStats[0][index].season;
                // let leagueID = player.arraySeasonStats[0][index].league.id;
                // if(leagueID !== 133){
                //     continue;
                // }
                // console.log(`Array season stats`);
                // console.log(player.arraySeasonStats[0]);
                let seasonStats = player.arraySeasonStats[0][index].stat;
                for(let field in seasonStats){
                    // console.log(Number(seasonStats[field]));
                    // console.log(field);
                    let modifier = await redisHGetAsync(`nhl_fantasy_points`, field)
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
            for(let index in player.arraySeasonStats[0]){
                let sSeason = player.arraySeasonStats[0][index].season;
                let seasonStats = player.arraySeasonStats[0][index].stat;
                // let leagueID = player.arraySeasonStats[0][index].league.id;
                // if(leagueID !== 133){
                //     continue;
                // }
                nFantasyWorth = seasonStats.fantasyValue
                await redisZAddAsync(`nhl_fantasy_player_value_${sSeason}`, nFantasyWorth, JSON.stringify(player));
                await redisZAddAsync(`nhl_fantasy_player_value_position_${player.position.name.replace(" ","_")}_${sSeason}`, nFantasyWorth, JSON.stringify(player));
                await redisZAddAsync(`nhl_fantasy_player_value_position_type_${player.position.type.replace(" ","_")}_${sSeason}`, nFantasyWorth, JSON.stringify(player));
                // console.log(sSeason);
            }
        }
        await redisHSetAsync(`nhl_player_available_to_draft`, `${player.id}`, true);
        await redisHSetAsync(`nhl_player_lookup`, `${await convertPlayerNameToRedisKey(player.fullName)}`, `${player.id}`);
    }));
}

export async function clearRedis(){
    let redisScanAsync = promisify(objSystem.redisClient.scan.bind(objSystem.redisClient));
    let redisDelAsync = promisify(objSystem.redisClient.del.bind(objSystem.redisClient));
    let scanResults = await redisScanAsync('0', "MATCH", "*", "COUNT", "1000");
    console.log(scanResults);
    if(scanResults[1].includes("nhl_fantasy_points")){
        let bRemoveFantasyPointsKey = prompt(`Do you want to clear the Fantasy point field? (If so you will have to enter new Fantasy Fields and/or overwrite existing fields point values)\t`);
        if(![true, 'y', 'Y', 'Yes','yes'].includes(bRemoveFantasyPointsKey)){
            const index = scanResults[1].indexOf("nhl_fantasy_points");
            console.log(index)
            if (index > -1) {
                scanResults[1].splice(index, 1);
            }
        }
    }
    scanResults.forEach(async redisKey => {
        let bDeleteStatus = await redisDelAsync(redisKey);
        console.log(`Deleting Redis Key ${redisKey} Status: ${bDeleteStatus}`);
    });
}

export async function loadNHLDataToRedis(getNewStatValues = false){
    try{
        await loadScoringSystem();
        console.log(objScoring);
        let activePlayers = await loadStats();
        let statisticFields = await getStatisticFields(activePlayers);
        if(getNewStatValues){
            await getStatisticFieldsPointValuesFromUser(statisticFields);
        }
        await calculateFantasyWorthForPlayer(activePlayers);
        console.log("Calculated the Fantasy Worth for each player during their career");
        return activePlayers;
    } catch(error){
        console.error(error);
    }
}

export async function getTopAvailablePlayers(availablePlayersOnly, sSeason: string, nNumberOfPlayers: number, sPosition: string = ""){
    const redisZRevRangeAsync = promisify(objSystem.redisClient.zrevrange.bind(objSystem.redisClient));
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    let topPlayers = [];
    let redisKey;
    if(sPosition !== ""){
        redisKey = `nhl_fantasy_player_value_position_${sPosition}_${sSeason}`
    } else {
        redisKey = `nhl_fantasy_player_value_${sSeason}`
    }
    try{
        let rank = 0;
        while(topPlayers.length < nNumberOfPlayers){
            let zRangeResult = await redisZRevRangeAsync(redisKey, rank, rank, "WITHSCORES");
            // console.log(zRangeResult.length);
            for(let index=0; index < zRangeResult.length; index+=2){
                let player = JSON.parse(zRangeResult[index])
                // console.log(player.id, player.fullName, zRangeResult[index+1]);
                let owner = await redisHGetAsync("nhl_player_available_to_draft", player.id)
                if(availablePlayersOnly && "true" === owner){
                    // console.log(`${player.fullName} is Available`);
                    topPlayers.push({fullName: player.fullName, id: player.id, position: player.position.name, fantasyValue: Number(zRangeResult[index+1]), deltas: [], deltaRanks: [], averageDeltaRank: 0, owner: owner});
                } else if(!availablePlayersOnly && "false" !== owner) {
                    topPlayers.push({fullName: player.fullName, id: player.id, position: player.position.name, fantasyValue: Number(zRangeResult[index+1]), deltas: [], deltaRanks: [], averageDeltaRank: 0, owner: owner});
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
    return topPlayers
}

let objBestPlayersAvailable = {
    overall: [],
    centers: [],
    right_wings: [],
    left_wings: [],
    defensemen: [],
    goalies: [],
    forwards: []
}

export async function getTopPlayersOfEachPosition(nNumberOfPlayers: number, sYearsOfSeason="20212022"){
    const redisSetAsync =  promisify(objSystem.redisClient.set.bind(objSystem.redisClient));
    objBestPlayersAvailable.overall = await getTopAvailablePlayers(true, sYearsOfSeason, nNumberOfPlayers);
    objBestPlayersAvailable.centers = await getTopAvailablePlayers(true, sYearsOfSeason, nNumberOfPlayers, "Center");
    objBestPlayersAvailable.left_wings = await getTopAvailablePlayers(true, sYearsOfSeason, nNumberOfPlayers, "Left_Wing");
    objBestPlayersAvailable.right_wings = await getTopAvailablePlayers(true, sYearsOfSeason, nNumberOfPlayers, "Right_Wing");
    objBestPlayersAvailable.forwards = await getTopAvailablePlayers(true, sYearsOfSeason, nNumberOfPlayers, "type_Forward");
    objBestPlayersAvailable.defensemen = await getTopAvailablePlayers(true, sYearsOfSeason, nNumberOfPlayers, "Defenseman");
    objBestPlayersAvailable.goalies = await getTopAvailablePlayers(true, sYearsOfSeason, nNumberOfPlayers, "Goalie");
    // console.log(objBestPlayersAvailable);
    await redisSetAsync("nhl_top_players_available", JSON.stringify(objBestPlayersAvailable));
}

async function getAverageDeltaRank(player){
    player.averageDeltaRank = player.deltaRanks.reduce((a,b) => a+b) / player.deltaRanks.length;
    // console.log(player);
}

async function rankPositionToDraftByDeltas(){
    let overall = objBestPlayersAvailable.overall[0],
        center = objBestPlayersAvailable.centers[0],
        left_wing = objBestPlayersAvailable.left_wings[0],
        right_wing = objBestPlayersAvailable.right_wings[0],
        defenseman = objBestPlayersAvailable.defensemen[0],
        goalie = objBestPlayersAvailable.goalies[0],
        forward = objBestPlayersAvailable.forwards[0];
    for(let index = 0; index < objBestPlayersAvailable.overall.length; index++){
        let arr = [overall.deltas[index], center.deltas[index], left_wing.deltas[index], right_wing.deltas[index], defenseman.deltas[index], goalie.deltas[index], forward.deltas[index]];
        let sorted = arr.slice().sort(function(a,b){return b-a})
        let ranks = arr.map(function(v){ return sorted.indexOf(v)+1 });
        // console.log(overall)
        overall.deltaRanks.push(ranks[0]);
        center.deltaRanks.push(ranks[1]);
        left_wing.deltaRanks.push(ranks[2]);
        right_wing.deltaRanks.push(ranks[3]);
        defenseman.deltaRanks.push(ranks[4]);
        goalie.deltaRanks.push(ranks[5]);
        forward.deltaRanks.push(ranks[6]);
        // console.log(`original array ${arr}, and associate ranks ${ranks}`);
    }
    await getAverageDeltaRank(overall);
    await getAverageDeltaRank(center);
    await getAverageDeltaRank(left_wing);
    await getAverageDeltaRank(right_wing);
    await getAverageDeltaRank(defenseman);
    await getAverageDeltaRank(goalie);
    await getAverageDeltaRank(forward);
    overall.category = "overall";
    center.category = "center";
    left_wing.category = "left_wing";
    right_wing.category = "right_wing";
    defenseman.category = "defenseman";
    goalie.category = "goalie";
    forward.category = "forward";
    let positions = [overall,center,left_wing,right_wing,defenseman,goalie,forward]
    positions = positions.slice().sort(function(a,b){return a.averageDeltaRank-b.averageDeltaRank})
    let recommendations = []
    positions.forEach(player => {
        let averageDelta = player.deltas.reduce((a,b) => a + b, 0) / player.deltas.length;
        // console.log(player.fantasyValue);
        // console.log(`${player.fullName}, ${player.id}, ${player.position}, ${player.category}`)
        // console.log(averageDelta);
        recommendations.push({fullName: player.fullName, id: player.id, position: player.position, category: player.category, fantasyValue: player.fantasyValue, averageDelta: averageDelta, deltas: player.deltas, firstDelta: player.deltas[1], lastDelta: player.deltas[player.deltas.length - 1]})
    });
    return recommendations;
    // console.log(positions);
}

export async function calculateDeltasForPlayerToDraft(){
    const redisGetAsync =  promisify(objSystem.redisClient.get.bind(objSystem.redisClient));
    objBestPlayersAvailable = JSON.parse(await redisGetAsync("nhl_top_players_available"));
    for(let position in objBestPlayersAvailable){
        // console.log(objBestPlayersAvailable[position])
        let topPlayer = objBestPlayersAvailable[position][0];
        objBestPlayersAvailable[position].forEach(player => {
            // console.log("topPlayer\n", topPlayer, "player\n", player);
            topPlayer.category = position;
            topPlayer.deltas.push(topPlayer.fantasyValue - player.fantasyValue);
        });
        // console.log(objBestPlayersAvailable[position][0].deltas);
    }
    console.log("objBestPlayersAvailable",objBestPlayersAvailable);
    return await rankPositionToDraftByDeltas();
}

async function draftPlayer(){
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    let sDraftedPlayer = prompt(`What is the full name of the drafted player?\t`);
    console.log(await convertPlayerNameToRedisKey(sDraftedPlayer));
    let sDraftingTeam = prompt(`What team drafted the player?\t`);
    console.log(`${sDraftedPlayer} drafted by ${sDraftingTeam}`);
    let playerID = await redisHGetAsync(`nhl_player_lookup`, await convertPlayerNameToRedisKey(sDraftedPlayer));
    console.log(playerID);
    await redisHSetAsync(`nhl_player_available_to_draft`, `${playerID}`, false);
}

export async function draftPlayerAPI(player: IObjPlayer, draftTeam=false){
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    // let sDraftedPlayer = prompt(`What is the full name of the drafted player?\t`);
    if(player.fullName != 'undefined' && player.fullName != ''){
        console.log(await convertPlayerNameToRedisKey(player.fullName));
        // let sDraftingTeam = prompt(`What team drafted the player?\t`);
        // console.log(`${sDraftedPlayer} drafted by ${sDraftingTeam}`);
        player.id = await redisHGetAsync(`nhl_player_lookup`, await convertPlayerNameToRedisKey(player.fullName));
    }
    console.log(player.id);
    await redisHSetAsync(`nhl_player_available_to_draft`, `${player.id}`, draftTeam);
}

async function undraftPlayer(){
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const redisZAddAsync = promisify(objSystem.redisClient.zadd.bind(objSystem.redisClient));
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    let sDraftedPlayer = await convertPlayerNameToRedisKey(prompt(`What is the full name of the drafted player?\t`));
    console.log(sDraftedPlayer);
    let sDraftingTeam = prompt(`What team drafted the player?\t`);
    console.log(`${sDraftedPlayer} drafted by ${sDraftingTeam}`);
    let playerID = await redisHGetAsync(`nhl_player_lookup`, convertPlayerNameToRedisKey(sDraftedPlayer));
    console.log(playerID);
    await redisHSetAsync(`nhl_player_available_to_draft`, playerID, true);
}

export async function undraftPlayerAPI(player: IObjPlayer, draftTeam){
    const redisHGetAsync = promisify(objSystem.redisClient.hget.bind(objSystem.redisClient));
    const redisHSetAsync =  promisify(objSystem.redisClient.hset.bind(objSystem.redisClient));
    // let sDraftedPlayer = await convertPlayerNameToRedisKey(prompt(`What is the full name of the drafted player?\t`));
    if(player.fullName != 'undefined' && player.fullName != ''){
        console.log(await convertPlayerNameToRedisKey(player.fullName));
        // let sDraftingTeam = prompt(`What team drafted the player?\t`);
        // console.log(`${sDraftedPlayer} drafted by ${sDraftingTeam}`);
        player.id = await redisHGetAsync(`nhl_player_lookup`, await convertPlayerNameToRedisKey(player.fullName));
    }
    console.log(player.id);
    await redisHSetAsync(`nhl_player_available_to_draft`, player.id, true);
}

async function convertPlayerNameToRedisKey(sPlayerName: string){
    sPlayerName = sPlayerName.toLowerCase();
    sPlayerName = sPlayerName.replace(/[^a-z0-9+]+/gi, '_');
    return sPlayerName;
}

async function runProgram(){
    // await loadNHLDataToRedis();
    // await clearRedis();
    for(let peopleTilNextPick = 1; peopleTilNextPick < 15; peopleTilNextPick++){
        console.log(`\n******************\nFor the scenario with ${peopleTilNextPick}\n******************\n`);
        await getTopPlayersOfEachPosition(peopleTilNextPick);
        let recommendations = await calculateDeltasForPlayerToDraft();
        console.log(recommendations)
        recommendations.forEach(player => {
            console.log(`${player.fullName}, ${player.id}, ${player.position}, ${player.category}`)
        });
    }
    await draftPlayer();
    objSystem.redisClient.quit();
}

// runProgram();
