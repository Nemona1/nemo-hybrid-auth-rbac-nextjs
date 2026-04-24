import axios from 'axios';

/**
 * Validates an email address using ZeroBounce API
 * Returns detailed information about email validity
 */
export async function validateEmailWithZeroBounce(email, ipAddress = null) {
  const apiKey = process.env.ZEROBOUNDE_API_KEY;
  
  if (!apiKey) {
    console.error('[ZeroBounce] API key not configured');
    return { valid: false, error: 'Email validation service not configured' };
  }

  try {
    // Build URL with parameters
    let url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
    
    // Add IP address if provided (optional but recommended)
    if (ipAddress) {
      url += `&ip_address=${encodeURIComponent(ipAddress)}`;
    }
    
    console.log('[ZeroBounce] Validating email:', email);
    
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
    });
    
    const data = response.data;
    
    console.log('[ZeroBounce] Response:', {
      address: data.address,
      status: data.status,
      sub_status: data.sub_status,
      free_email: data.free_email,
      mx_found: data.mx_found,
      did_you_mean: data.did_you_mean
    });
    
    // Map ZeroBounce status to our validation result
    let isValid = false;
    let validationMessage = '';
    let shouldBlock = false;
    
    switch (data.status) {
      case 'valid':
        isValid = true;
        validationMessage = 'Email address is valid';
        shouldBlock = false;
        break;
        
      case 'invalid':
        isValid = false;
        validationMessage = 'This email address is invalid. Please check and try again.';
        shouldBlock = true;
        break;
        
      case 'catch-all':
        // Catch-all domains accept any email - could be risky
        isValid = true;
        validationMessage = 'Warning: This domain accepts all emails. Verification may be needed.';
        shouldBlock = false;
        break;
        
      case 'spamtrap':
        isValid = false;
        validationMessage = 'This email appears to be a spam trap. Please use a different email address.';
        shouldBlock = true;
        break;
        
      case 'abuse':
        isValid = false;
        validationMessage = 'This email has been reported for abuse. Please use a different email address.';
        shouldBlock = true;
        break;
        
      case 'do_not_mail':
        isValid = false;
        validationMessage = 'This email has requested not to receive emails.';
        shouldBlock = true;
        break;
        
      case 'unknown':
      default:
        isValid = false;
        validationMessage = 'Unable to verify this email address. Please ensure it is correct.';
        shouldBlock = true;
        break;
    }
    
    // Additional checks
    if (data.free_email === true && data.status === 'valid') {
      console.log('[ZeroBounce] Free email provider detected (e.g., Gmail, Yahoo)');
    }
    
    if (!data.mx_found) {
      isValid = false;
      validationMessage = 'This email domain does not have a mail server. Please use a valid email address.';
      shouldBlock = true;
    }
    
    // Check for typos (did_you_mean suggestion)
    if (data.did_you_mean && data.did_you_mean !== '') {
      validationMessage = `Did you mean "${data.did_you_mean}"? ${validationMessage}`;
    }
    
    return {
      valid: isValid,
      shouldBlock: shouldBlock,
      message: validationMessage,
      rawResponse: data,
      status: data.status,
      subStatus: data.sub_status,
      freeEmail: data.free_email,
      mxFound: data.mx_found,
      didYouMean: data.did_you_mean,
      domainAgeDays: data.domain_age_days,
      smtpProvider: data.smtp_provider
    };
    
  } catch (error) {
    console.error('[ZeroBounce] API Error:', error.message);
    
    if (error.response) {
      console.error('[ZeroBounce] Response status:', error.response.status);
      console.error('[ZeroBounce] Response data:', error.response.data);
    }
    
    // If validation fails, allow registration but log the issue
    // This ensures users aren't blocked due to API issues
    return {
      valid: true,
      shouldBlock: false,
      message: 'Email validation temporarily unavailable. Registration will proceed.',
      error: error.message,
      rawResponse: null
    };
  }
}

/**
 * Check remaining credits in ZeroBounce account
 */
export async function getZeroBounceCredits() {
  const apiKey = process.env.ZEROBOUNDE_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  try {
    const response = await axios.get(`https://api.zerobounce.net/v2/getcredits?api_key=${apiKey}`);
    return response.data.Credits;
  } catch (error) {
    console.error('[ZeroBounce] Failed to get credits:', error.message);
    return null;
  }
}