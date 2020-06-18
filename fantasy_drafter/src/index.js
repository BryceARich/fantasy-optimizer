import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {DrafteeTable} from './DrafteeTable'
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

    addTeam(){
        console.log("num teams:", this.state.numberOfTeams)
        if(this.state.teams.length < 12){
            this.setState(prevState => ({ teams: [...prevState.teams, '']}))
        } else {
            console.log("Max number of teams reached");
        }
    }

    render(){
        console.log(this.state)
        return(
            <div>
                <TeamsTable teams={this.state.teams} numberOfTeams={this.state.numberOfTeams} setParentState={this.setState}/>
                <br/>
                <DrafteeTable playerRows={tempPlayerRows} teams={this.state.teams}/>
            </div>
        )
    }
}

function makePlayer(number){
    const player = {
        player: ("name: " + number),
        position: ("ps: " + number),
        fantasy_value: ("value: " + number),
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
  