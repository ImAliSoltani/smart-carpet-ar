const OTP_LENGTH = 4;
const DEMO_VALID_CODE = '1234';
const RESEND_SECONDS = 120;
const VERIFY_DELAY_MS = 600;

/** تبدیل ارقام فارسی و عربی به انگلیسی */
const toEnglishDigits = (str) =>
  String(str).replace(/[۰-۹٠-٩]/g, (ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 0x06f0 && c <= 0x06f9) return String(c - 0x06f0);
    if (c >= 0x0660 && c <= 0x0669) return String(c - 0x0660);
    return ch;
  });

const extractDigits = (str) => toEnglishDigits(str).replace(/\D/g, '');

const toPersianDigits = (str) =>
  String(str).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const formatTimer = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const raw = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return toPersianDigits(raw);
};

export function initOtpLogin() {
  const card = document.getElementById('otp-card');
  const bgLayer = document.getElementById('bg-layer');
  const stepLogin = document.getElementById('otp-step-login');
  const stepSuccess = document.getElementById('otp-step-success');
  const form = document.getElementById('otp-form');
  const inputs = Array.from(document.querySelectorAll('.otp-input'));
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnSpinnerIcon = document.getElementById('btn-spinner-icon');
  const errorMessage = document.getElementById('error-message');
  const resendBtn = document.getElementById('resend-btn');
  const timerDisplay = document.getElementById('timer-display');

  if (!card || !form || inputs.length !== OTP_LENGTH) {
    console.error('[OTP] عناصر DOM یافت نشد.');
    return;
  }

  let resendRemaining = RESEND_SECONDS;
  let timerInterval = null;
  let isSubmitting = false;

  function updateResendUI() {
    timerDisplay.textContent = formatTimer(resendRemaining);
    const canResend = resendRemaining <= 0;
    resendBtn.disabled = !canResend;
    resendBtn.classList.toggle('opacity-50', !canResend);
    resendBtn.classList.toggle('cursor-not-allowed', !canResend);
    resendBtn.classList.toggle('cursor-pointer', canResend);
    resendBtn.classList.toggle('text-orange-400', canResend);
  }

  function startResendTimer() {
    resendRemaining = RESEND_SECONDS;
    updateResendUI();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      resendRemaining -= 1;
      updateResendUI();
      if (resendRemaining <= 0) clearInterval(timerInterval);
    }, 1000);
  }

  function getOtpValue() {
    return extractDigits(inputs.map((inp) => inp.value).join(''));
  }

  function clearOtpInputs() {
    inputs.forEach((inp) => {
      inp.value = '';
      inp.classList.remove('filled', 'error');
    });
  }

  function setFilledState() {
    inputs.forEach((inp) => {
      inp.classList.toggle('filled', inp.value.length === 1);
    });
  }

  function showError(visible) {
    errorMessage.classList.toggle('visible', visible);
    errorMessage.classList.toggle('opacity-0', !visible);
    errorMessage.classList.toggle('opacity-100', visible);
    inputs.forEach((inp) => inp.classList.toggle('error', visible));
  }

  function resetToLogin() {
    document.body.classList.remove('success-mode');
    card.classList.remove('is-success');
    bgLayer?.classList.remove('is-success');

    stepSuccess?.classList.add('hidden');
    stepSuccess?.classList.remove('is-visible');
    stepLogin?.classList.remove('hidden', 'is-hiding');

    card.setAttribute('role', 'form');
    card.setAttribute('aria-labelledby', 'otp-title');

    inputs.forEach((inp) => {
      inp.disabled = false;
      inp.classList.remove('is-valid', 'error', 'filled');
    });

    clearOtpInputs();
    showError(false);
    setLoading(false);
    btnText.textContent = 'تایید و ورود';
    submitBtn.classList.remove('is-success');
    isSubmitting = false;

    startResendTimer();
    inputs[0].focus();
  }

  function showSuccessState() {
    clearInterval(timerInterval);
    setLoading(false);

    inputs.forEach((inp) => {
      inp.disabled = true;
      inp.classList.remove('error', 'filled');
      inp.classList.add('is-valid');
    });

    document.body.classList.add('success-mode');
    card.classList.add('is-success');
    bgLayer?.classList.add('is-success');

    stepLogin?.classList.add('is-hiding');

    setTimeout(() => {
      stepLogin?.classList.add('hidden');
      stepSuccess?.classList.remove('hidden');
      stepSuccess?.classList.add('is-visible');
      card.setAttribute('role', 'status');
      card.removeAttribute('aria-labelledby');
    }, 380);
  }

  function triggerShake() {
    card.classList.remove('animate-shake');
    void card.offsetWidth;
    card.classList.add('animate-shake');
    card.addEventListener(
      'animationend',
      () => card.classList.remove('animate-shake'),
      { once: true }
    );
  }

  function tryAutoSubmit() {
    if (getOtpValue().length === OTP_LENGTH && !isSubmitting) {
      form.requestSubmit();
    }
  }

  function fillFromString(str) {
    const digits = extractDigits(str).slice(0, OTP_LENGTH).split('');
    inputs.forEach((inp, i) => {
      inp.value = digits[i] || '';
    });
    setFilledState();
    const nextEmpty = inputs.findIndex((inp) => !inp.value);
    if (nextEmpty === -1) {
      inputs[OTP_LENGTH - 1].focus();
      tryAutoSubmit();
      return;
    }
    inputs[nextEmpty].focus();
  }

  function setLoading(loading) {
    isSubmitting = loading;
    submitBtn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnSpinner.classList.toggle('hidden', !loading);
    btnSpinner.classList.toggle('inline-flex', loading);
    btnSpinnerIcon?.classList.toggle('animate-spin-slow', loading);
    btnSpinner.setAttribute('aria-hidden', loading ? 'false' : 'true');
    inputs.forEach((inp) => {
      inp.disabled = loading;
    });
  }

  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      showError(false);
      const val = extractDigits(e.target.value);
      e.target.value = val.slice(-1);

      if (e.target.value) {
        e.target.classList.add('filled');
        if (index < OTP_LENGTH - 1) {
          inputs[index + 1].focus();
        } else {
          tryAutoSubmit();
        }
      } else {
        e.target.classList.remove('filled');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!input.value && index > 0) {
          e.preventDefault();
          inputs[index - 1].focus();
          inputs[index - 1].value = '';
          inputs[index - 1].classList.remove('filled');
        }
        return;
      }

      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        inputs[index - 1].focus();
      }
      if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
        e.preventDefault();
        inputs[index + 1].focus();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      fillFromString(pasted);
    });

    input.addEventListener('focus', () => input.select());
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const code = getOtpValue();
    showError(false);

    if (code.length < OTP_LENGTH) {
      triggerShake();
      showError(true);
      errorMessage.textContent = 'لطفاً هر ۴ رقم کد را وارد کنید.';
      const firstEmpty = inputs.find((inp) => !inp.value);
      (firstEmpty || inputs[0]).focus();
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS));

    if (code === DEMO_VALID_CODE) {
      showSuccessState();
    } else {
      setLoading(false);
      triggerShake();
      showError(true);
      errorMessage.textContent = 'کد وارد شده صحیح نیست. دوباره تلاش کنید.';
      clearOtpInputs();
      inputs[0].focus();
    }
  });

  resendBtn.addEventListener('click', () => {
    if (resendBtn.disabled) return;
    clearOtpInputs();
    showError(false);
    inputs[0].focus();
    startResendTimer();
  });

  document.getElementById('success-continue-btn')?.addEventListener('click', () => {
    console.info('[OTP] انتقال به داشبورد');
  });

  document.getElementById('success-back-btn')?.addEventListener('click', resetToLogin);

  startResendTimer();
  inputs[0].focus();
}
