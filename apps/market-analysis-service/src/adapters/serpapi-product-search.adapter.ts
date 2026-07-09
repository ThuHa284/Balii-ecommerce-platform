import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

type LensResponse = Record<string, any>;
type ShoppingResponse = Record<string, any>;
type ImagesResponse = Record<string, any>;

@Injectable()
export class SerpApiProductSearchAdapter {
  private readonly logger = new Logger(SerpApiProductSearchAdapter.name);
  private readonly baseUrl = 'https://serpapi.com/search.json';

  constructor(private readonly configService: ConfigService) {}

  async searchByLens(imageUrl: string): Promise<LensResponse> {
    return this.request({
      engine: 'google_lens',
      url: imageUrl,
      hl: this.getLanguage(),
      country: this.getCountry(),
    });
  }

  async searchByShopping(keyword: string): Promise<ShoppingResponse> {
    return this.request({
      engine: 'google_shopping',
      q: keyword,
      google_domain: this.getGoogleDomain(),
      gl: this.getCountry(),
      hl: this.getLanguage(),
      location: this.getLocation(),
    });
  }

  async searchByImages(keyword: string): Promise<ImagesResponse> {
    return this.request({
      engine: 'google_images',
      q: keyword,
      google_domain: this.getGoogleDomain(),
      gl: this.getCountry(),
      hl: this.getLanguage(),
      location: this.getLocation(),
      cr: `country${this.getCountry().toUpperCase()}`,
    });
  }

  private async request(
    params: Record<string, string>,
  ): Promise<Record<string, any>> {
    const apiKey = this.configService.get<string>('SERPAPI_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'SERPAPI_KEY is missing. Real SerpApi search cannot run.',
      );
    }

    const timeoutMs = Number(
      this.configService.get<string>('SERPAPI_TIMEOUT_MS') ?? '30000',
    );

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await axios.get<Record<string, any>>(this.baseUrl, {
          params: {
            ...params,
            api_key: apiKey,
          },
          timeout: timeoutMs,
        });

        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError<Record<string, any>>;
        const status = axiosError.response?.status;
        const message =
          typeof axiosError.response?.data?.error === 'string'
            ? axiosError.response.data.error
            : axiosError.message;

        const isTemporaryNetworkError =
          axios.isAxiosError(error) &&
          ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(
            axiosError.code ?? '',
          );

        if (attempt === 0 && isTemporaryNetworkError) {
          continue;
        }

        if (
          status === 401 ||
          status === 403 ||
          /invalid api key/i.test(message) ||
          /account/i.test(message)
        ) {
          throw new InternalServerErrorException(
            'SERPAPI_KEY is missing or invalid. Real SerpApi search cannot run.',
          );
        }

        if (
          status === 429 ||
          /rate limit/i.test(message) ||
          /quota/i.test(message) ||
          /credits/i.test(message)
        ) {
          throw new ServiceUnavailableException(
            'SerpApi quota or rate limit reached. Please try again later.',
          );
        }

        this.logger.error(
          `SerpApi request failed for ${params.engine}`,
          JSON.stringify({
            status,
            message,
            code: axiosError.code,
          }),
        );

        throw new ServiceUnavailableException(
          'SerpApi request failed. Please try again later.',
        );
      }
    }

    throw new ServiceUnavailableException(
      'SerpApi request failed. Please try again later.',
    );
  }

  private getCountry(): string {
    return (
      this.configService
        .get<string>('SERPAPI_GOOGLE_COUNTRY')
        ?.trim()
        .toLowerCase() ?? 'vn'
    );
  }

  private getLanguage(): string {
    return (
      this.configService
        .get<string>('SERPAPI_GOOGLE_LANGUAGE')
        ?.trim()
        .toLowerCase() ?? 'vi'
    );
  }

  private getLocation(): string {
    return (
      this.configService.get<string>('SERPAPI_GOOGLE_LOCATION')?.trim() ??
      'Vietnam'
    );
  }

  private getGoogleDomain(): string {
    return (
      this.configService.get<string>('SERPAPI_GOOGLE_DOMAIN')?.trim() ??
      'google.com'
    );
  }
}
