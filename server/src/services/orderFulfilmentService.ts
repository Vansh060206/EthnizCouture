import prisma from '../prisma';
import { logger } from '../utils/logger';
import { backgroundQueue } from './backgroundQueue';
import { emailService } from './emailService';

export type FulfilmentActionType =
  | 'CONFIRM_ORDER'
  | 'START_PREPARATION'
  | 'MARK_PACKED'
  | 'DISPATCH_ORDER'
  | 'MARK_OUT_FOR_DELIVERY'
  | 'CONFIRM_DELIVERY'
  | 'CANCEL_ORDER'
  | 'UPDATE_TRACKING'
  | 'APPROVE_RETURN'
  | 'REJECT_RETURN'
  | 'COMPLETE_RETURN';

export interface FulfilmentActionPayload {
  orderId: string;
  adminId: string;
  action: FulfilmentActionType;
  expectedStatus?: string;
  expectedUpdatedAt?: string;
  // Shipment fields for DISPATCH_ORDER / UPDATE_TRACKING
  carrierName?: string;
  trackingNumber?: string;
  dispatchedAt?: string | Date;
  estimatedDelivery?: string | Date;
  // Notes
  customerNotes?: string;
  internalNotes?: string;
  // Cancellation
  cancellationReason?: string;
  // COD delivery collection
  codCollected?: boolean;
  // Return resolution fields
  returnResolution?: 'EXCHANGE' | 'REFUND' | 'STORE_CREDIT';
  returnRejectionReason?: string;
  refundAmount?: number;
  restoreStockOnReturn?: boolean;
}

export interface FulfilmentResult {
  success: boolean;
  statusCode: number;
  message: string;
  order?: any;
}

// Valid status transitions map
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PACKED', 'CANCELLED'],
  PROCESSING: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'PROCESSING', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'DELIVERED', 'RETURNED'],
  RETURN_APPROVED: ['RETURNED'],
  RETURNED: [], // Terminal
  CANCELLED: []  // Terminal
};

