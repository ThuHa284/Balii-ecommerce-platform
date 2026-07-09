import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HeaderRolesGuard } from '../auth/header-roles.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Post('images')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: 'cover' | 'banner',
  ) {
    return this.campaignsService.uploadImage(
      file,
      kind === 'banner' ? 'banner' : 'cover',
    );
  }

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get('active')
  findActive() {
    return this.campaignsService.findActive();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.campaignsService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(new HeaderRolesGuard(['SUPER_ADMIN']))
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }
}
