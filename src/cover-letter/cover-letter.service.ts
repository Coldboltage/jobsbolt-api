import { Injectable } from '@nestjs/common';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CoverLetter } from './entities/cover-letter.entity';
import { Repository } from 'typeorm';
import { JobService } from '../job/job.service';

@Injectable()
export class CoverLetterService {
  constructor(
    @InjectRepository(CoverLetter)
    private coverLetterRepository: Repository<CoverLetter>,
    private jobService: JobService,
  ) { }
  async create(createCoverLetterDto: CreateCoverLetterDto) {
    const jobEntity = await this.jobService.findOne(
      createCoverLetterDto.indeedId,
    );

    return this.coverLetterRepository.save({
      userPitch: createCoverLetterDto.userPitch,
      job: jobEntity,
    });
  }

  findAll() {
    return `This action returns all coverLetter`;
  }

  findOne(id: number) {
    return `This action returns a #${id} coverLetter`;
  }

  update(id: number, updateCoverLetterDto: UpdateCoverLetterDto) {
    return `This action updates a #${id} coverLetter`;
  }

  remove(id: number) {
    return `This action removes a #${id} coverLetter`;
  }
}
