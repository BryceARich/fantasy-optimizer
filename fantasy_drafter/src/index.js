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
            teams: []
        };
        this.setState = this.setState.bind(this)
    }

    render(){
        console.log(this.state)
        return(
            <div>
                <TeamsTable teams={this.state.teams} numberOfTeams={this.state.numberOfTeams} setParentState={this.setState}/>
                <br/>
                <DrafteeTable playerRows={tempPlayerRows} teams={this.state.teams}/>
                <br/>
                <RecommendationTable playerRows={tempPlayerRows} teams={this.state.teams}/>
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
        fantasy_value: ("value: " + number),
        diffs: diffs,
    }
    // console.log("made player " + number)
    return player
}

const tempPlayerRows = []

for(let i=0; i < 100; i++){
    tempPlayerRows.push(makePlayer(i));
}

ReactDOM.render(
    <FantasyDrafter></FantasyDrafter>,
    document.getElementById('root')
  );
  