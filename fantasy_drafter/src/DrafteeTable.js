import React from 'react';

export class DrafteeTable extends React.Component {

    constructor(props){
        super(props)
        this.state ={
            playerRows : props.playerRows,
        };
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
                {this.state.playerRows.map(({player, position, fantasy_value}) => 
                    <tr className="table-row" id={player} key={player}>
                        {this.renderTextCell(player)}
                        {this.renderTextCell(position)}
                        {this.renderTextCell(fantasy_value)}
                        {this.renderDropdown(player)}
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
