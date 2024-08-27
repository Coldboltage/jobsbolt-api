import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseBoolPipe,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';

@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobService.create(createJobDto);
  }

  @Post('by-worker/:id')
  byBot(@Param('id') id: string, @Body() createJobDto: CreateJobDto) {
    return this.jobService.addJobsByBot(id, createJobDto.jobs);
  }

  @Get()
  findAll() {
    return this.jobService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-new-jobs/')
  getAllNewJobs(@Req() req) {
    return this.jobService.findAllUserUnsendJobs(req.user.userId);
  }

  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('suited-jobs')
  findAllSuitableJobs(@Req() req) {
    console.log(req.user.userId);
    return this.jobService.findAllSuitableJobs(req.user.userId);
  }

  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('reset-jobs')
  resetFalse(@Req() req) {
    console.log(req.user.userId);
    return this.jobService.resetFalse(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('applied-jobs/:state')
  findAllAppliedJobs(
    @Req() req,
    @Param('state', ParseBoolPipe) state: boolean,
  ) {
    return this.jobService.findAllAppliedJobs(req.user.userId, state);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(+id, updateJobDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('application-state/:jobId/:state')
  updateJobApplication(
    @Req() req,
    @Param('state', ParseBoolPipe) state: boolean,
    @Param('jobId') jobId: string,
  ) {
    return this.jobService.updateJobApplication(req.user.userId, jobId, state);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(+id);
  }
}
