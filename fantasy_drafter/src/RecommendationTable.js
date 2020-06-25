import React from 'react';

export class RecommendationTable extends React.Component {

    constructor(props){
        super(props)
        this.state ={
            playerRows : props.playerRows,
        };
    }

    render(){
        // console.log(this.state.playerRows);
        return(
            <table>
                <thead>
                <tr className="table-row">
                    {this.renderTextHeaderCell("Player")}
                    {this.renderTextHeaderCell("Position")}
                    {this.renderTextHeaderCell("Fantasy Value")}
                    {this.renderTextHeaderCell("Fantasy Diffs")}
                </tr>
                </thead>
                <tbody>
                {this.state.playerRows.map(({player, position, fantasy_value, diffs}) => 
                    <tr className="table-row" id={player} key={player}>
                        {this.renderTextCell(player)}
                        {this.renderTextCell(position)}
                        {this.renderTextCell(fantasy_value)}
                        {this.renderTextCell(diffs.join(", "))}
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

    renderDropdown(text) {
        let dropdown_id = text + "-cell";
        let options = this.props.teams.map((el,i) =>
            <option key={i} value={String(el).toLowerCase()}> {el} </option>
        )
        // console.log(options);
        return (
            <td>
                <select name="teams" id={dropdown_id}>
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
