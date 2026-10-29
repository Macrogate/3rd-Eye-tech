'use strict';

// ═══════════════════════════════════════════════════════════════
//  3rd Eye Tech — Payment Page Script
//  Flow: create-order (backend) → Razorpay Checkout → verify (backend)
// ═══════════════════════════════════════════════════════════════

// ── Backend base URL ────────────────────────────────────────────
// Change this to your production URL when going live.
const API_BASE = 'http://localhost:5000/api/payment';

// ── DOM References ──────────────────────────────────────────────
const form = document.getElementById('paymentForm');
const payBtn = document.getElementById('payBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const btnLockIcon = document.getElementById('btnLockIcon');
const amountInput = document.getElementById('payAmount');
const nameInput = document.getElementById('payName');
const emailInput = document.getElementById('payEmail');
const phoneInput = document.getElementById('payPhone');
const noteInput = document.getElementById('payNote');
const payFormSection = document.getElementById('payFormSection');
const successSection = document.getElementById('successSection');
const successDetails = document.getElementById('successDetails');
const toastContainer = document.getElementById('toastContainer');
const quickChips = document.querySelectorAll('.quick-chip');
const newPaymentBtn = document.getElementById('newPaymentBtn');

// ── Footer year ─────────────────────────────────────────────────
document.getElementById('footerYear').textContent = new Date().getFullYear();

// ═══════════════════════════════════════════════════════════════
//  QUICK AMOUNT CHIPS
// ═══════════════════════════════════════════════════════════════
quickChips.forEach(chip => {
  chip.addEventListener('click', () => {
    amountInput.value = chip.dataset.amount;
    quickChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    clearError('payAmount');
    updateBtnText(chip.dataset.amount);
  });
});

amountInput.addEventListener('input', () => {
  quickChips.forEach(c => c.classList.remove('active'));
  clearError('payAmount');
  amountInput.value ? updateBtnText(amountInput.value) : (btnText.textContent = 'Pay Now');
});

function updateBtnText(rupees) {
  btnText.textContent = `Pay ₹${Number(rupees).toLocaleString('en-IN')}`;
}

// ═══════════════════════════════════════════════════════════════
//  FORM VALIDATION
// ═══════════════════════════════════════════════════════════════
function showError(fieldId, errorId) {
  document.getElementById(fieldId).classList.add('is-invalid');
  document.getElementById(errorId).classList.add('show');
}

function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.remove('is-invalid');
  const errorMap = {
    payAmount: 'amountError',
    payName: 'nameError',
    payEmail: 'emailError',
    payPhone: 'phoneError',
  };
  const errEl = document.getElementById(errorMap[fieldId]);
  if (errEl) errEl.classList.remove('show');
}

// Live-clear errors as user types
['payAmount', 'payName', 'payEmail', 'payPhone'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => clearError(id));
});

function validateForm() {
  let valid = true;

  // Amount — the ONLY required field
  const amount = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(amount) || amount < 1) {
    showError('payAmount', 'amountError');
    valid = false;
  }

  // Email — optional, but if provided it must be a valid format
  if (emailInput.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      showError('payEmail', 'emailError');
      valid = false;
    }
  }

  // Phone — optional, but if provided must be 10–13 digits
  if (phoneInput.value.trim()) {
    const digits = phoneInput.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      showError('payPhone', 'phoneError');
      valid = false;
    }
  }

  return valid;
}

// ═══════════════════════════════════════════════════════════════
//  BUTTON LOADING STATE
// ═══════════════════════════════════════════════════════════════
function setLoading(on) {
  payBtn.disabled = on;
  btnSpinner.style.display = on ? 'block' : 'none';
  btnLockIcon.style.display = on ? 'none' : 'block';
  btnText.textContent = on
    ? 'Processing…'
    : (amountInput.value ? `Pay ₹${Number(amountInput.value).toLocaleString('en-IN')}` : 'Pay Now');
}

// ═══════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════
const TOAST_ICONS = {
  success: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
  error: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
};

function showToast(title, msg, type = 'info', duration = 5000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <div class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
  toastContainer.appendChild(toast);
  if (duration > 0) setTimeout(() => removeToast(toast), duration);
  return toast;
}

