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

  private testJobs = [
    {
      title: 'Software Engineer',
      company: 'Tech Corp',
      location: 'Remote',
      salary: '$120,000',
      description: `
**Full Stack Software Engineer - The Points Guy (Red Ventures)**

📍 **Location:** San Juan, PR (Remote available)  
💵 **Salary:** $80,000 - $150,000/year

Join **The Points Guy** as a Full Stack Software Engineer! Develop and enhance applications using modern technologies, work on front-end and back-end, and drive cloud-based innovation.

🔧 **Responsibilities:**

- Build front-end apps (HTML5, TypeScript, React, Next.js)
- Develop back-end services (NodeJS, NestJS, Express)
- Manage cloud apps (Terraform, CloudFormation)
- Optimize for speed and scalability

🎁 **Benefits:**

- Health Insurance (medical, dental, vision)
- 401(k) with match
- Paid Time Off & Holiday Pay
- Life & Disability Insurance
- Employee Assistance Program

📌 **Note:** Visa sponsorship not available.
`,
    },
    {
      title: 'Product Manager',
      company: 'Innovate LLC',
      location: 'San Francisco, CA',
      salary: '$150,000',
      description: `
**Full Stack Software Engineer - The Points Guy (Red Ventures)**

📍 **Location:** San Juan, PR (Remote available)  
💵 **Salary:** $80,000 - $150,000/year

Join **The Points Guy** as a Full Stack Software Engineer! Develop and enhance applications using modern technologies, work on front-end and back-end, and drive cloud-based innovation.

🔧 **Responsibilities:**

- Build front-end apps (HTML5, TypeScript, React, Next.js)
- Develop back-end services (NodeJS, NestJS, Express)
- Manage cloud apps (Terraform, CloudFormation)
- Optimize for speed and scalability

🎁 **Benefits:**

- Health Insurance (medical, dental, vision)
- 401(k) with match
- Paid Time Off & Holiday Pay
- Life & Disability Insurance
- Employee Assistance Program

📌 **Note:** Visa sponsorship not available.
`,
    },
    {
      title: 'Data Scientist',
      company: 'DataWorks',
      location: 'New York, NY',
      salary: '$130,000',
      description: `
**Full Stack Software Engineer - The Points Guy (Red Ventures)**

📍 **Location:** San Juan, PR (Remote available)  
💵 **Salary:** $80,000 - $150,000/year

Join **The Points Guy** as a Full Stack Software Engineer! Develop and enhance applications using modern technologies, work on front-end and back-end, and drive cloud-based innovation.

🔧 **Responsibilities:**

- Build front-end apps (HTML5, TypeScript, React, Next.js)
- Develop back-end services (NodeJS, NestJS, Express)
- Manage cloud apps (Terraform, CloudFormation)
- Optimize for speed and scalability

🎁 **Benefits:**

- Health Insurance (medical, dental, vision)
- 401(k) with match
- Paid Time Off & Holiday Pay
- Life & Disability Insurance
- Employee Assistance Program

📌 **Note:** Visa sponsorship not available.
`,
    },
  ];

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

  create(createDiscordDto: CreateDiscordDto) {
    return 'This action adds a new discord';
  }

  findAll() {
    return `This action returns all discord`;
  }

  findOne(id: number) {
    return `This action returns a #${id} discord`;
  }

  update(id: number, updateDiscordDto: UpdateDiscordDto) {
    return `This action updates a #${id} discord`;
  }

  remove(id: number) {
    return `This action removes a #${id} discord`;
  }
}
