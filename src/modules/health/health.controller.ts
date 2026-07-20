import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({
    description: 'System operational status',
    example: 'OK',
  })
  status!: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @ApiOperation({
    summary: 'Check API service health status',
    description: 'Returns status OK to confirm the web service is operational. Publicly accessible.',
  })
  @ApiOkResponse({
    type: HealthCheckResponseDto,
    description: 'Service is healthy and operational.',
  })
  @Get()
  checkHealth() {
    return { status: 'OK' };
  }
}
