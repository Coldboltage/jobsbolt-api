import { Injectable } from '@nestjs/common';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';

@Injectable()
export class CoverLetterService {
  async create(createCoverLetterDto: CreateCoverLetterDto) {
    return 'This action adds a new coverLetter';
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
