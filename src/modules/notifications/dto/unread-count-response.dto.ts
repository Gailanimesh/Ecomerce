import { ApiProperty } from '@nestjs/swagger';

export class UnreadCountResponseDto {
  @ApiProperty({ example: 4, description: 'Number of unread notifications' })
  count!: number;
}
