import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { relay } from "../main";

import tmi from 'tmi.js';

const twitchClient = new tmi.Client({
	options: { debug: true },
	identity: {
		username: 'SUPA_BS',
		password: process.env.TWITCH_TOKEN
	},
	channels: [ 'supa_bs' ]
});

twitchClient.connect();

@Discord()
export class Example {
  @Slash({ description: "get-team-points", name: "get-team-points" })
  getTeamPoints(
    interaction: CommandInteraction
  ): void {
    let response = '';
    const teams = relay.getAndBroadcastTeamPoints();

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      response += `${i + 1}: ${team.team.name} (${team.points})\n`;
    }

    interaction.reply(response.length > 0 ? response : 'No scores yet!');

    if (response.length > 0 && twitchClient.readyState() === 'OPEN') {
      try {
        twitchClient.say('supa_bs', `Current point leaderboard: ${response}\n\n Points are awarded according to the position of each team on the last map. The first team gets 1 extra point. The points will get accumulated during 3 rounds (3 maps), after which the worst performing team gets eliminated from the tournament, and the points leaderboard is reset.`);
      } catch (err) {
        console.log('Failed to send points in twitch chat:', err);
      }
    }
  }

  @Slash({ description: "eliminate-bottom-team", name: "eliminate-bottom-team" })
  resetScores(
    interaction: CommandInteraction
  ): void {
    relay.eliminateBottomTeam();
    interaction.reply('Attempted to eliminate bottom team and reset scores');
  }

  @Slash({ description: "set-viewing-teams", name: "set-viewing-teams" })
  setViewingTeams(
    @SlashOption({
      description: "team1",
      name: "team1",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    @SlashOption({
      description: "team2",
      name: "team2",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    team1: string,
    team2: string,
    interaction: CommandInteraction
  ): void {
    relay.setTeamsToDisplay(team1, team2);
    interaction.reply('Command forwarded to the overlay');
  }

  @Slash({ description: "switch-audio", name: "switch-audio" })
  switchAudio(
    @SlashOption({
      description: "player-number",
      name: "player-number",
      required: true,
      type: ApplicationCommandOptionType.Number,
    })
    playerNumber: number,
    interaction: CommandInteraction
  ): void {
    relay.setAudioPlayer(playerNumber);
    interaction.reply(`Set audio player to the player ${playerNumber}`);
  }

  @Slash({ description: "set-finals-points", name: "set-finals-points" })
  setFinalsPoints(
    @SlashOption({
      description: "team1",
      name: "team1",
      required: true,
      type: ApplicationCommandOptionType.Number,
    })
    @SlashOption({
      description: "team2",
      name: "team2",
      required: true,
      type: ApplicationCommandOptionType.Number,
    })
    team1: number,
    team2: number,
    interaction: CommandInteraction
  ): void {
    relay.setFinalsPoints(team1, team2);
    interaction.reply(`Set finals points to ${team1} ${team2}`);
  }
}
