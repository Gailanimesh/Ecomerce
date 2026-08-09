import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { PaymentsService } from './services/payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import {
  PaymentResponseDto,
  PaymentInitResponseDto,
} from './dto/payment-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @ApiOperation({
    summary: 'Initiate payment for an order',
    description: `Creates a Razorpay gateway order and returns client initialization payload.
    
**Sequence Flow**:
\`\`\`
Customer Order (PENDING_PAYMENT)
   │
   ▼
1. Validate Order & Expiration
   │
   ▼
2. Create Local Payment Record (PENDING) ──[DB Commit]
   │
   ▼
3. Call Razorpay API (Create Order) ──────[External Network API]
   │
   ▼
4. Save Gateway Order ID ─────────────────[DB Commit]
   │
   ▼
5. Return Checkout Payload (amountInPaise, keyId, gatewayOrderId)
\`\`\``,
  })
  @ApiCreatedResponse({
    type: PaymentInitResponseDto,
    description: 'Payment initiated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Order not in PENDING_PAYMENT state or payment window expired.',
  })
  @ApiNotFoundResponse({
    description: 'Order not found or does not belong to user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiatePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentInitResponseDto> {
    return this.paymentsService.initiatePayment(user.id, dto);
  }

  @ApiOperation({
    summary: 'Verify client checkout payment signature',
    description: `Verifies HMAC SHA256 signature and performs double verification against gateway API.

**Sequence Flow**:
\`\`\`
Frontend Widget Callback
   │
   ▼
1. Check Local Payment Record Status
   ├── If COMPLETED -> Return HTTP 200 (Idempotent Success)
   │
   ▼
2. Verify HMAC SHA256 Signature (razorpay_order_id + "|" + razorpay_payment_id)
   │
   ▼
3. Fetch Remote Gateway Details (Out-of-band double verification)
   │
   ▼
4. Mark Payment COMPLETED ────────────[DB Commit]
   │
   ▼
5. OrdersService.confirmPayment() ──────[Commit Stock Reservations]
\`\`\``,
  })
  @ApiOkResponse({
    type: PaymentResponseDto,
    description: 'Payment verified and completed successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Cryptographic signature mismatch or amount validation error.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verifyPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.verifyPayment(user.id, dto);
  }

  @ApiOperation({
    summary: 'Razorpay Webhook Callback Endpoint',
    description: `Public unauthenticated webhook endpoint with raw body HMAC verification and forensic audit logging.

**Sequence Flow**:
\`\`\`
Razorpay Gateway Webhook Event
   │
   ▼
1. Log Forensic WebhookEvent (RECEIVED) ──[DB Audit Log]
   │
   ▼
2. Verify Raw Body HMAC SHA256 Signature
   │
   ▼
3. Idempotency Check (eventId) ─────────[Prevent Duplicate Events]
   │
   ▼
4. Process Event Payload (payment.captured | payment.failed | refund.processed)
   │
   ▼
5. Mark WebhookEvent (PROCESSED) ────────[DB Commit]
\`\`\``,
  })
  @Public()
  @Post('webhook')
  handleWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
    @Headers() headers: Record<string, any>,
  ): Promise<{ status: string; message: string }> {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.paymentsService.handleWebhook(rawBody, signature, headers);
  }

  @ApiOperation({
    summary: 'Get payment status by Order ID',
    description: 'Retrieves payment status and details for an owned order.',
  })
  @ApiOkResponse({
    type: PaymentResponseDto,
    description: 'Payment record retrieved.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId')
  getPaymentByOrderId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentByOrderId(user.id, orderId);
  }
}
