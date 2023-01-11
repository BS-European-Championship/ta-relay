import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { relay } from "../main";

@Discord()
export class Example {
  @Slash({ description: "get-team-points", name: "get-team-points" })
  getTeamPoints(
    interaction: CommandInteraction
  ): void {
    let response = '';
    const teams = relay.getTeamPoints();

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      response += `${i + 1}: ${team.team.name} (${team.points})\n`;
    }

    interaction.reply(response.length > 0 ? response : 'No scores yet!');
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
}
