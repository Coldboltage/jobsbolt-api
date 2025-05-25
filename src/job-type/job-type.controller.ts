import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { JobTypeService } from './job-type.service';
import { CreateJobTypeDto } from './dto/create-job-type.dto';
import { UpdateJobTypeDto } from './dto/update-job-type.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JobType } from './entities/job-type.entity';
import { UpdateResult } from 'typeorm';

@ApiTags('job-type')
@Controller('job-type')
export class JobTypeController {
  constructor(private readonly jobTypeService: JobTypeService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a JobsType for a user',
  })
  @ApiOkResponse({
    description: 'A JobType for a user was created',
    type: JobType,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  create(@Body() createJobTypeDto: CreateJobTypeDto, @Request() req) {
    return this.jobTypeService.create(createJobTypeDto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('suited-jobs/')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a JobsType for a user',
  })
  @ApiOkResponse({
    description: 'A JobType for a user was created',
    type: JobType,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findAllSuitableJobs(@Req() req) {
    return this.jobTypeService.findAllSuitableJobs(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'General Update of a JobType (Admin)',
  })
  @ApiOkResponse({
    description: 'A JobType has be updated',
    type: UpdateResult,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  update(@Param('id') id: string, @Body() updateJobTypeDto: UpdateJobTypeDto) {
    return this.jobTypeService.update(id, updateJobTypeDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a JobType',
  })
  @ApiOkResponse({
    description: 'A JobType has been deleted',
    type: String,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  remove(@Param('id') id: string, @Req() req: any): string {
    return this.jobTypeService.remove(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('/find-by-user')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find all JobTypes by userId',
  })
  @ApiOkResponse({
    description: 'Found all JobTypes by userId',
    type: JobType,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findByUser(@Req() req) {
    return this.jobTypeService.findAllByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find a JobType by the id',
  })
  @ApiOkResponse({
    description: 'Found the JobType by the id',
    type: JobType,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findOne(@Param('id') id: string) {
    return this.jobTypeService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find all JobTypes',
  })
  @ApiOkResponse({
    description: 'Found every JobType',
    type: JobType,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findAll() {
    return this.jobTypeService.findAll();
  }
}
