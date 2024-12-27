import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import { ResetCvsDto } from './dto/reset-cover-letters.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';

@Controller('cover-letter')
export class CoverLetterController {
  constructor(private readonly coverLetterService: CoverLetterService) { }

  @Post()
  create(@Body() createCoverLetterDto: CreateCoverLetterDto) {
    return this.coverLetterService.create(createCoverLetterDto);
  }

  @Post('create-batch-job')
  createBatchCover() {
    return this.coverLetterService.createBatchCover();
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Patch('reset/bulk-cvs')
  resetCvs(@Req() req, @Body() resetCvsDto: ResetCvsDto) {
    console.log(req.user.id)
    return this.coverLetterService.resetCvs(req.user.id, resetCvsDto.cvIds);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coverLetterService.remove(+id);
  }
}
