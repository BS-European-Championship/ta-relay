import { Client, Models, Packets } from "tournament-assistant-client";
import { CustomEventEmitter } from "./event-emitter";
import { Forwarder } from "./forwarder-server";


type TARelayEvents = {
    userFinishedSong: Packets.Push.SongFinished;
    matchCreated: Models.Match;
    scoreRecieved: Packets.Push.RealtimeScore;
    allPlayersFinishedSong: {};
};

type Team = {
    team: Models.Team;
    points: number;
}

type UserWithScore = {
    user: Models.User;
    score: number;
}

export class TARelay extends CustomEventEmitter<TARelayEvents> {
    private taClient: Client;
    private forwarder: Forwarder;

    private currentlyWatchingMatch: Models.Match | undefined;
    private userScoresForMap: Map<string, UserWithScore[]> = new Map<string, UserWithScore[]>();

    constructor() {
        super();

        this.forwarder = new Forwarder();

        this.taClient = new Client("SUPA Relay", {
            url: "ws://127.0.0.1:2053"
        });

        this.taClient.on('realtimeScore', score => {
            console.log('score:', score);

            this.transformAndBroadcastScore(score.data);
            this.emit('scoreRecieved', score.data);
        });

        this.taClient.on('songFinished', songFinished => {
            console.log('songFinished:', songFinished);

            //Add the score to the results list
            let existingScores = this.userScoresForMap.get(songFinished.data.beatmap.level_id) ?? [];
            existingScores.push({
                user: songFinished.data.player,
                score: songFinished.data.score
            });

            this.userScoresForMap.set(songFinished.data.beatmap.level_id, existingScores);

            this.transformAndBroadcastResult(songFinished.data);
            this.emit('userFinishedSong', songFinished.data);

            const matchPlayerCount = this.taClient.Players.filter(x => this.currentlyWatchingMatch?.associated_users.includes(x.guid))?.length ?? 0;
            if (this.userScoresForMap.get(songFinished.data.beatmap.level_id)?.length === matchPlayerCount) {
                this.emit('allPlayersFinishedSong', {});
            }
        });

        this.taClient.on('matchCreated', matchCreated => {
            console.log('matchCreated:', matchCreated);

            matchCreated.data.associated_users.push(this.taClient.Self.guid);
            this.taClient.updateMatch(matchCreated.data);

            this.currentlyWatchingMatch = matchCreated.data;

            this.emit('matchCreated', matchCreated.data);
        });

        this.taClient.on('matchUpdated', matchUpdated => {
            console.log('matchUpdated:', matchUpdated);

            this.transformAndBroadcastMatch(matchUpdated.data);
        });

        this.taClient.on('playSong', playSong => {
            console.log('playSong:', playSong);

            this.forwarder?.broadcast({ type: 'playSong' });
        });

        this.taClient.on('userUpdated', userUpdated => {
            console.log('userUpdated:', userUpdated);

            this.transformAndBroadcastUser(userUpdated.data);
        });
    }

    public getTeamPoints(): Team[] {
        type TeamWithScore = {
            teamWithPoints: Team;
            score: number;
        };

        //List of teams with an additional variable representing cumulative map score
        const teamScores: Map<string, TeamWithScore> = new Map<string, TeamWithScore>();

        //Calculate score for each map in our current memory
        this.userScoresForMap.forEach((scores, _) => {
            //Reset team scores for calculation
            teamScores.forEach(x => x.score = 0);

            //Add up total team scores for the level
            scores.forEach(score => {

                //Keep existing points if possible
                const oldTeamWithScore = teamScores.get(score.user.team.id);
                teamScores.set(score.user.team.id, {
                    teamWithPoints: {
                        team: oldTeamWithScore?.teamWithPoints.team ?? score.user.team,
                        points: oldTeamWithScore?.teamWithPoints.points ?? 0
                    },
                    score: (oldTeamWithScore?.score ?? 0) + score.score
                });
            });

            //Sort teams by total score
            const sortedTeams = Array.from(teamScores.values()).sort(x => x.score);

            //Assign points
            for (let i = 0; i < sortedTeams.length; i++) {
                sortedTeams[i].teamWithPoints.points = i + 1;
            }

            //Winning team gets a bonus point
            sortedTeams[sortedTeams.length - 1].teamWithPoints.points++;

            //Update outer array
            sortedTeams.forEach(x => teamScores.set(x.teamWithPoints.team.id, x));
        });

        return Array.from(teamScores.values()).map(x => x.teamWithPoints).sort(x => -x.points);
    }

    public resetScores() {
        this.userScoresForMap = new Map<string, UserWithScore[]>();
    }

    public eliminateBottomTeam() {
        const scores = this.getTeamPoints();

        if (scores.length > 0) {
            const losingTeam = scores[scores.length - 1];
            const match = this.currentlyWatchingMatch;

            if (match) {
                match.associated_users = match.associated_users.filter(x => this.taClient.users.find(y => y.guid === x)?.team.id !== losingTeam.team.id);
                this.taClient.updateMatch(match);
                this.resetScores();
            }
        }
    }

    public setTeamsToDisplay(team1: string, team2: string) {
        this.forwarder?.broadcast({
            type: 'setTeamsToDisplay',
            team1,
            team2
        })
    }

    private transformAndBroadcastMatch(match: Models.Match) {
        const players = this.taClient.users.filter(x => x.client_type === Models.User.ClientTypes.Player && match.associated_users.includes(x.guid));
        const coordinator = this.taClient.Coordinators.find(x => match.associated_users.includes(x.guid));

        this.forwarder?.broadcast({
            type: 'match',
            players: players.map(this.transformUser),
            coordinator: coordinator?.name,
            song: {
                id: match.selected_level?.level_id,
                name: match.selected_level?.name,
                characteristic: match.selected_characteristic?.serialized_name,
                difficulty: match.selected_difficulty
            }
        });
    }

    private transformUser(user: Models.User) {
        return {
            guid: user.guid,
            name: user.name,
            team: {
                id: user.team?.id,
                name: user.team?.name
            },
            platformId: user.user_id,
            downloaded: Models.User.DownloadStates[user.download_state],
            playState: Models.User.PlayStates[user.play_state]
        };
    }

    private transformAndBroadcastUser(user: Models.User) {
        this.forwarder?.broadcast({
            type: 'user',
            user: this.transformUser(user)
        });
    }

    private transformAndBroadcastScore(score: Packets.Push.RealtimeScore) {
        this.forwarder?.broadcast({
            type: 'score',
            score: score.toObject()
        })
    }

    private transformAndBroadcastResult(songFinished: Packets.Push.SongFinished) {
        this.forwarder?.broadcast({
            type: 'finalScoreForPlayer',
            user: songFinished.player.toObject(),
            score: songFinished.score
        })
    }
}