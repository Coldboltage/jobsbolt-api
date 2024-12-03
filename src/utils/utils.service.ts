import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  CoverLetter,
  CoverLetterJson,
} from '../cover-letter/entities/cover-letter.entity';
import { Job, JobJson } from '../job/entities/job.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
const path = require('path');
const fs = require('fs');

@Injectable()
export class UtilsService {
  constructor(private configService: ConfigService) { }

  createJobContentMessage(job: Job) {
    const jobTypeDescriptions: string[] = [];

    for (const jobType of job.jobType) {
      jobTypeDescriptions.push(jobType.description);
    }

    const allDescriptions = jobTypeDescriptions.join('\n');

    return `Here is a job I'm looking to apply for Job Description: ${job.description} Job Pay: ${job.pay} Job Location: ${job.location}. I wanted to know if it would suit me given the following cv: ${job.jobType[0].user.cv}. Here's also my personal descrption of myself and what I'm looking for: ${job.jobType[0].user.description}. The CV helps but the description gives a more recent telling of what the user is thinking. The job type description is as follows: ${allDescriptions}. This serves to further refine the search, specifying particular criteria for the type of job being sought.`;
  }

  createCoverLetterMessage(coverLetter: CoverLetter) {
    return `
I am requesting a personalized cover letter based on the following details. Please ensure the generated letter closely follows the user's writing style and tone, whether it's formal or informal, while being grammatically correct and concise:

- Base Cover Letter: Use the style and tone from the user's base cover letter provided. The generated cover letter should closely mimic the user's voice—whether it's formal, informal, direct, or more professional. Here is the base cover letter: ${coverLetter.job.jobType[0].user.baseCoverLetter}.

- CV: Use relevant details from the user's CV to align their skills, experiences, and accomplishments with the job description. The generated letter should emphasize where their qualifications match the job requirements and address any key areas that may be missing from the base cover letter. Here is the user's CV: ${coverLetter.job.jobType[0].user.cv}.

- Job Description: Tailor the cover letter to directly address the key requirements and qualifications mentioned in the job description. Focus on how the user’s experience matches the specific needs of the role. Here is the job description: ${coverLetter.job.description}.

- User Pitch: This is the user's unfiltered pitch, where they express in their own words why they are a strong fit for the position. Use this pitch to infuse the cover letter with the user's personal touch and feelings about the role, staying consistent with their natural tone (whether formal or informal). Here is the user's pitch: ${coverLetter.userPitch}.

User Talking Style: Adhere to the user's specific talking and writing style as provided in the variable. Ensure the generated text reflects the natural tone, phrasing, and style from the given input. ${coverLetter.job.jobType[0].user.userTalk}

Goal: The generated cover letter should reflect the user's personal voice and style (formal or informal), align their experience with the job description, and address any key areas that are essential for the role. Make sure the letter is concise, clear, and tailored specifically to the job.
`;
  }

