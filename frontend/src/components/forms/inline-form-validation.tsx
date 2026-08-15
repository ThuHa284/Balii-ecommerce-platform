'use client';

import { useEffect } from 'react';

type ValidatedControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function isValidatedControl(
  target: EventTarget | null,
): target is ValidatedControl {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function validationMessage(control: ValidatedControl) {
  const label =
    control.labels?.[0]?.textContent
      ?.replace(/\(không bắt buộc\)/i, '')
      .trim() ||
    control.getAttribute('aria-label') ||
    control.getAttribute('placeholder') ||
    'Trường này';

  if (control.validity.valueMissing) return `${label} là thông tin bắt buộc.`;
  if (control.validity.typeMismatch) return `${label} chưa đúng định dạng.`;
  if (control.validity.patternMismatch)
    return `${label} chưa đúng định dạng yêu cầu.`;
  if (control.validity.tooShort)
    return `${label} cần ít nhất ${
      'minLength' in control ? control.minLength : ''
    } ký tự.`;
  if (control.validity.tooLong)
    return `${label} không được vượt quá ${
      'maxLength' in control ? control.maxLength : ''
    } ký tự.`;
  if (control.validity.rangeUnderflow)
    return `${label} phải từ ${'min' in control ? control.min : ''} trở lên.`;
  if (control.validity.rangeOverflow)
    return `${label} không được lớn hơn ${
      'max' in control ? control.max : ''
    }.`;
  if (control.validity.badInput) return `${label} chứa giá trị không hợp lệ.`;
  if (control.validity.customError) return control.validationMessage;
  return `${label} chưa hợp lệ.`;
}

function errorId(control: ValidatedControl) {
  if (!control.id) control.id = `field-${crypto.randomUUID()}`;
  return `${control.id}-inline-error`;
}

function clearError(control: ValidatedControl) {
  const id = errorId(control);
  document.getElementById(id)?.remove();
  control.removeAttribute('aria-invalid');
  const describedBy = (control.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter((value) => value && value !== id);
  if (describedBy.length)
    control.setAttribute('aria-describedby', describedBy.join(' '));
  else control.removeAttribute('aria-describedby');
}

function showError(control: ValidatedControl) {
  clearError(control);
  if (control.validity.valid || control.disabled) return;

  const id = errorId(control);
  const message = document.createElement('p');
  message.id = id;
  message.className = 'mt-1 text-[11px] leading-4 text-red-600';
  message.setAttribute('role', 'alert');
  message.textContent = validationMessage(control);

  const anchor = control.parentElement?.classList.contains('relative')
    ? control.parentElement
    : control;
  anchor.insertAdjacentElement('afterend', message);
  control.setAttribute('aria-invalid', 'true');
  const describedBy = new Set(
    (control.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter(Boolean),
  );
  describedBy.add(id);
  control.setAttribute('aria-describedby', [...describedBy].join(' '));
}

/** Adds compact Vietnamese inline feedback to every native validated field. */
export default function InlineFormValidation() {
  useEffect(() => {
    const onInvalid = (event: Event) => {
      if (!isValidatedControl(event.target)) return;
      event.preventDefault();
      showError(event.target);
      event.target.focus({ preventScroll: true });
      event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    const onBlur = (event: Event) => {
      if (isValidatedControl(event.target) && event.target.value)
        showError(event.target);
    };
    const onInput = (event: Event) => {
      if (!isValidatedControl(event.target)) return;
      if (event.target.validity.valid) clearError(event.target);
      else if (event.target.getAttribute('aria-invalid') === 'true')
        showError(event.target);
    };

    document.addEventListener('invalid', onInvalid, true);
    document.addEventListener('blur', onBlur, true);
    document.addEventListener('input', onInput, true);
    return () => {
      document.removeEventListener('invalid', onInvalid, true);
      document.removeEventListener('blur', onBlur, true);
      document.removeEventListener('input', onInput, true);
    };
  }, []);

  return null;
}
