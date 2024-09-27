import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Job } from '../../job/entities/job.entity';

@Entity()
export class CoverLetter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userPitch: string;

  @Column({ nullable: true })
  generatedCoverLetter: string;

  @Column({ default: false })
  batch: boolean;

  @OneToOne(() => Job, (job) => job.coverLetter)
  job: Job;
}

export interface CompleteCoverParse {
  coverId: string;
  cover_letter: string;
}

export interface ParsedJobContent {
  cover_letter: string;
}

export interface CoverLetterJson {
  custom_id: string;
  method: string;
  url: string;
  body: {
    model: string;
    messages: Array<{
      role: 'system' | 'user';
      content: string;
    }>;
    response_format: {
      type: string;
      json_schema: {
        name: string;
        strict: boolean;
        schema: {
          type: string;
          properties: {
            example_user_conversation: { type: string; description: string };
            writing_analysis: { type: string; description: string };
            skills_mentioned_in_job: {
              type: string;
              description: string;
            };
            job_requirements_matching: { type: string; description: string };
            cover_letter: { type: string; description: string };
          };
          required: string[];
          additionalProperties: boolean;
        };
      };
    };
    max_tokens: number;
  };
}
