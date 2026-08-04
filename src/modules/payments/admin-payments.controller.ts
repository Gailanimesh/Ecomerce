import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { PaymentsService } from './services/payments.service';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import {
  PaymentResponseDto,
  PaginatedPaymentsResponseDto,
} from './dto/payment-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/roles.enum';

@ApiTags('Admin Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({
    summary: 'Paginated search & filtering across system payments (Admin)',
    description:
      'Search by Razorpay Order ID, Razorpay Payment ID, or internal Order Number.',
  })
  @ApiOkResponse({
    type: PaginatedPaymentsResponseDto,
    description: 'Payments retrieved successfully.',
  })
  @Get()
  getAllPayments(
    @Query() query: PaymentQueryDto,
  ): Promise<PaginatedPaymentsResponseDto> {
    return this.paymentsService.getAllPayments(query);
  }

  @ApiOperation({
    summary: 'Get payment detail by ID or Gateway Reference (Admin)',
  })
  @ApiOkResponse({
    type: PaymentResponseDto,
    description: 'Payment details retrieved.',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID or Gateway Reference' })
  @Get(':id')
  getPaymentById(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentById(id);
  }

  @ApiOperation({
    summary: 'Process refund via gateway (Admin)',
    description:
      'Issues refund via Razorpay API, marks payment as REFUNDED, and triggers OrdersService.refundPayment().',
  })
  @ApiOkResponse({
    type: PaymentResponseDto,
    description: 'Refund processed successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Payment record not found.',
  })
  @ApiBadRequestResponse({
    description: 'Payment status invalid for refund (must be COMPLETED).',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @Post(':id/refund')
  refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.refundPayment(id, dto);
  }
}
