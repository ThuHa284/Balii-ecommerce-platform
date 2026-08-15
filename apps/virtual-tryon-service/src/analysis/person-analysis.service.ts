/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { validateUploadedImage } from '@app/common';

@Injectable()
export class PersonAnalysisService {
  private readonly aiServiceUrl =
    process.env.AI_GENDER_AGE_SERVICE_URL || 'http://localhost:8010';

  async analyzePerson(personImage: Express.Multer.File) {
    if (!personImage) {
      throw new BadRequestException('Thiếu ảnh người mẫu để phân tích.');
    }

    validateUploadedImage(personImage, {
      maxBytes: 8 * 1024 * 1024,
      fieldName: 'ảnh người mẫu',
    });

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
