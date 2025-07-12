export class GapiErrorDto {
  body?: string;
  status?: number; // 403
  result?: {
    error: {
      code: number; // 403
      errors: {
        domain: string;
        location: string;
        locationType: string;
        message: string;
        reason: string;
      }[],
      message: string;
    }
  }
}

export class GapiError extends GapiErrorDto {
  reason?: string;

  constructor(dto?: GapiError) {
    super();

    this.reason = dto?.reason || dto.result.error.message;
  }
}
