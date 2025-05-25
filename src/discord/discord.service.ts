import { Injectable, OnModuleInit } from '@nestjs/common';
import { CreateDiscordDto } from './dto/create-discord.dto';
import { UpdateDiscordDto } from './dto/update-discord.dto';
import { Client, EmbedBuilder, Events, GatewayIntentBits } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { Job } from '../job/entities/job.entity';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;
  constructor(private configService: ConfigService) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });
  }

  async onModuleInit() {
    this.client.once(Events.ClientReady, async (readyClient) => {
      console.log(`Ready! Logged in as ${readyClient.user.tag}`);
      // Get info
    });

    await this.client.login(this.configService.get('secrets.discordKey'));
    // await this.sendMessage();
  }

  async sendMessage(discordId?: string, jobs?: Job[]) {
    // const user = await this.client.users.fetch(discordId);
    const user = await this.client.users.fetch(discordId);
    // depending on the amount of jobs, we need to loop through this every 10 times.
    const embeds = jobs.map(this.createEmbed);

    const discordMessageLimit = 1;
    const discordMultipleEmbedsArray: EmbedBuilder[][] = [];

    for (let i = 0; i < embeds.length; i += discordMessageLimit) {
      const embedMessage = embeds.slice(i, i + discordMessageLimit);
      discordMultipleEmbedsArray.push(embedMessage);
    }

    await user.send({ content: `New jobs for ${new Date().toDateString()}` })

    for (const embedMessages of discordMultipleEmbedsArray) {
      await user.send({ embeds: embedMessages });
    }
    // await user.send({ embeds });
  }

  createEmbed(job: Job) {
    return new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(job.name)
      .setDescription(job.conciseDescription)
      .addFields(
        { name: 'Company', value: job.companyName, inline: true },
        { name: 'Location', value: job.location, inline: true },
        { name: 'Salary', value: job.pay, inline: true },
        { name: 'URL', value: job.link, inline: false },
        { name: 'Consideration', value: job.conciseSuited, inline: false },
      );
  }
}
