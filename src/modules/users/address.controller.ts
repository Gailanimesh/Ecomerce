import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { AddressService } from './services/address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('User Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiOperation({
    summary: 'Create delivery address',
    description: 'Creates a new saved address owned by the authenticated user.',
  })
  @ApiCreatedResponse({
    type: AddressResponseDto,
    description: 'Address created successfully.',
  })
  @ApiBadRequestResponse({ description: 'Validation error in request payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Post()
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.addressService.create(user.id, dto);
  }

  @ApiOperation({
    summary: 'List user delivery addresses',
    description: 'Returns all saved addresses for the authenticated user ordered by default status.',
  })
  @ApiOkResponse({
    type: [AddressResponseDto],
    description: 'Addresses retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Get()
  getUserAddresses(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto[]> {
    return this.addressService.findAllByUser(user.id);
  }

  @ApiOperation({
    summary: 'Get address details by ID',
    description: 'Retrieves a single address owned by the authenticated user.',
  })
  @ApiOkResponse({
    type: AddressResponseDto,
    description: 'Address record retrieved.',
  })
  @ApiNotFoundResponse({ description: 'Address not found or does not belong to user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  @Get(':id')
  getAddressById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AddressResponseDto> {
    return this.addressService.findOneByUser(user.id, id);
  }

  @ApiOperation({
    summary: 'Update delivery address details',
    description: 'Updates address information for a saved address owned by the user.',
  })
  @ApiOkResponse({
    type: AddressResponseDto,
    description: 'Address updated successfully.',
  })
  @ApiNotFoundResponse({ description: 'Address not found or does not belong to user.' })
  @ApiBadRequestResponse({ description: 'Validation error in request payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  @Patch(':id')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.addressService.update(user.id, id, dto);
  }

  @ApiOperation({
    summary: 'Set address as default delivery address',
    description: 'Sets the specified address as the primary default address for the user.',
  })
  @ApiOkResponse({
    type: AddressResponseDto,
    description: 'Default address set successfully.',
  })
  @ApiNotFoundResponse({ description: 'Address not found or does not belong to user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  @Patch(':id/default')
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AddressResponseDto> {
    return this.addressService.setDefault(user.id, id);
  }

  @ApiOperation({
    summary: 'Delete delivery address',
    description: 'Deletes a saved address owned by the user.',
  })
  @ApiOkResponse({
    description: 'Address deleted successfully.',
  })
  @ApiNotFoundResponse({ description: 'Address not found or does not belong to user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  @Delete(':id')
  deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.addressService.remove(user.id, id);
  }
}