  buildJobJson(job: Job): JobJson {
    return {
      custom_id: job.indeedId,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-2024-11-20',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful and experienced career advisor. Your task is to analyze job descriptions and compare them with candidate resumes. Provide feedback on how well the candidate fits the job, identify key strengths and gaps, and give a recommendation on whether the job is a good match for the candidate. We want to make sure the text is not AI detectable. It is extremely important to make sure the candidate and their filters which can be idenfied in their initial message is honoured as we wish not to state jobs are suited if the user has no interest in said job via their message',
          },
          { role: 'user', content: this.createJobContentMessage(job) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'job_analysis_schema', // Name the schema appropriately
            strict: true,
            schema: {
              type: 'object',
              properties: {
                analysis: {
                  type: 'string',
                  description:
                    'The detailed analysis of how well the candidate fits the job description. This should consider current qualifications, experience and potential for growth. See the user description and jobtype description if provided. It is imperative that the users wishes be met. If they say they could do something, good. If the candidate says they are not interested in something, then we need to honour this. You must be very strict.',
                },
                is_suitable: {
                  type: 'boolean',
                  description:
                    'A boolean indicating if the candidate is a good match for the job, based on the analysis provided. This should be very strict.',
                },
                conciseDescription: {
                  type: 'string',
                  description: ` Please format the job descrption, job pay and job location, into a very concise Discord embed message using emojis in Markdown. Include the job title, company name, location, salary range, a brief description of the role, key responsibilities, benefits, and any important notes. Use emojis that fit the context. Use the following format, don't tell me you've made it concise, just give me the message:.`,
                },
                conciseSuited: {
                  type: 'string',
                  description: `Using the analysis and is_suited in a very concise way, explain why you feel they were suited.`,
                },
              },
              required: [
                'analysis',
                'is_suitable',
                'conciseDescription',
                'conciseSuited',
              ],
              additionalProperties: false, // Prevent additional properties
            },
          },
        },
        max_tokens: 1000,
      },
    };
  }

  buildCoverLetterJson(coverLetter: CoverLetter): CoverLetterJson {
    return {
      custom_id: coverLetter.id,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-2024-11-20',
        messages: [
          {
            role: 'system',
            content: `You are an experienced career advisor and writing assistant. Your role is to help users craft personalized cover letters that reflect their unique writing style, based on an example base cover letter they provide. The goal is to ensure the generated letter mimics the user’s natural writing tone—often a mix of casual conversation and technical language—avoiding overly formal or robotic phrasing that might trigger AI detection. The cover letter should address the specific requirements of the job, link relevant skills, and sound as if it were written personally by the user. Keep it concise, and neutral tone. Avoid overly enthusiastic or playful language liked excited, thrilled, stuff like that. Lean to neutral but follow the user tone.`,
          },
          {
            role: 'user',
            content: this.createCoverLetterMessage(coverLetter),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'cover_letter_analysis_schema', // Ensure the schema is named properly
            strict: true, // Enforce strict adherence to the schema
            schema: {
              type: 'object',
              properties: {
                example_user_conversation: {
                  type: 'string',
                  description: `Take note of how the user writes here. The writing style here should be incorpated so that AI detection is not possible. Here's the cover letter pitch: ${coverLetter.userPitch}. Here's the users submitted sample text: ${coverLetter.job.jobType[0].user.userTalk}}`,
                },
                writing_analysis: {
                  type: 'string',
                  description:
                    'Analyze how the base cover letter, CV, and user pitch are written. Ensure the generated cover letter mimics the user’s conversational style, technical references, and tone shifts. The user often speaks with a mix of informal phrasing and technical exploration (e.g., speculative language like "I’m guessing" or "maybe"). Minor grammar fixes are allowed, but the user’s voice must remain authentic. Avoid formal AI-sounding language.',
                },
                skills_mentioned_in_job: {
                  type: 'string',
                  description:
                    'Identify all the skills, qualities, and descriptions in the job posting. If these skills or qualities are mentioned in the CV, base cover letter, or user pitch, they must be included in the final cover letter.',
                },
                job_requirements_matching: {
                  type: 'string',
                  description:
                    'Ensure the generated cover letter explicitly links the user’s skills and experiences to the specific requirements in the job description. If the job mentions certain qualifications (e.g., APIs, AWS, GitHub), make sure the user’s relevant experience is clearly and directly tied to these.',
                },
                cover_letter: {
                  type: 'string',
                  description:
                    "Generate the complete cover letter by combining the writing analysis (to match the user’s writing style), the skills mentioned in the job (to match the job description), and the job requirements matching (to ensure specific job qualifications are linked to the user’s experiences). Ensure it reads as a cohesive and professional cover letter. Use commas for breaks in thought or emphasis, ensuring natural and smooth sentence flow. The example_user_conversation allows you to know how the user writes normally to GPT as responses. We want to make sure this cover letter is not AI-detectable. Keep it concise and in a neutral tone. Avoid overly enthusiastic or playful language like 'excited,' 'thrilled,' and similar terms. Lean toward neutral but follow the user's tone.",
                },
              },
              required: [
                'example_user_conversation',
                'writing_analysis',
                'skills_mentioned_in_job',
                'job_requirements_matching',
                'cover_letter',
              ], // All properties are required
              additionalProperties: false, // Do not allow any extra fields
            },
          },
        },
        max_tokens: 1600, // Adjust token count as needed for the expected letter length
      },
    };
  }

  async buildJsonLd(
    records: Job[] | CoverLetter[],
    prefix: string,
  ): Promise<Buffer> {
    // House the JSON
    const jsonArray: JobJson[] | CoverLetterJson = [];
    // Loop through
    for (const record of records) {
      let jsonRecord;
      if (record instanceof Job) {
        jsonRecord = this.buildJobJson(record);
      } else {
        jsonRecord = this.buildCoverLetterJson(record);
      }
      jsonArray.push(jsonRecord);
    }
    // Convert into JSONLD
    const jsonLDFormatted = jsonArray
      .map((job) => {
        console.log(job);
        return JSON.stringify(job);
      })
      .join('\n');
    // Create File
    // Write the JSON Lines to a file
    fs.writeFileSync(
      path.join(__dirname, `${prefix}-requests.jsonl`),
      jsonLDFormatted,
    );
    return Buffer.from(jsonLDFormatted, 'utf-8');
  }

  async openAISendJSON(prefix: string): Promise<OpenAI.Batches.Batch> {
    const openai = new OpenAI({
      apiKey: this.configService.get('secrets.openApiKey'),
    });

    const filePath = path.join(__dirname, `${prefix}-requests.jsonl`);

    if (fs.existsSync(filePath)) {
      console.log(`File found: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
      throw new Error('File not found');
    }

    const response = await openai.files.create({
      file: fs.createReadStream(
        path.join(__dirname, `${prefix}-requests.jsonl`),
      ),
      purpose: 'batch',
    });

    console.log(response);

    const batch = await openai.batches.create({
      input_file_id: response.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
    });

    return batch;
  }

  async checkStatus(): Promise<boolean> {
    const rabbitMqUrl = `http://localhost:15672`;
    const username = this.configService.get<string>(
      'secrets.rabbitmq.username',
    );
    const password = this.configService.get<string>(
      'secrets.rabbitmq.password',
    );
    const url = `${rabbitMqUrl}/api/queues/%2F/jobs_queue`;

    try {
      const response = await axios.get(url, {
        auth: {
          username,
          password,
        },
      });

      const queueInfo: {
        messages: number;
      } = response.data;
      console.log(queueInfo.messages);
      if (queueInfo.messages === 0) {
        console.log('No more messages');
      } else {
        console.log('Still a message being processed');
      }

      return queueInfo.messages === 0; /// this will be true
    } catch (error) {
      console.error('Failed to query RabbitMQ API', error);
      return false; // Handle the error appropriately
    }
  }
}
