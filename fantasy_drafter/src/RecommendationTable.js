import React from 'react';

export class RecommendationTable extends React.Component {

    constructor(props){
        super(props)
        this.state ={
            playerRows : props.playerRows,
        };
    }

    componentWillReceiveProps(nextProps){
        if(nextProps.playerRows != this.state.playerRows){
            console.log("nextProps.playerRows");
            console.log(nextProps.playerRows);
            this.setState({
                playerRows : nextProps.playerRows
            })
        }
    }

    render(){
        console.log("HERE")
        console.log(this.state.playerRows);
        return(
            <table className="recommendationTable">
                <thead>
                <tr className="table-row">
                    {this.renderTextHeaderCell("Player")}
                    {this.renderTextHeaderCell("Position")}
                    {this.renderTextHeaderCell("Category")}
                    {this.renderTextHeaderCell("Fantasy Value")}
                    {this.renderTextHeaderCell("Fantasy Diffs")}
                    {this.renderTextHeaderCell("Average Diff")}
                    {this.renderTextHeaderCell("First Diff")}
                    {this.renderTextHeaderCell("Last Diff")}
                </tr>
                </thead>
                <tbody id="recommendationsBody">
                {this.state.playerRows.map(({player, position, fantasy_value, diffs, category, averageDelta, firstDelta, lastDelta}) =>
                    <tr className="table-row" id={category} key={category}>
                        {this.renderTextCell(player, false)}
                        {this.renderTextCell(position)}
                        {this.renderTextCell(category)}
                        {this.renderTextCell(fantasy_value)}
                        {this.renderTextCell(diffs.join(", "))}
                        {this.renderTextCell(averageDelta.toFixed(2))}
                        {this.renderTextCell(firstDelta)}
                        {this.renderTextCell(lastDelta)}
                    </tr>
                )}
                </tbody>
            </table>
        )
    }


    renderTextCell(text, bGiveID=true) {
        if(bGiveID){
            let text_id = text + "-cell";
            return (
                <td id={text_id}>{text}</td>
            )
        } else {
            return (
                <td>{text}</td>
            )
        }
    }

    renderTextHeaderCell(text) {
        return (
            <th>{text}</th>
        )
    }
}