export class OrderFulfilmentService {
  /**
   * Retrieves operational queue counts for admin dashboard
   */
  async getFulfilmentQueueCounts(): Promise<Record<string, number>> {
    const [
      all,
      pending,
      confirmed,
      processing,
      packed,
      shipped,
      outForDelivery,
      delivered,
      cancelled,
      returnRequested,
      returned
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: 'PENDING' } }),
      prisma.order.count({ where: { orderStatus: 'CONFIRMED' } }),
      prisma.order.count({ where: { orderStatus: 'PROCESSING' } }),
      prisma.order.count({ where: { orderStatus: 'PACKED' } }),
      prisma.order.count({ where: { orderStatus: 'SHIPPED' } }),
      prisma.order.count({ where: { orderStatus: 'OUT_FOR_DELIVERY' } }),
      prisma.order.count({ where: { orderStatus: 'DELIVERED' } }),
      prisma.order.count({ where: { orderStatus: 'CANCELLED' } }),
      prisma.order.count({ where: { orderStatus: 'RETURN_REQUESTED' } }),
      prisma.order.count({ where: { orderStatus: { in: ['RETURN_APPROVED', 'RETURNED'] } } })
    ]);

    return {
      all,
      new: pending,
      confirmed,
      preparing: processing,
      packed,
      shipped,
      outForDelivery,
      delivered,
      cancelled,
      returnRequested,
      returned,
      inTransit: shipped + outForDelivery
    };
  }

  /**
   * Centralized, transactional state machine transition execution
   */
  async executeTransition(payload: FulfilmentActionPayload): Promise<FulfilmentResult> {
    const {
      orderId,
      adminId,
      action,
      expectedStatus,
      expectedUpdatedAt,
      carrierName,
      trackingNumber,
      dispatchedAt,
      estimatedDelivery,
      customerNotes,
      internalNotes,
      cancellationReason,
      codCollected
    } = payload;

    // 1. Fetch current order with line items & status history
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, stock: true, name: true, sku: true }
            }
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!order) {
      return { success: false, statusCode: 404, message: 'Order not located in registry.' };
    }

    // 2. Concurrency Conflict Guard (optimistic concurrency checking)
    if (expectedStatus && order.orderStatus !== expectedStatus) {
      return {
        success: false,
        statusCode: 409,
        message: `Order status conflict: Order has already been updated to ${order.orderStatus} by another atelier staff.`,
        order
      };
    }

    if (expectedUpdatedAt && new Date(order.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) {
      return {
        success: false,
        statusCode: 409,
        message: 'Order state conflict: This order was modified concurrently. Refreshing latest atelier details.',
        order
      };
    }

    // 3. Terminal state protections
    if (order.orderStatus === 'DELIVERED' && !['UPDATE_TRACKING', 'APPROVE_RETURN', 'REJECT_RETURN'].includes(action)) {
      return {
        success: false,
        statusCode: 400,
        message: 'Cannot modify an order that has reached terminal state DELIVERED unless updating tracking or responding to a return request.'
      };
    }

    if (['CANCELLED', 'RETURNED'].includes(order.orderStatus)) {
      return {
        success: false,
        statusCode: 400,
        message: `Cannot modify an order that has already reached terminal state ${order.orderStatus}.`
      };
    }

    // 4. Action-specific validation and transition mapping
    let targetStatus = order.orderStatus;
    let transitionNote = '';
    let shouldRestoreStock = false;
    let paymentStatusUpdate: string | undefined;

    switch (action) {
      case 'CONFIRM_ORDER': {
        if (order.orderStatus !== 'PENDING') {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot confirm order in state ${order.orderStatus}. Expected state: PENDING.`
          };
        }

        // Online payment constraint: if payment failed or is pending on an online order, require validation
        if (order.paymentMethod !== 'COD' && order.paymentStatus === 'FAILED') {
          return {
            success: false,
            statusCode: 400,
            message: 'Cannot confirm order with FAILED payment. Customer must retry online payment first.'
          };
        }

        targetStatus = 'CONFIRMED';
        transitionNote = customerNotes || 'Order verified & confirmed by atelier concierge. Stock reserved.';
        break;
      }

      case 'START_PREPARATION': {
        if (!['CONFIRMED', 'PACKED'].includes(order.orderStatus)) {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot start preparation from state ${order.orderStatus}. Must be CONFIRMED.`
          };
        }

        // Guard: Online order must be paid before preparation starts
        if (order.paymentMethod !== 'COD' && order.paymentStatus !== 'PAID') {
          return {
            success: false,
            statusCode: 400,
            message: 'Preparation cannot start for online orders before payment is verified as PAID.'
          };
        }

        targetStatus = 'PROCESSING';
        transitionNote = customerNotes || 'Artisanal preparation started. Handloom quality inspection in progress.';
        break;
      }

      case 'MARK_PACKED': {
        if (!['PROCESSING', 'CONFIRMED'].includes(order.orderStatus)) {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot mark packed from state ${order.orderStatus}. Must be in PROCESSING.`
          };
        }

        targetStatus = 'PACKED';
        transitionNote = customerNotes || 'Garments inspected, steamed, and packaged in bespoke royal presentation packaging.';
        break;
      }

      case 'DISPATCH_ORDER': {
        if (!['PACKED', 'PROCESSING', 'CONFIRMED'].includes(order.orderStatus)) {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot dispatch order in state ${order.orderStatus}. Must be PACKED or PROCESSING.`
          };
        }

        // Must have valid carrier and tracking
        const cleanCarrier = carrierName?.trim() || order.carrierName;
        const cleanTracking = trackingNumber?.trim() || order.trackingNumber;

        if (!cleanCarrier) {
          return {
            success: false,
            statusCode: 400,
            message: 'Carrier name is required to record physical dispatch (e.g., Blue Dart, Delhivery, DTDC, Speed Post).'
          };
        }

        if (!cleanTracking) {
          return {
            success: false,
            statusCode: 400,
            message: 'Air Waybill / Tracking number is required to record dispatch.'
          };
        }

        targetStatus = 'SHIPPED';
        transitionNote = customerNotes || `Package handed over to carrier ${cleanCarrier} under AWB ${cleanTracking}. In transit.`;
        break;
      }

      case 'UPDATE_TRACKING': {
        if (!trackingNumber && !carrierName) {
          return {
            success: false,
            statusCode: 400,
            message: 'Provide at least carrier name or tracking number to update.'
          };
        }
        // Does not change target status unless already shipped
        transitionNote = customerNotes || `Shipment details updated: Carrier: ${carrierName || order.carrierName || 'Unspecified'}, AWB: ${trackingNumber || order.trackingNumber}.`;
        break;
      }

      case 'MARK_OUT_FOR_DELIVERY': {
        if (order.orderStatus !== 'SHIPPED') {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot mark out for delivery from state ${order.orderStatus}. Expected state: SHIPPED.`
          };
        }

        targetStatus = 'OUT_FOR_DELIVERY';
        transitionNote = customerNotes || 'Courier agent en route for doorstep handover to patron.';
        break;
      }

      case 'CONFIRM_DELIVERY': {
        if (!['SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)) {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot confirm delivery from state ${order.orderStatus}. Must be SHIPPED or OUT_FOR_DELIVERY.`
          };
        }

        targetStatus = 'DELIVERED';
        transitionNote = customerNotes || 'Handloom couture safely delivered to patron. Delivery confirmed.';

        // Handle COD cash collection
        if (order.paymentMethod === 'COD' && codCollected) {
          paymentStatusUpdate = 'PAID';
          transitionNote += ' Cash on Delivery collected & audited.';
        }
        break;
      }

      case 'CANCEL_ORDER': {
        // Cannot cancel after physical dispatch
        if (['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)) {
          return {
            success: false,
            statusCode: 400,
            message: 'Cannot cancel an order that has already been dispatched with a courier. A return request must be initiated instead.'
          };
        }

        if (!cancellationReason || !cancellationReason.trim()) {
          return {
            success: false,
            statusCode: 400,
            message: 'An operational reason is required for administrative order cancellation.'
          };
        }

        targetStatus = 'CANCELLED';
        shouldRestoreStock = true;
        transitionNote = `Order cancelled by atelier admin. Reason: ${cancellationReason.trim()}. Reserved stock restored to warehouse.`;

        if (order.paymentStatus === 'PAID') {
          paymentStatusUpdate = 'REFUNDED';
          transitionNote += ' Payment marked for refund.';
        }
        break;
      }

      case 'APPROVE_RETURN': {
        if (order.orderStatus !== 'RETURN_REQUESTED') {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot approve return for order in state ${order.orderStatus}. Must be RETURN_REQUESTED.`
          };
        }

        const resolution = payload.returnResolution || 'REFUND';
        targetStatus = 'RETURN_APPROVED';
        transitionNote = customerNotes?.trim() || `Return approved by atelier admin. Resolution: ${resolution}. Reverse courier pickup scheduled.`;

        if (payload.restoreStockOnReturn) {
          shouldRestoreStock = true;
          transitionNote += ' Inventory marked for restocking.';
        }

        if (resolution === 'REFUND' && order.paymentStatus === 'PAID') {
          paymentStatusUpdate = 'REFUNDED';
          transitionNote += ' Refund initiated to patron source.';
        }
        break;
      }

      case 'REJECT_RETURN': {
        if (order.orderStatus !== 'RETURN_REQUESTED') {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot decline return for order in state ${order.orderStatus}. Must be RETURN_REQUESTED.`
          };
        }

        const reason = payload.returnRejectionReason?.trim() || customerNotes?.trim();
        if (!reason) {
          return {
            success: false,
            statusCode: 400,
            message: 'An operational explanation is required when declining a return request.'
          };
        }

        targetStatus = 'DELIVERED';
        transitionNote = `Return request declined by atelier admin. Reason: ${reason}. Order status reverted to DELIVERED.`;
        break;
      }

      case 'COMPLETE_RETURN': {
        if (!['RETURN_APPROVED', 'RETURN_REQUESTED'].includes(order.orderStatus)) {
          return {
            success: false,
            statusCode: 400,
            message: `Cannot finalize return for order in state ${order.orderStatus}. Must be RETURN_APPROVED or RETURN_REQUESTED.`
          };
        }

        targetStatus = 'RETURNED';
        shouldRestoreStock = true;
        transitionNote = customerNotes?.trim() || 'Garment received at atelier, passed quality inspection. Stock restored and return finalized.';

        if (order.paymentStatus === 'PAID') {
          paymentStatusUpdate = 'REFUNDED';
          transitionNote += ' Payment refunded.';
        }
        break;
      }

      default: {
        return { success: false, statusCode: 400, message: `Unsupported fulfilment action: ${action}` };
      }
    }

    // 5. Verify allowed transitions matrix if status is changing
    if (targetStatus !== order.orderStatus) {
      const allowedNext = ALLOWED_TRANSITIONS[order.orderStatus] || [];
      if (!allowedNext.includes(targetStatus)) {
        return {
          success: false,
          statusCode: 400,
          message: `Illegal transition: Cannot transition from ${order.orderStatus} to ${targetStatus}.`
        };
      }
    }

    // 6. Execute atomic transaction
    try {
      const updatedOrder = await prisma.$transaction(async (tx: any) => {
        // A. If cancellation, safely restore inventory (guaranteed only once since order.orderStatus !== 'CANCELLED')
        if (shouldRestoreStock) {
          for (const item of order.items) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: {
                    increment: item.quantity
                  }
                }
              });
            }
          }
        }

        // B. Prepare order update payload
        const updateData: any = {
          orderStatus: targetStatus,
          updatedAt: new Date()
        };

        if (paymentStatusUpdate) {
          updateData.paymentStatus = paymentStatusUpdate;
        }

        if (carrierName?.trim()) {
          updateData.carrierName = carrierName.trim();
        }

        if (trackingNumber?.trim()) {
          updateData.trackingNumber = trackingNumber.trim();
        }

        if (dispatchedAt) {
          updateData.dispatchedAt = new Date(dispatchedAt);
        } else if (action === 'DISPATCH_ORDER' && !order.dispatchedAt) {
          updateData.dispatchedAt = new Date();
        }

        if (action === 'CONFIRM_DELIVERY' && !order.deliveredAt) {
          updateData.deliveredAt = new Date();
        }

        if (estimatedDelivery) {
          updateData.estimatedDelivery = new Date(estimatedDelivery);
        }

        if (internalNotes?.trim()) {
          updateData.internalNotes = internalNotes.trim();
        }

        // Apply order update
        const updated = await tx.order.update({
          where: { id: order.id },
          data: updateData,
          include: {
            items: true,
            statusHistory: {
              orderBy: { createdAt: 'desc' }
            }
          }
        });

        // C. Record OrderStatusHistory event
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: targetStatus,
            notes: transitionNote,
            actorId: adminId,
            source: 'ADMIN_ACTION'
          }
        });

        // D. Record Administrative Audit Log
        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: 'ORDER_FULFILMENT_TRANSITION',
            entity: 'ORDER',
            entityId: order.id,
            details: JSON.stringify({
              previousStatus: order.orderStatus,
              newStatus: targetStatus,
              action,
              carrierName: updateData.carrierName || order.carrierName,
              trackingNumber: updateData.trackingNumber || order.trackingNumber,
              paymentStatus: updateData.paymentStatus || order.paymentStatus,
              internalNotes: internalNotes || null,
              reason: cancellationReason || null
            })
          }
        });

        return updated;
      });

      // 7. Post-transaction background notifications
      if (action === 'DISPATCH_ORDER' || action === 'CONFIRM_DELIVERY') {
        logger.info(`Dispatch/delivery milestone reached for order ${updatedOrder.orderNumber}`);
      }

      if (action === 'APPROVE_RETURN' || action === 'REJECT_RETURN') {
        emailService.sendReturnDecisionEmail({
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.customerName,
          customerEmail: updatedOrder.customerEmail,
          decision: action === 'APPROVE_RETURN' ? 'APPROVED' : 'REJECTED',
          resolution: payload.returnResolution || 'REFUND',
          carrierName: carrierName || updatedOrder.carrierName || 'Blue Dart Express Reverse Logistics',
          trackingNumber: trackingNumber || undefined,
          notes: customerNotes || undefined,
          reason: payload.returnRejectionReason || undefined
        }).catch((err) => {
          logger.error('Failed to dispatch return decision email', err);
        });
      }

      logger.info(
        `Order ${updatedOrder.orderNumber} successfully transitioned from ${order.orderStatus} to ${targetStatus} via ${action} by admin ${adminId}`
      );

      return {
        success: true,
        statusCode: 200,
        message: `Order #${updatedOrder.orderNumber} transitioned to ${targetStatus} successfully.`,
        order: updatedOrder
      };
    } catch (txError: any) {
      logger.error('Order fulfilment transition transaction error', txError);
      return {
        success: false,
        statusCode: 500,
        message: txError.message || 'Failed to complete order fulfilment transition.'
      };
    }
  }
}

export const orderFulfilmentService = new OrderFulfilmentService();
