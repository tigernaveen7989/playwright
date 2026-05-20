export class CreateOrderResponseParser {
  getOrderIdAndWarningMessage(jsonString: string): { orderId: string; warningMessage: string } {
    try {
      const json = JSON.parse(jsonString);
      return {
        orderId: json?.order?.id ?? 'Order ID not found',
        warningMessage: json?.warnings?.[0]?.description ?? 'Warning message not found'
      };
    } catch {
      return { orderId: 'Invalid JSON', warningMessage: 'Invalid JSON' };
    }
  }
}
