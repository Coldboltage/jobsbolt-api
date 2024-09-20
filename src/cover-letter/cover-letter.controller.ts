import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';

@Controller('cover-letter')
export class CoverLetterController {
  constructor(private readonly coverLetterService: CoverLetterService) { }

  @Post()
  create(@Body() createCoverLetterDto: CreateCoverLetterDto) {
    return this.coverLetterService.create(createCoverLetterDto);
  }

  @Get()
  findAll() {
    return this.coverLetterService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coverLetterService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCoverLetterDto: UpdateCoverLetterDto,
  ) {
    return this.coverLetterService.update(+id, updateCoverLetterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coverLetterService.remove(+id);
  }
}
