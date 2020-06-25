import React from 'react';

export class TeamsTable extends React.Component {

    constructor(props){
        super(props)
        this.state = {
            teams: []
        };
    }

    componentDidMount(){
        for(let i = 0; i < 1; i++){
            this.addTeam();
        }
    }

    createTeamNameElements(){
        return this.props.teams.map((el,i) =>
            <tr key={i}>
                <td key={i}>
                    <div>
                        <input type="text" value={el||''}
                            onChange={this.handleChange.bind(this,i)}>
                        </input>
                        <input type='button' value='Remove' onClick={this.removeClick.bind(this, i)}/>
                    </div>
                </td>
            </tr>
        )
    }
    
    addTeam(){
        if(this.props.teams.length < 12){
            this.props.setParentState(prevState => ({ teams: [...prevState.teams, '']}))
        } else {
            console.log("Max number of teams reached");
        }
    }

    handleChange(i, event){
        let teams = [...this.props.teams];
        teams[i] = event.target.value;
        this.props.setParentState({teams: teams});
    }

    removeClick(i){
        let teams = [...this.props.teams];
        teams.splice(i,1);
        this.props.setParentState({ teams: teams });
     }

    render(){
        console.log(this.props)
        return(
            <table className="teams">
                <tbody>
                <tr className="table-row">
                    {this.renderTextHeaderCell("Teams/Owners")}
                </tr>
                {this.createTeamNameElements()}
                <tr>
                    <td>
                        <input type="button" value="Add New Team" onClick={() => this.addTeam()}>
                        </input>
                    </td>
                </tr>
                </tbody>
            </table>
        )
    }

    renderTextHeaderCell(text) {
        return (
            <td>{text}</td>
        )
    }
}