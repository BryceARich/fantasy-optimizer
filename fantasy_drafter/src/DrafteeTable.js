import React from 'react';

let onChange;
export class DrafteeTable extends React.Component {
    constructor(props){
        super(props)
        this.state ={
            playerRows : props.playerRows,
        };
        console.log("DRAFTEE TABLE PLAYER ROWS")
        console.log(this.state)
        onChange = props.onChange;
    }

    componentWillReceiveProps(nextProps){
        if(nextProps.playerRows != this.state.playerRows){
            this.setState({
                playerRows : nextProps.playerRows
            })
            this.render()
        }
    }

    render(){
        return(
            <table>
                <thead>
                <tr className="table-row">
                    {this.renderTextHeaderCell("Player")}
                    {this.renderTextHeaderCell("Position")}
                    {this.renderTextHeaderCell("Fantasy Value")}
                    {this.renderTextHeaderCell("Draft Team")}
                </tr>
                </thead>
                <tbody>
                {this.state.playerRows.map(({player, position, fantasy_value, owner}) => 
                    <tr className="table-row" id={player} key={player}>
                        {this.renderTextCell(player)}
                        {this.renderTextCell(position)}
                        {this.renderTextCell(fantasy_value)}
                        {this.renderDropdown(player, owner)}
                    </tr>
                )}
                </tbody>
            </table>
        )
    }


    renderTextCell(text) {
        let text_id = text + "-cell";
        return (
            <td id={text_id}>{text}</td>
        )
    }



    async changedSelection(event){
        function getPlayernameFromDropdownCell(cellname){
            if(cellname.endsWith("-cell")){
                console.log(cellname.slice(0, cellname.length - 5))
                return cellname.slice(0, cellname.length - 5);
            }
            return cellname
        }

        function convertPlayerNameToRedisKey(sPlayerName){
            sPlayerName = sPlayerName.trim();
            sPlayerName = sPlayerName.toLowerCase();
            sPlayerName = sPlayerName.replace(/[^a-z0-9+]+/gi, '_');
            return sPlayerName;
        }

        let playerName = getPlayernameFromDropdownCell(event.target.id);
        console.log(playerName, "drafted by", event.target.value);
        playerName = convertPlayerNameToRedisKey(playerName);
        let drafter = event.target.value.trim();
        console.log("Drafter is", drafter);
        let resp
        if(drafter !== null && drafter !== "" && drafter != "undrafted"){
            console.log("Drafting");
            resp = await fetch(`http://localhost:3001/draft/${playerName}/team/${drafter}`)
            .then(function (response) {
                return response.json();
            }).catch(function (error) {
                console.log("Error: " + error);
            });
        } else {
            console.log("Undrafting");
            resp = await fetch(`http://localhost:3001/undraft/${playerName}`)
            .then(function (response) {
                return response.json();
            }).catch(function (error) {
                console.log("Error: " + error);
            });
        }
        console.log("Response", resp);
        console.log("OnChange", onChange);
        onChange();
    }

    renderDropdown(text, owner=null) {
        let dropdown_id = text + "-cell";

        console.log("Owner", owner);
        let options = this.props.teams.map((el,i) =>
            owner == el ? <option selected="selected" key={i} value={String(el).toLowerCase()}> {el} </option> : <option key={i} value={String(el).toLowerCase()}> {el} </option>
        )
        // console.log(options);
        return (
            <td>
                <select name="teams" id={dropdown_id} onChange={this.changedSelection}>
                    <option value="undrafted"></option>
                    {options}
                </select>
            </td>
        )
    }

    renderTextHeaderCell(text) {
        return (
            <th>{text}</th>
        )
    }
}
