import { ok, created, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { shippingService } from './service.js';
import type { CreateShipmentRequest, CourierRateRequest, ShipmentStatus } from './model.js';

/**
 * Get delivery rates from all couriers
 */
export const getRates = asyncHandler(async (req: any, res: any) => {
  const { city, area, weight, codAmount, deliveryType } = req.body as CourierRateRequest;
  
  if (!city || !area) {
    return fail(res, { message: 'City and area are required' }, 400);
  }
  
  const rates = await shippingService.getRates({
    city,
    area,
    weight,
    codAmount,
    deliveryType,
  });
  
  ok(res, rates);
});

/**
 * Create a new shipment
 */
export const createShipment = asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.userId;
  if (!userId) {
    return fail(res, { message: 'Unauthorized' }, 401);
  }
  
  const shipmentRequest: CreateShipmentRequest = {
    orderId: req.body.orderId,
    courier: req.body.courier,
    recipientName: req.body.recipientName,
    recipientPhone: req.body.recipientPhone,
    recipientEmail: req.body.recipientEmail,
    recipientAddress: req.body.recipientAddress,
    recipientCity: req.body.recipientCity,
    recipientArea: req.body.recipientArea,
    recipientPostalCode: req.body.recipientPostalCode,
    itemType: req.body.itemType,
    itemQuantity: req.body.itemQuantity,
    itemWeight: req.body.itemWeight,
    itemValue: req.body.itemValue,
    deliveryFee: req.body.deliveryFee,
    codAmount: req.body.codAmount,
    isCOD: req.body.isCOD || false,
    specialInstructions: req.body.specialInstructions,
    deliveryType: req.body.deliveryType || 'normal',
  };
  
  // Validate required fields
  if (!shipmentRequest.orderId) {
    return fail(res, { message: 'Order ID is required' }, 400);
  }
  if (!shipmentRequest.courier) {
    return fail(res, { message: 'Courier service is required' }, 400);
  }
  if (!shipmentRequest.recipientName || !shipmentRequest.recipientPhone) {
    return fail(res, { message: 'Recipient name and phone are required' }, 400);
  }
  if (!shipmentRequest.recipientAddress || !shipmentRequest.recipientCity || !shipmentRequest.recipientArea) {
    return fail(res, { message: 'Complete recipient address is required' }, 400);
  }
  
  const shipment = await shippingService.createShipment(shipmentRequest, userId);
  
  created(res, shipment);
});

/**
 * Track shipment by tracking number
 */
export const trackShipment = asyncHandler(async (req: any, res: any) => {
  const { trackingNumber } = req.params;
  
  if (!trackingNumber) {
    return fail(res, { message: 'Tracking number is required' }, 400);
  }
  
  const shipment = await shippingService.trackShipment(trackingNumber);
  
  ok(res, shipment);
});

/**
 * Get shipment by ID
 */
export const getShipment = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  
  const shipment = await shippingService.getShipmentById(id);
  if (!shipment) {
    return fail(res, { message: 'Shipment not found' }, 404);
  }
  
  ok(res, shipment);
});

/**
 * Get shipments for an order
 */
export const getOrderShipments = asyncHandler(async (req: any, res: any) => {
  const { orderId } = req.params;
  
  const shipments = await shippingService.getShipmentsByOrderId(orderId);
  
  ok(res, shipments);
});

/**
 * List all shipments with filters (Admin)
 */
export const listShipments = asyncHandler(async (req: any, res: any) => {
  const {
    status,
    courier,
    startDate,
    endDate,
    page = '1',
    limit = '50',
  } = req.query;
  
  const result = await shippingService.listShipments({
    status: status as ShipmentStatus | undefined,
    courier: courier as any,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });
  
  ok(res, result);
});

/**
 * Update shipment status (Admin)
 */
export const updateShipmentStatus = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { status, message } = req.body;
  
  if (!status) {
    return fail(res, { message: 'Status is required' }, 400);
  }
  
  const shipment = await shippingService.updateStatus(id, status, message);
  if (!shipment) {
    return fail(res, { message: 'Shipment not found' }, 404);
  }
  
  ok(res, shipment);
});

/**
 * Cancel shipment (Admin)
 */
export const cancelShipment = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  
  const cancelled = await shippingService.cancelShipment(id);
  
  ok(res, { 
    cancelled,
    message: cancelled 
      ? 'Shipment cancelled successfully' 
      : 'Shipment marked as cancelled (manual action may be required)'
  });
});

/**
 * Get shipment statistics (Admin)
 */
export const getStats = asyncHandler(async (req: any, res: any) => {
  const { startDate, endDate, courier } = req.query;
  
  const stats = await shippingService.getStats({
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    courier: courier as any,
  });
  
  ok(res, stats);
});

/**
 * Sync all active shipment statuses (Admin)
 */
export const syncStatuses = asyncHandler(async (req: any, res: any) => {
  // Run sync in background
  shippingService.syncShipmentStatuses().catch(err => {
    console.error('Sync failed:', err);
  });
  
  ok(res, { message: 'Shipment sync initiated' });
});

/**
 * Check courier availability
 */
export const checkAvailability = asyncHandler(async (req: any, res: any) => {
  const { courier, city, area } = req.body;
  
  if (!courier || !city || !area) {
    return fail(res, { message: 'Courier, city, and area are required' }, 400);
  }
  
  const available = await shippingService.isAvailable(courier, city, area);
  
  ok(res, { available });
});
