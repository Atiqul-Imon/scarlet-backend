/**
 * Bilingual SMS Messages (Bangla + English)
 * All messages are under 100 characters for optimal SMS delivery
 */

export const bilingualSMSMessages = {
  // OTP Messages
  otp: {
    login: "Scarlet OTP: {otp}. ১০ মিনিট বৈধ। Share করবেন না।",
    verification: "Verification Code: {otp}. Scarlet থেকে। ১০ মিনিট।",
    passwordReset: "Password Reset OTP: {otp}. Scarlet Beauty। ১০ মিনিট।"
  },

  // Order Messages
  order: {
    confirmation: "Order #{orderNumber} confirmed! Scarlet Beauty। Total: {total}৳।",
    shipped: "Order #{orderNumber} shipped! Scarlet থেকে। Track করুন।",
    delivered: "Order #{orderNumber} delivered! Scarlet Beauty। Enjoy করুন।",
    cancelled: "Order #{orderNumber} cancelled। Scarlet Beauty। Refund হবে।"
  },

  // Welcome Messages
  welcome: {
    newUser: "Welcome to Scarlet Beauty! আপনার beauty journey শুরু করুন।",
    returningUser: "Welcome back! Scarlet Beauty এ ফিরে আসার জন্য ধন্যবাদ।"
  },

  // Promotional Messages
  promotion: {
    discount: "Special offer! Scarlet Beauty এ {discount}% discount। Limited time।",
    newProduct: "New product alert! Scarlet Beauty এ নতুন item। Check করুন।",
    sale: "Sale alert! Scarlet Beauty এ massive discount। Don't miss।"
  },

  // Reminder Messages
  reminder: {
    cartAbandonment: "Your cart is waiting! Scarlet Beauty। Complete করুন এখন।",
    wishlist: "Wishlist item on sale! Scarlet Beauty। Check করুন।",
    review: "How was your order? Scarlet Beauty। Review দিন please।"
  },

  // Support Messages
  support: {
    help: "Need help? Scarlet Beauty support এ contact করুন। We're here!",
    complaint: "Sorry for inconvenience। Scarlet Beauty support এ জানান।",
    feedback: "Your feedback matters! Scarlet Beauty। Share করুন।"
  }
};

/**
 * Get SMS message by type and language preference
 */
export function getSMSMessage(type: keyof typeof bilingualSMSMessages, subtype: string, data: any = {}): string {
  const messageTemplate = (bilingualSMSMessages[type] as any)?.[subtype];
  
  if (!messageTemplate) {
    return `Scarlet Beauty message: ${type} - ${subtype}`;
  }

  // Replace placeholders
  let message = messageTemplate;
  Object.keys(data).forEach(key => {
    message = message.replace(`{${key}}`, data[key]);
  });

  // Ensure message is under 100 characters
  if (message.length > 100) {
    message = message.substring(0, 97) + '...';
  }

  return message;
}

/**
 * Character count for SMS optimization
 */
export function getSMSCharacterCount(message: string): number {
  return message.length;
}

/**
 * Check if message fits in single SMS (160 characters for English, 70 for Bangla)
 */
export function isSingleSMS(message: string): boolean {
  // Count Bangla characters (Unicode range: 0980-09FF)
  const banglaCount = (message.match(/[\u0980-\u09FF]/g) || []).length;
  const englishCount = message.length - banglaCount;
  
  // Bangla SMS: 70 characters, English SMS: 160 characters
  // Mixed: Use conservative estimate
  return message.length <= 70;
}
