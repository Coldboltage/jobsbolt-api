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
import { ManualJobDto } from './dto/manual-job.dto';

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
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  byBot(
    @Param('id') id: string,
    @Body() createJobDto: CreateJobDto,
  ): Promise<void> {
    return this.jobService.addJobsByBot(id, createJobDto.jobs);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('add-job-manually')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User adds a single job manually',
  })
  @ApiOkResponse({
    description: 'Single manual job added.',
    type: Job,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  addJobManually(@Body() manualJobDto: ManualJobDto) {
    return this.jobService.addJobManually(manualJobDto);
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
    description:
      'New jobs are jobs which have not been scanned yet. when the scannedLast value is set to null, Jobsbolt will pull it unless other circumstances prohibit it.',
  })
  @ApiOkResponse({
    description: 'Found all pending new jobs',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  getAllNewJobs(@Req() req) {
    return this.jobService.findAllUserUnsendJobs(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('suited-jobs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all suitable jobs for user' })
  @ApiOkResponse({
    description: 'All suitable jobs retrieved successfully.',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findAllSuitableJobs(@Req() req) {
    console.log(req.user.id);
    return this.jobService.findAllSuitableJobs(req.user.id);
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
    type: Job,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  resetFalse(@Req() req) {
    console.log(req.user.id);
    return this.jobService.resetFalse(req.user.id);
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
    type: Job,
    isArray: true,
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
    return this.jobService.findAllAppliedJobs(req.user.id, state);
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
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiExpectationFailedResponse({
    description: 'No cover letter generated for any job.',
  })
  @Get('cover-letter-to-apply')
  findAllCoverLetterToApply(@Req() req): Promise<DeepPartial<Job[]>> {
    return this.jobService.findAllCoverLetterToApply(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get the first most suitable jobs for a user and send that to the user',
  })
  @ApiOkResponse({
    description:
      'Discord bot has sent up to the next five most suitable jobs to said user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiExpectationFailedResponse({
    description: 'No cover letter generated for any job.',
  })
  sendDiscordNewJobMessageToUser(@Req() req): Promise<void> {
    return this.jobService.sendDiscordNewJobMessageToUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('application-state/:indeedId/:state')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Change the applied state of a job via the indeedId for a user from either true or false',
  })
  @ApiOkResponse({
    description: 'Applied status updated via IndeedId.',
    type: Job,
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
  ): Promise<Job> {
    return this.jobService.updateJobApplication(req.user.id, indeedId, state);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Patch('change-interested/:jobId/:state')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Change the applied state of a job for a user from either true or false usng the primary key',
  })
  @ApiOkResponse({
    description: 'Applied status updated.',
    type: Job,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  jobInterestState(
    @Req() req,
    @Param('jobId') jobId: string,
    @Param('state', ParseBoolPipe) interestedState: boolean,
  ): Promise<Job> {
    return this.jobService.jobInterestState(
      req.user.id,
      jobId,
      interestedState,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('new-job-discord-message')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Send discord message to users with new jobs which have not been processed for suitability',
  })
  @ApiOkResponse({
    description: 'Sends Discord messages for newly added jobs.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  sendDiscordNewJobMessage() {
    return this.jobService.sendDiscordNewJobMessage();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Gets all jobs where the interested is null but a notification was sent',
    description:
      'We want to get all jobs via if the job is in an interested state and the suited is also true. This means the user may fit well holistically to the job and thus, showing them this job might be good for them to secure if possible',
  })
  @ApiOkResponse({
    description: 'All jobs which are pending are sent to the user',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @Get('pending-interested')
  findAllJobsNotifiedPendingInterest(@Req() req): Promise<Job[]> {
    console.log(req.user.id);
    return this.jobService.findAllJobsNotifiedPendingInterest(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gets all jobs where the interested is null slim version',
  })
  @ApiOkResponse({
    description: 'All jobs which are pending are sent to the user',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @Get('pending-interested-slim')
  findAllJobsNotifiedPendingInterestSlim(@Req() req) {
    console.log(req.user.id);
    return this.jobService.findAllJobsNotifiedPendingInterestSlim(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all of a users interested jobs',
  })
  @ApiOkResponse({
    description: 'All interested jobs sent to user',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @Get('interested-jobs')
  findAllInterestedJobsByUser(@Req() req) {
    return this.jobService.findAllInterestedJobsByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get jobs which have not been notified yet and are within 14 days of adding',
  })
  @ApiOkResponse({
    description: 'All jobs to set for user',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @Get('reset-jobs-ai')
  resetAILookup(@Req() req) {
    return this.jobService.resetAILookup(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Fully reset jobs which have not been notified yet and are within 14 days of adding',
  })
  @ApiOkResponse({
    description: 'All jobs to reset for user',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @Post('reset-jobs-ai-full-reset')
  resetAILookupFullRun(@Req() req) {
    return this.jobService.resetAILookupFullRun(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Find the best jobs for the user which they have not been notified about',
  })
  @ApiOkResponse({
    description: 'Found jobs that are best for user not notified of yet',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @Get('find-new-best-jobs-not-notified')
  findUsersBestFiveJobs(@Req() req) {
    return this.jobService.findUsersBestFiveJobs(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find all the recent jobs for a user within the last 14 days',
  })
  @ApiOkResponse({
    description: 'Found all the recent jobs for a user within the last 14 days',
    type: Job,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @Get('find-recent-jobs-user')
  findUserRecentJobs(@Req() req) {
    return this.jobService.findUserRecentJobs(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a specific job for a user',
  })
  @ApiOkResponse({
    description: 'Specific job for user found',
    type: Job,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @Get(':id')
  findOne(@Param('id') indeedId: string) {
    return this.jobService.findOne(indeedId);
  }
}
