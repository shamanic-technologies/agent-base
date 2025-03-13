/**
 * Payment Service Test Script
 * 
 * Tests the Payment Service subscription and payment processing capabilities.
 */
const http = require('http');

// Configuration
const SERVICE_HOST = 'localhost';
const SERVICE_PORT = 3007; // Payment Service runs on port 3007

// Test data
const TEST_USER_ID = `user_${Date.now()}`;
const TEST_PAYMENT_METHOD = {
  type: 'card',
  card: {
    number: '4242424242424242',
    expMonth: 12,
    expYear: 2025,
    cvc: '123'
  }
};

// Utility function to make HTTP requests
function makeRequest(path, method, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const requestBody = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: SERVICE_HOST,
      port: SERVICE_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody || ''),
        ...headers
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData,
            error: `Failed to parse response: ${error.message}`
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(requestBody);
    }
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('🧪 PAYMENT SERVICE TEST SUITE 🧪');
  console.log(`Testing service at http://${SERVICE_HOST}:${SERVICE_PORT}\n`);
  
  let subscriptionId = null;
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await makeRequest('/health', 'GET');
    
    if (healthResponse.statusCode === 200) {
      console.log('✅ Health check passed');
    } else {
      console.log(`❌ Health check failed with status: ${healthResponse.statusCode}`);
      console.log('Response:', healthResponse.body);
      console.log('\nIs the Payment Service running? Make sure to start it with: cd apps/payment-service && npm run dev');
      return;
    }
    
    // Test 2: Get available plans
    console.log('\n2️⃣ Getting available plans...');
    const plansResponse = await makeRequest('/payment/plans', 'GET');
    
    let planId = null;
    
    if (plansResponse.statusCode === 200 && plansResponse.body.success) {
      console.log('✅ Plans retrieved successfully');
      console.log('Plans:', plansResponse.body.data);
      
      if (plansResponse.body.data && plansResponse.body.data.length > 0) {
        // Use the first available plan
        planId = plansResponse.body.data[0].id;
        console.log(`Using plan: ${planId}`);
      } else {
        console.log('❌ No plans available');
        return;
      }
    } else {
      console.log(`❌ Getting plans failed with status: ${plansResponse.statusCode}`);
      console.log('Response:', plansResponse.body);
      return;
    }
    
    // Test 3: Get a specific plan
    console.log(`\n3️⃣ Getting details for plan: ${planId}...`);
    const planResponse = await makeRequest(`/payment/plans/${planId}`, 'GET');
    
    if (planResponse.statusCode === 200 && planResponse.body.success) {
      console.log('✅ Plan details retrieved successfully');
      console.log('Plan:', planResponse.body.data);
    } else {
      console.log(`❌ Getting plan details failed with status: ${planResponse.statusCode}`);
      console.log('Response:', planResponse.body);
    }
    
    // Test 4: Create a subscription
    console.log('\n4️⃣ Creating a subscription...');
    const subscriptionResponse = await makeRequest('/payment/subscriptions', 'POST', {}, {
      userId: TEST_USER_ID,
      planId,
      paymentMethod: TEST_PAYMENT_METHOD
    });
    
    if (subscriptionResponse.statusCode === 201 && subscriptionResponse.body.success) {
      console.log('✅ Subscription created successfully');
      console.log('Subscription:', subscriptionResponse.body.data.subscription);
      console.log('Transaction:', subscriptionResponse.body.data.transaction);
      subscriptionId = subscriptionResponse.body.data.subscription.id;
    } else {
      console.log(`❌ Creating subscription failed with status: ${subscriptionResponse.statusCode}`);
      console.log('Response:', subscriptionResponse.body);
      return;
    }
    
    // Test 5: Get user's subscriptions
    console.log(`\n5️⃣ Getting subscriptions for user: ${TEST_USER_ID}...`);
    const userSubscriptionsResponse = await makeRequest(`/payment/subscriptions/user/${TEST_USER_ID}`, 'GET');
    
    if (userSubscriptionsResponse.statusCode === 200 && userSubscriptionsResponse.body.success) {
      console.log('✅ User subscriptions retrieved successfully');
      console.log('Subscriptions:', userSubscriptionsResponse.body.data);
      
      // Verify our subscription is in the list
      const hasSubscription = userSubscriptionsResponse.body.data.some(
        sub => sub.id === subscriptionId
      );
      
      if (hasSubscription) {
        console.log(`✅ Found our subscription with ID '${subscriptionId}'`);
      } else {
        console.log(`❌ Subscription with ID '${subscriptionId}' not found in the list`);
      }
    } else {
      console.log(`❌ Getting user subscriptions failed with status: ${userSubscriptionsResponse.statusCode}`);
      console.log('Response:', userSubscriptionsResponse.body);
    }
    
    // Test 6: Create a one-time payment
    console.log('\n6️⃣ Creating a one-time payment...');
    const chargeResponse = await makeRequest('/payment/charge', 'POST', {}, {
      userId: TEST_USER_ID,
      amount: 19.99,
      description: 'One-time token package',
      paymentMethod: TEST_PAYMENT_METHOD
    });
    
    if (chargeResponse.statusCode === 201 && chargeResponse.body.success) {
      console.log('✅ One-time payment created successfully');
      console.log('Transaction:', chargeResponse.body.data);
    } else {
      console.log(`❌ Creating payment failed with status: ${chargeResponse.statusCode}`);
      console.log('Response:', chargeResponse.body);
    }
    
    // Test 7: Get user's transactions
    console.log(`\n7️⃣ Getting transactions for user: ${TEST_USER_ID}...`);
    const userTransactionsResponse = await makeRequest(`/payment/transactions/user/${TEST_USER_ID}`, 'GET');
    
    if (userTransactionsResponse.statusCode === 200 && userTransactionsResponse.body.success) {
      console.log('✅ User transactions retrieved successfully');
      console.log('Transactions:', userTransactionsResponse.body.data);
      console.log(`Found ${userTransactionsResponse.body.data.length} transactions`);
    } else {
      console.log(`❌ Getting user transactions failed with status: ${userTransactionsResponse.statusCode}`);
      console.log('Response:', userTransactionsResponse.body);
    }
    
    // Test 8: Get token usage
    console.log(`\n8️⃣ Getting token usage for user: ${TEST_USER_ID}...`);
    const usageResponse = await makeRequest(`/payment/usage/${TEST_USER_ID}`, 'GET');
    
    if (usageResponse.statusCode === 200 && usageResponse.body.success) {
      console.log('✅ Token usage retrieved successfully');
      console.log('Usage:', usageResponse.body.data);
      console.log(`Usage percentage: ${usageResponse.body.data.usagePercentage.toFixed(2)}%`);
    } else {
      console.log(`❌ Getting token usage failed with status: ${usageResponse.statusCode}`);
      console.log('Response:', usageResponse.body);
    }
    
    // Test 9: Cancel subscription
    if (subscriptionId) {
      console.log(`\n9️⃣ Cancelling subscription: ${subscriptionId}...`);
      const cancelResponse = await makeRequest(`/payment/subscriptions/${subscriptionId}/cancel`, 'POST');
      
      if (cancelResponse.statusCode === 200 && cancelResponse.body.success) {
        console.log('✅ Subscription cancelled successfully');
        console.log('Updated subscription:', cancelResponse.body.data);
      } else {
        console.log(`❌ Cancelling subscription failed with status: ${cancelResponse.statusCode}`);
        console.log('Response:', cancelResponse.body);
      }
    }
    
    console.log('\n✅ Test suite completed');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.log('Is the Payment Service running at the correct port?');
  }
}

// Run the tests
runTests().catch(console.error);

console.log('\n📋 Running this test:');
console.log('1. Make sure the Payment Service is running (cd apps/payment-service && npm run dev)');
console.log('2. Execute this test with: node test-payment-service.js'); 