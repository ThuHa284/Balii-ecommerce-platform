/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PersonAnalysisService } from './person-analysis.service';

@Controller('try-on')
export class PersonAnalysisController {
  constructor(private readonly personAnalysisService: PersonAnalysisService) {}

  @Post('analyze-person')
  @UseInterceptors(FileInterceptor('personImage'))
  async analyzePerson(@UploadedFile() personImage: Express.Multer.File) {
    const analysis =
      await this.personAnalysisService.analyzePerson(personImage);

    return {
      success: true,
      data: analysis,
    };
  }
}
