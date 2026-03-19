/**
 * Нативная маска телефона для российских номеров
 * Формат: +7 (9XX) XXX-XX-XX
 */

export function initPhoneMask() {
  const inputs = document.querySelectorAll('input[type="tel"], .mask-phone');
  inputs.forEach(applyPhoneMask);
}

function applyPhoneMask(input) {
  input.setAttribute('autocomplete', 'tel');
  input.setAttribute('inputmode', 'tel');
  input.setAttribute('placeholder', '+7 (9__) ___-__-__');

  input.addEventListener('input', handleInput);
  input.addEventListener('focus', handleFocus);
  input.addEventListener('blur', handleBlur);
  input.addEventListener('paste', handlePaste);
  input.addEventListener('keydown', handleKeydown);
}

function formatPhone(digits) {
  digits = digits.replace(/\D/g, '');

  if (digits.length > 0 && (digits[0] === '7' || digits[0] === '8')) {
    digits = digits.substring(1);
  }

  if (digits.length > 0 && digits[0] !== '9') {
    digits = digits.substring(1);
  }

  digits = digits.substring(0, 10);

  let result = '+7 (';

  if (digits.length > 0) result += digits.substring(0, 3);
  if (digits.length >= 3) result += ') ' + digits.substring(3, 6);
  if (digits.length >= 6) result += '-' + digits.substring(6, 8);
  if (digits.length >= 8) result += '-' + digits.substring(8, 10);

  return result;
}

function extractDigits(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 0 && (digits[0] === '7' || digits[0] === '8')) {
    digits = digits.substring(1);
  }
  return digits;
}

function handleInput(e) {
  const input = e.target;
  input.value = formatPhone(extractDigits(input.value));
}

function handleKeydown(e) {
  const input = e.target;
  const digits = extractDigits(input.value);

  if (e.key === 'Backspace') {
    e.preventDefault();
    if (digits.length === 0) return;
    const shorter = digits.slice(0, -1);
    input.value = shorter.length > 0 ? formatPhone(shorter) : '+7 (';
    const len = input.value.length;
    input.setSelectionRange(len, len);
    return;
  }

  if (e.key === 'Delete') {
    e.preventDefault();
    return;
  }

  if (digits.length === 0 && /^[0-9]$/.test(e.key) && e.key !== '9') {
    e.preventDefault();
  }
}

function handleFocus(e) {
  const input = e.target;
  if (!input.value || input.value.length < 4) {
    input.value = '+7 (';
  }
  setTimeout(() => {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }, 0);
}

function handleBlur(e) {
  const input = e.target;
  if (extractDigits(input.value).length === 0) {
    input.value = '';
  }
}

function handlePaste(e) {
  e.preventDefault();
  const input = e.target;
  const pasted = (e.clipboardData || window.clipboardData).getData('text');

  let digits = pasted.replace(/\D/g, '');
  if (digits.length > 0 && (digits[0] === '7' || digits[0] === '8')) {
    digits = digits.substring(1);
  }

  input.value = formatPhone(digits);
  const len = input.value.length;
  input.setSelectionRange(len, len);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
