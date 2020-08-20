import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {DrafteeTable} from './DrafteeTable'
import {RecommendationTable} from './RecommendationTable'
import {TeamsTable} from './TeamsTable'
// import {calculateDeltasForPlayerToDraft, getTopPlayersOfEachPosition} from './api'

class FantasyDrafter extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            teams: [],
            playerRows: []
        };
        this.setState = this.setState.bind(this)
    }

    componentWillMount(){
        console.log("starting to load player rows")
        loadPlayerRows()
        .then(function(rows){
            console.log("waited on loadPlayerRows")
            console.log("rows", rows)
            this.setState({
                teams: this.state.teams,
                playerRows: rows}
                )
            console.log("DONE")
            console.log(this.state);
        }.bind(this))
    }

    render(){
        console.log(this.state)
        console.log("Rendering")
        return(
            <div>
                <TeamsTable teams={this.state.teams} numberOfTeams={this.state.numberOfTeams} setParentState={this.setState}/>
                <br/>
                <DrafteeTable playerRows={tempPlayerRows} teams={this.state.teams}/>
                <br/>
                <RecommendationTable playerRows={this.state.playerRows} teams={this.state.teams}/>
            </div>
        )
    }
}

function makePlayer(number){
    const diffs = [];
    let prev_diff = 0;
    for(let i=0; i < 15; i++){
        let thisDiff = Number(Math.random()*20) + prev_diff
        console.log(prev_diff, thisDiff)
        diffs.push(Number(parseFloat(thisDiff).toFixed(2)));
        prev_diff = diffs[i];
    }
    const player = {
        player: ("name: " + number),
        position: ("ps: " + number),
        fantasy_value: number,
        diffs: diffs,
    }
    // console.log("made player " + number)
    return player
}

let tempPlayerRows = []

for(let i=0; i < 100; i++){
    tempPlayerRows.push(makePlayer(i));
}

let playerRows = [];
async function loadPlayerRows() {
    // let rows = []
    // let resp = fetch("http://localhost:3001/recommended/players/4")
    // .then(response => response.json())
    // .then(data => {
    //     console.log("DATA", data);
    //     rows = data.arrayRecommendations;
    // });
    // console.log("RESPONSE", rows)
        // console.log(json)
        // console.log(response)
        // for(let index in json.arrayRecommendations){
        //     let player = json.arrayRecommendations[index];
        //     playerRows.push({
        //         player: player.fullName,
        //         position: player.position,
        //         fantasy_value: player.fantasyValue,
        //         diffs: player.deltas
        //     })
        // }
        // console.log("load player rows")
        // console.log(tempPlayerRows)
        // console.log(playerRows)
        // tempPlayerRows = playerRows;
        // return tempPlayerRows;
    // }).catch(function (error) {
    //     console.log("Error: " + error);
    // });
    // console.log(resp);
    // playerRows = resp.arrayRecommendations;
    let resp = await fetch("http://localhost:3001/recommended/players/4")
    .then(function (response) {
        return response.json();
    }).catch(function (error) {
        console.log("Error: " + error);
    });
    console.log(resp);
    // playerRows = resp.arrayRecommendations;
    for(let index in resp.arrayRecommendations){
        let player = resp.arrayRecommendations[index];
        playerRows.push({
            player: player.fullName,
            position: player.position,
            fantasy_value: player.fantasyValue,
            diffs: player.deltas
        })
    }
    console.log(tempPlayerRows)
    console.log(playerRows)
    tempPlayerRows = playerRows;
    return tempPlayerRows;
}

// loadPlayerRows();

ReactDOM.render(
    <FantasyDrafter></FantasyDrafter>,
    document.getElementById('root')
  );
  