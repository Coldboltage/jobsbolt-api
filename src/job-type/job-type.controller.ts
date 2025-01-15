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

@Controller('job-type')
export class JobTypeController {
  constructor(private readonly jobTypeService: JobTypeService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post()
  create(@Body() createJobTypeDto: CreateJobTypeDto, @Request() req) {
    return this.jobTypeService.create(createJobTypeDto, req.user);
  }

  @Get('suited-jobs/:id')
  findAllSuitableJobs(@Param('id') id: string) {
    return this.jobTypeService.findAllSuitableJobs(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobTypeDto: UpdateJobTypeDto) {
    return this.jobTypeService.update(id, updateJobTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobTypeService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('/find-by-user')
  findByUser(@Req() req) {
    return this.jobTypeService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobTypeService.findOne(id);
  }

  @Get()
  findAll() {
    return this.jobTypeService.findAll();
  }
}
