import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  ParseBoolPipe,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import {
  ApiBearerAuth,
  ApiExpectationFailedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Job } from './entities/job.entity';
import { DeepPartial } from 'typeorm';

@ApiTags('job')
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('by-worker/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Jobsbolt Worker place to add jobs for user (Admin only)',
  })
  @ApiOkResponse({
    description: 'All new jobs added.',
    type: [Job],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  byBot(@Param('id') id: string, @Body() createJobDto: CreateJobDto) {
    return this.jobService.addJobsByBot(id, createJobDto.jobs);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Find every job added to Jobsbolt regardless of circumstances (Admin only)',
  })
  @ApiOkResponse({
    description: 'Found all jobs on Jobsbolt API',
    type: [Job],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findAll(): Promise<Job[]> {
    return this.jobService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('get-all-new-jobs/')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'All the new jobs added by the bot which have not been processed for suitability (Admin only)',
  })
  @ApiOkResponse({
    description: 'Found all pending new jobs',
    type: [Job],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  getAllNewJobs(@Req() req) {
    return this.jobService.findAllUserUnsendJobs(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('suited-jobs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all suitable jobs for user' })
  @ApiOkResponse({
    description: 'All suitable jobs retrieved successfully.',
    type: [Job],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findAllSuitableJobs(@Req() req) {
    console.log(req.user.userId);
    return this.jobService.findAllSuitableJobs(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('reset-jobs')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Reset jobs with false status so to check for suitability again for user (Admin only)',
  })
  @ApiOkResponse({
    description: 'Suited jobs for user set as false resetted.',
    type: [Job],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  resetFalse(@Req() req) {
    console.log(req.user.userId);
    return this.jobService.resetFalse(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('applied-jobs/:state')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Find all jobs for user, which they have either applied for or not with boolean',
  })
  @ApiOkResponse({
    description: 'All jobs found for user dependent on application status.',
    type: [Job],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findAllAppliedJobs(
    @Req() req,
    @Param('state', ParseBoolPipe) state: boolean,
  ) {
    return this.jobService.findAllAppliedJobs(req.user.userId, state);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Find all jobs for user which have a generated cover letter and have not been applied for',
  })
  @ApiOkResponse({
    description:
      'All jobs have been found where cover letter is generated but not applied for',
    type: [Job],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiExpectationFailedResponse({
    description: 'No cover letter generated for any job.',
  })
  @Get('cover-letter-to-apply')
  findAllCoverLetterToApply(@Req() req): Promise<DeepPartial<Job[]>> {
    return this.jobService.findAllCoverLetterToApply(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('application-state/:indeedId/:state')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Change the applied state of a job for a user from either true or false',
  })
  @ApiOkResponse({
    description: 'Applied status updated.',
    type: [Job],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  updateJobApplication(
    @Req() req,
    @Param('state', ParseBoolPipe) state: boolean,
    @Param('indeedId') indeedId: string,
  ) {
    return this.jobService.updateJobApplication(
      req.user.userId,
      indeedId,
      state,
    );
  }

  @Get(':id')
  findOne(@Param('id') indeedId: string) {
    return this.jobService.findOne(indeedId);
  }
}
