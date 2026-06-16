/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class PersonAnalysisService {
  private readonly aiServiceUrl =
    process.env.AI_GENDER_AGE_SERVICE_URL || 'http://localhost:8010';

  async analyzePerson(personImage: Express.Multer.File) {
    if (!personImage) {
      throw new BadRequestException('Thiếu ảnh người mẫu để phân tích.');
    }

    if (!personImage.mimetype.startsWith('image/')) {
      throw new BadRequestException('Ảnh người mẫu phải là tệp hình ảnh.');
    }

    const formData = new FormData();

    formData.append('image', personImage.buffer, {
      filename: personImage.originalname,
      contentType: personImage.mimetype,
    });

    const response = await axios.post(
      `${this.aiServiceUrl}/analyze-person`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000,
      },
    );

    return response.data.data;
  }
}
