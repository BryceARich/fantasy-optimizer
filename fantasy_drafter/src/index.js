import React from 'react';
import ReactDOM from 'react-dom';
import CounterInput from "react-counter-input";

import './index.css';
import {DrafteeTable} from './DrafteeTable'
import {RecommendationTable} from './RecommendationTable'
import {TeamsTable} from './TeamsTable'
import { isNumber } from 'util';
// import {calculateDeltasForPlayerToDraft, getTopPlayersOfEachPosition} from './api'

class FantasyDrafter extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            teams: [],
            recommendedPlayerRows: [],
            playerRows: [],
            picksAway: 10,
            season: "2022"
        };
        this.setState = this.setState.bind(this)
    }

    async componentWillMount(){
        console.log("starting to load player rows")
        await this.updatePlayerRows();
        await this.updateRecommendedPlayerRows();
    }

    async updatePlayerRows(){
        this.loadPlayerRows()
        .then(function(playerRows){
            console.log("waited on loadPlayerRows")
            console.log("rows", playerRows)
            this.setState({
                playerRows: playerRows}
                )
            console.log("DONE")
            console.log(this.state);
        }.bind(this))
    }

    async updateRecommendedPlayerRows(){
        this.loadRecommendedPlayerRows()
        .then(function(recommendedPlayerRows){
            console.log("waited on loadPlayerRows")
            console.log("rows", recommendedPlayerRows)
            this.setState({
                recommendedPlayerRows: recommendedPlayerRows}
                )
            console.log("DONE")
            console.log(this.state);
        }.bind(this))
    }

    async loadRecommendedPlayerRows() {
        let recommendedPlayerRows = [];
        console.log("PICKS AWAY", this.state.picksAway);
        let season = "20212022"
        let resp = await fetch(`http://localhost:3001/recommended/players/${this.state.picksAway}/season/${this.state.season}`)
        .then(function (response) {
            return response.json();
        }).catch(function (error) {
            console.log("Error: " + error);
        });
        console.log("response", resp);
        // playerRows = resp.arrayRecommendations;
        for(let index in resp.arrayRecommendations){
            let player = resp.arrayRecommendations[index];
            recommendedPlayerRows.push({
                player: player.fullName,
                position: player.position,
                fantasy_value: player.fantasyValue,
                diffs: player.deltas,
                averageDelta: player.averageDelta,
                firstDelta: player.firstDelta,
                lastDelta: player.lastDelta,
                category: player.category
            })
        }
        console.log("Recommended Player rows");
        console.log(recommendedPlayerRows)
        return recommendedPlayerRows;
    }

    async loadPlayerRows() {
        let playerRows = [];
        let season = "20212022"
        let respPlayers = await fetch(`http://localhost:3001/players/400/season/${this.state.season}`)
        .then(function (response) {
            return response.json();
        }).catch(function (error) {
            console.log("Error: " + error);
        });
        console.log("response", respPlayers);
        for(let index in respPlayers.arrayPlayers){
            let player = respPlayers.arrayPlayers[index];
            console.log(player.owner);
            playerRows.push({
                player: player.fullName,
                position: player.position,
                fantasy_value: player.fantasyValue,
                diffs: player.deltas,
                owner: (player.owner !== "true" && player.owner !=="false") ? player.owner : null
            })
        }
        console.log("Player rows");
        console.log(playerRows)
        return playerRows;
    }

    async handleCountChange(count){
        await this.setState({picksAway: count});
        await this.updateRecommendedPlayerRows();
        console.log("updateRecommendedPlayerRows")
    }

    async changedSelection(event){
        console.log("Changed season", event.target.value);
        await this.setState({"season": event.target.value})
        await this.updateRecommendedPlayerRows();
        await this.updatePlayerRows();
    }

    render(){
        console.log("this.state")
        console.log(this.state)
        console.log("this.state.playerRows")
        console.log(this.state.playerRows)
        console.log("Rendering")
        return(
            <div>
                <div>
                    Picks Away
                    <CounterInput
                        min={1}
                        max={64}
                        count={10}
                        onCountChange={count => this.handleCountChange(count)}
                    />

                    <select className="seasonPicker" name="season" id="seasonPicker" onChange={this.changedSelection.bind(this)}>
                                        <option value="2022">2022</option>
                                        <option value="2021">2021</option>
                    </select>
                </div>
                <TeamsTable teams={this.state.teams} numberOfTeams={this.state.numberOfTeams} setParentState={this.setState}/>
                <br/>
                <DrafteeTable playerRows={this.state.playerRows} teams={this.state.teams} onChange={this.updateRecommendedPlayerRows.bind(this)}/>
                <br/>
                <RecommendationTable playerRows={this.state.recommendedPlayerRows} teams={this.state.teams}/>
            </div>
        )
    }
}

ReactDOM.render(
    <FantasyDrafter></FantasyDrafter>,
    document.getElementById('root')
  );
  