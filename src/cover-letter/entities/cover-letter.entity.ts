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

  @OneToOne(() => Job, (job) => job.coverLetter)
  job: Job;
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
