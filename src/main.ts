import { dirname, importx } from "@discordx/importer";
import type { Interaction, Message } from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client } from "discordx";
import { TARelay } from "./ta-relay/relay";
import dotenv from 'dotenv';

dotenv.config();

export const bot = new Client({
  // To use only guild command
  // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
  ],

  // Debug logs are disabled in silent mode
  silent: false,

  // Configuration for @SimpleCommand
  simpleCommand: {
    prefix: "!",
  },
});

bot.once("ready", async () => {
  // Make sure all guilds are cached
  // await bot.guilds.fetch();

  // Synchronize applications commands with Discord
  await bot.initApplicationCommands();

  // To clear all guild commands, uncomment this line,
  // This is useful when moving from guild commands to global commands
  // It must only be executed once
  //
  //  await bot.clearApplicationCommands(
  //    ...bot.guilds.cache.map((g) => g.id)
  //  );

  console.log("Bot started");
});

bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction);
});

bot.on("messageCreate", (message: Message) => {
  bot.executeCommand(message);
});

async function run() {
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

  await bot.login(process.env.BOT_TOKEN!);
}

export const relay = new TARelay();

relay.on('allPlayersFinishedSong', () => {
  console.log('allPlayersFinishedSong');
})

relay.on('matchCreated', () => {
  console.log('matchCreated');
})

relay.on('scoreRecieved', (score) => {
  console.log('scoreRecieved', score);
})

relay.on('userFinishedSong', (results) => {
  console.log('userFinishedSong', results.player, results.score);
})

run();