import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  CoverLetter,
  CoverLetterJson,
} from '../cover-letter/entities/cover-letter.entity';
import { Job, JobJson } from '../job/entities/job.entity';
import { ConfigService } from '@nestjs/config';
const path = require('path');
const fs = require('fs');

@Injectable()
export class UtilsService {
  constructor(private configService: ConfigService) { }

  createJobContentMessage(job: Job) {
    return `Here is a job I'm looking to apply for Job Description: ${job.description} Job Pay: ${job.pay} Job Location: ${job.location}. I wanted to know if it would suit me given the following cv: ${job.jobType[0].user.cv}. Here's also my personal descrption of myself and what I'm looking for: ${job.jobType[0].user.description}. The CV helps but the description gives a more recent telling of what the user is thinking.`;
  }

  createCoverLetterMessage(coverLetter: CoverLetter) {
    return `I am requesting a personalized cover letter based on the following information:

1. **Base Cover Letter**: This is an example of how I write my cover letters. It reflects my writing style and tone, so the generated cover letter should closely follow this template while being grammatically correct. Please ensure the generated letter mimics my voice and style. Here is my base cover letter: ${coverLetter.job.jobType[0].user.baseCoverLetter}.

2. **My CV**: Use the relevant details from my CV to align my skills, experiences, and accomplishments with the job description provided. The generated letter should emphasize where my qualifications match the job requirements. Here is my CV: ${coverLetter.job.jobType[0].user.cv}.

3. **Job Description**: This is the job I am applying for. Please tailor the cover letter to match the key requirements and qualifications mentioned in the job description. Here is the job description: ${coverLetter.job.description}.

4. **My Pitch**: This is my unfiltered pitch, where I express in my own words why I am a strong fit for this position. Use this pitch to infuse the letter with my personal touch and feelings about the role. Here is my pitch: ${coverLetter.userPitch}.

**Goal**: Using this information, generate a cover letter that reflects my writing style and voice while highlighting my CV’s alignment with the job description. Ensure the letter is personalized, professional, and speaks to why I am a strong fit for the role.`;
  }

  buildJobJson(job: Job): JobJson {
    return {
      custom_id: job.indeedId,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful and experienced career advisor. Your task is to analyze job descriptions and compare them with candidate resumes. Provide feedback on how well the candidate fits the job, identify key strengths and gaps, and give a recommendation on whether the job is a good match for the candidate.',
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
                    'The analysis of how well the candidate fits the job description. This should consider both current qualifications and potential for growth. Location matters a lot. If the job requires to move continent, that might be problematic. See the user description if provided.',
                },
                is_suitable: {
                  type: 'boolean',
                  description:
                    'A boolean indicating if the candidate is a good match for the job, based on the analysis provided.',
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
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an experienced career advisor and writing assistant. Your role is to help users craft personalized cover letters that closely reflect their unique writing style, based on an example base cover letter they provide. You will analyze the job description, the candidate's CV, and their unfiltered pitch to generate a cover letter that is professional yet personalized to the user. Your goal is to ensure the cover letter is as close as possible to the user’s natural writing, incorporating their voice, avoiding overly formal or AI-generated phrasing, and presenting them as a genuine, qualified candidate. Balance professionalism with authenticity, while addressing the specific requirements of the job description.`,
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
                cover_letter: {
                  type: 'string',
                  description:
                    'The full contents of the generated cover letter',
                },
              },
              required: ['cover_letter'], // Cover letter is mandatory
              additionalProperties: false, // Do not allow any extra fields
            },
          },
        },
        max_tokens: 1000, // Adjust token count as needed for the expected letter length
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

  async openAISendJSON(prefix: string) {
    const openai = new OpenAI({
      apiKey: this.configService.get('secrets.openApiKey'),
    });

    const filePath = path.join(__dirname, `${prefix}-requests.jsonl`);

    if (fs.existsSync(filePath)) {
      console.log(`File found: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
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
}
