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
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CoverLetter } from './entities/cover-letter.entity';

@ApiTags('cover-letter')
@Controller('cover-letter')
export class CoverLetterController {
  constructor(private readonly coverLetterService: CoverLetterService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Cover Letter Record for Job',
    description:
      'This will not create a literal Cover Letter which is generated automatically. The user will populate their own Cover Letter for ingestion within their own profile',
  })
  @ApiOkResponse({
    description: 'Cover Letter Record created',
    type: CoverLetter,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  create(@Body() createCoverLetterDto: CreateCoverLetterDto) {
    return this.coverLetterService.create(createCoverLetterDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('create-batch-job')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Execute Cover Letter Batch',
    description:
      'This is a manual way to fire a Cover Letter Batch. Any Cover Letter which does not have a geneatedCoverLetter (NULL) while also not being processed batch = true, will be added to this.',
  })
  @ApiOkResponse({
    description: 'Batch Cover Letter Execution Fired',
    type: CoverLetter,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  createBatchCover() {
    return this.coverLetterService.createBatchCover();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a specific Cover Letter Record',
    description:
      'There shouldn not be a case where an admin needs to look at someone elses Cover Letter Record. However in the future, if a user wants to update their cover letter, one could just look at the job entity and then the cover letter entity related.',
  })
  @ApiOkResponse({
    description: 'Found all cover letter records',
    type: CoverLetter,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findOne(@Param('id') id: string) {
    return this.coverLetterService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get every Cover Letter Record',
    description:
      'Gives you the ability to get every cover letter record Jobsbolt has created, regardless of state',
  })
  @ApiOkResponse({
    description: 'Found all cover letter records',
    type: CoverLetter,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findAll() {
    return this.coverLetterService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a Cover Letter Record',
    description:
      'Allows an admin to update a cover letter. The user will be able to update their own personal cover letter via the [PATCH] api/user/',
  })
  @ApiOkResponse({
    description: 'Updated Cover Letter Record',
    type: CoverLetter,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  update(
    @Param('id') id: string,
    @Body() updateCoverLetterDto: UpdateCoverLetterDto,
  ) {
    return this.coverLetterService.update(+id, updateCoverLetterDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Patch('reset/bulk-cvs')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset the state of a Cover Letter',
    description:
      'Sometimes, OpenAI does a bad job generating a cover letter for the specific job. As a result, the user can reset as cover letters.',
  })
  @ApiOkResponse({
    description: 'Cover Letter record reseted',
    type: CoverLetter,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  resetCvs(@Req() req, @Body() resetCvsDto: ResetCvsDto) {
    console.log(req.user.id);
    return this.coverLetterService.resetCvs(req.user.id, resetCvsDto.cvIds);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a cover letter record',
    description:
      'Unless a user is not interested in a job any further, one would usually just reset the Cover Letter Record, however it is here incase.',
  })
  @ApiOkResponse({
    description: 'Cover Letter record deleted',
    type: CoverLetter,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  remove(@Param('id') id: string) {
    return this.coverLetterService.remove(+id);
  }
}
