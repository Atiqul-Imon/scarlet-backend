// Simple test of the validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  // Bangladesh phone number: 01XXXXXXXXX (11 digits starting with 01)
  const phoneRegex = /^(\+880|0)?1[3-9]\d{8}$/;
  return phoneRegex.test(phone);
};

console.log('🔍 Testing validation functions:');
console.log('');

const testEmail = 'admin@scarlet.com';
const testPhone = '01712345678';
const testInvalid = 'invalid';

console.log(`Email "${testEmail}":`, validateEmail(testEmail) ? '✅ Valid' : '❌ Invalid');
console.log(`Phone "${testPhone}":`, validatePhone(testPhone) ? '✅ Valid' : '❌ Invalid');  
console.log(`Invalid "${testInvalid}":`, validateEmail(testInvalid) ? '✅ Valid email' : '❌ Invalid email');
console.log(`Invalid "${testInvalid}":`, validatePhone(testInvalid) ? '✅ Valid phone' : '❌ Invalid phone');

console.log('');
console.log('If email validation shows ✅ Valid, then the validation is working correctly.');
console.log('If it shows ❌ Invalid, then there\'s an issue with the validation function.');