function removeToast(toast) {
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

// ═══════════════════════════════════════════════════════════════
//  SUCCESS SCREEN
// ═══════════════════════════════════════════════════════════════
function showSuccess({ razorpay_order_id, razorpay_payment_id, amount, name, email }) {
  const amountFormatted = (amount / 100).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR'
  });

  // Build optional rows only when the user actually filled them in
  const nameRow = name ? `<div class="success-row"><span class="key">Name</span><span class="val">${name}</span></div>` : '';
  const emailRow = email ? `<div class="success-row"><span class="key">Email</span><span class="val">${email}</span></div>` : '';

  successDetails.innerHTML = `
    <div class="success-row">
      <span class="key">Amount Paid</span>
      <span class="val amount">${amountFormatted}</span>
    </div>
    ${nameRow}
    ${emailRow}
    <div class="success-row">
      <span class="key">Payment ID</span>
      <span class="val">${razorpay_payment_id}</span>
    </div>
    <div class="success-row">
      <span class="key">Order ID</span>
      <span class="val">${razorpay_order_id}</span>
    </div>
    <div class="success-row">
      <span class="key">Date & Time</span>
      <span class="val">${new Date().toLocaleString('en-IN')}</span>
    </div>
  `;

  payFormSection.style.display = 'none';
  successSection.style.display = 'flex';
}

// ── Reset back to form ──────────────────────────────────────────
newPaymentBtn.addEventListener('click', () => {
  form.reset();
  quickChips.forEach(c => c.classList.remove('active'));
  btnText.textContent = 'Pay Now';
  successSection.style.display = 'none';
  payFormSection.style.display = 'block';
});

// ═══════════════════════════════════════════════════════════════
//  MAIN PAYMENT FLOW
// ═══════════════════════════════════════════════════════════════
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast('Check your details', 'Please fix the highlighted fields before proceeding.', 'error');
    return;
  }

  const amountRs = Math.round(parseFloat(amountInput.value)); // ₹ (rupees)
  const amountPaise = amountRs * 100;  // Razorpay works in paise
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim().replace(/\D/g, '');
  const note = noteInput.value.trim();

  setLoading(true);

  try {
    // ── Step 1: Create Razorpay order via our backend ──────────
    const orderRes = await fetch(`${API_BASE}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: `3et_${Date.now()}`,
        // notes are stored inside the Razorpay order object (visible in Razorpay Dashboard)
        notes: {
          name,
          email,
          phone: phone || '',
          purpose: note || 'Payment to 3rd Eye Tech',
        },
      }),
    });
    console.log(orderRes);

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.success) {
      throw new Error(orderData.message || 'Failed to create order.');
    }
    console.log(orderData);


    const { order, key } = orderData;
    setLoading(false);
    console.log(order);


    // ── Step 2: Open Razorpay Checkout Modal ───────────────────
    const rzp = new window.Razorpay({
      key,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: '3rd Eye Tech',
      description: note || 'Cloud & Technology Services',
      image: './helo/logo.png',
      // prefill → pre-populates fields inside Razorpay popup (only send non-empty values)
      prefill: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { contact: phone }),
      },
      notes: order.notes,
      theme: { color: '#03a7d3' },

      // ── Step 3: After successful payment, verify on backend ──
      handler: async function (response) {
        const verifyToast = showToast('Verifying Payment', 'Please wait…', 'info', 0);
        payBtn.disabled = true;

        try {
          const verifyRes = await fetch(`${API_BASE}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          removeToast(verifyToast);

          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.message || 'Signature verification failed.');
          }

          showToast('Payment Confirmed!', `₹${amountRs.toLocaleString('en-IN')} paid successfully.`, 'success');
          showSuccess({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            amount: order.amount,
            name,
            email,
          });

        } catch (err) {
          removeToast(verifyToast);
          showToast('Verification Failed', err.message, 'error');
          payBtn.disabled = false;
        }
      },

      // User closed popup without paying
      modal: {
        ondismiss: () => {
          showToast('Payment Cancelled', 'You closed the payment window. Try again when ready.', 'info');
          setLoading(false);
        },
      },
    });


    rzp.on('payment.failed', (response) => {
      showToast('Payment Failed', response.error.description || 'Payment could not be processed.', 'error');
      setLoading(false);
    });

    rzp.open();

  } catch (err) {
    setLoading(false);
    showToast('Something went wrong', err.message || 'Please try again or contact support.', 'error');
    console.error('[Payment Error]', err);
  }
});
