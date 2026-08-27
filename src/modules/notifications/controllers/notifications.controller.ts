import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { NotificationsService } from '../services/notifications.service';
import { NotificationQueryDto } from '../dto/notification-query.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
} from '../dto/notification-response.dto';
import { UnreadCountResponseDto } from '../dto/unread-count-response.dto';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List user notifications',
    description: 'Retrieves paginated notifications for the authenticated customer with unread filtering.',
  })
  @ApiOkResponse({
    description: 'Paginated list of user notifications',
    type: PaginatedNotificationsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    return this.notificationsService.getUserNotifications(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns the count of unread notifications for badge/bell indicators.',
  })
  @ApiOkResponse({
    description: 'Count of unread notifications',
    type: UnreadCountResponseDto,
  })
  async getUnreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnreadCountResponseDto> {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark single notification as read',
    description: 'Marks a specific notification as read. Verifies ownership.',
  })
  @ApiOkResponse({
    description: 'Updated notification',
    type: NotificationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks all unread notifications of the authenticated customer as read.',
  })
  @ApiOkResponse({
    description: 'Number of notifications updated',
    schema: { properties: { updatedCount: { type: 'number', example: 5 } } },
  })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ updatedCount: number }> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Permanently deletes a notification. Verifies user ownership.',
  })
  @ApiNoContentResponse({ description: 'Notification deleted successfully' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  async deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notificationsService.deleteNotification(user.id, id);
  }
}
