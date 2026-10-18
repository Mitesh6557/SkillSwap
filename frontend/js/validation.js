/**
 * SkillSwap - Unified Form Validation System
 * Shared client-side validation utility supporting inline accessible error alerts,
 * real-time error clearing, schema validation, and focus management.
 */

(function () {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validator = {
    /**
     * Check if a value is empty or consists purely of whitespace
     */
    isEmpty(value) {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.trim().length === 0;
      if (Array.isArray(value)) return value.length === 0;
      return false;
    },

    /**
     * Check if a string is a valid email
     */
    isEmail(value) {
      if (!value || typeof value !== 'string') return false;
      return EMAIL_REGEX.test(value.trim());
    },

    /**
     * Check if a date string represents a valid future timestamp
     */
    isFutureDate(dateStr, minMinutesAhead = 2) {
      if (!dateStr) return false;
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return false;
      const minTime = Date.now() + minMinutesAhead * 60 * 1000;
      return parsed.getTime() >= minTime;
    },

    /**
     * Resolve a DOM element from an element or CSS selector
     */
    getElement(target) {
      if (!target) return null;
      if (typeof target === 'string') return document.querySelector(target);
      return target instanceof HTMLElement ? target : null;
    },

    /**
     * Display an inline validation error on a field
     */
    showError(target, message) {
      const el = this.getElement(target);
      if (!el) return;

      el.classList.add('is-invalid', 'has-error');
      el.setAttribute('aria-invalid', 'true');

      // Check if parent form group exists
      const formGroup = el.closest('.form-group') || el.parentElement;
      if (formGroup) {
        formGroup.classList.add('has-error');
      }

      // Check if error message element already exists
      let errorEl = formGroup ? formGroup.querySelector('.form-error-msg') : null;
      if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'form-error-msg';
        errorEl.setAttribute('role', 'alert');
        errorEl.setAttribute('aria-live', 'polite');

        const errId = `err_${el.id || Math.random().toString(36).substring(2, 9)}`;
        errorEl.id = errId;
        el.setAttribute('aria-describedby', errId);

        // Place directly after element or its wrapper
        if (el.nextSibling) {
          el.parentNode.insertBefore(errorEl, el.nextSibling);
        } else {
          el.parentNode.appendChild(errorEl);
        }
      }

      errorEl.innerHTML = `
        <span class="error-icon" aria-hidden="true">⚠️</span>
        <span class="error-text">${message}</span>
      `;
      errorEl.style.display = 'flex';

      // Setup real-time listener to clear error as user corrects the field
      const clearHandler = () => {
        this.clearError(el);
        el.removeEventListener('input', clearHandler);
        el.removeEventListener('change', clearHandler);
      };
      el.addEventListener('input', clearHandler, { once: true });
      el.addEventListener('change', clearHandler, { once: true });
    },

    /**
     * Clear validation error from a specific field
     */
    clearError(target) {
      const el = this.getElement(target);
      if (!el) return;

      el.classList.remove('is-invalid', 'has-error');
      el.removeAttribute('aria-invalid');

      const formGroup = el.closest('.form-group') || el.parentElement;
      if (formGroup) {
        formGroup.classList.remove('has-error');
        const errorEl = formGroup.querySelector('.form-error-msg');
        if (errorEl) {
          errorEl.remove();
        }
      } else {
        const errorEl = el.parentNode?.querySelector('.form-error-msg');
        if (errorEl) {
          errorEl.remove();
        }
      }
    },

    /**
     * Clear all errors within a form
     */
    clearFormErrors(formTarget) {
      const form = this.getElement(formTarget);
      if (!form) return;

      form.querySelectorAll('.is-invalid, .has-error').forEach((el) => {
        el.classList.remove('is-invalid', 'has-error');
        el.removeAttribute('aria-invalid');
      });

      form.querySelectorAll('.form-error-msg').forEach((msg) => msg.remove());
    },

    /**
     * Validate an individual field against a rule set
     * Rules object format:
     * {
     *   required: boolean | string,
     *   email: boolean | string,
     *   minLength: number | { min: number, message: string },
     *   futureDate: boolean | string,
     *   min: number | { val: number, message: string },
     *   max: number | { val: number, message: string },
     *   custom: (value, el) => true | string
     * }
     */
    validateField(target, rules) {
      const el = this.getElement(target);
      if (!el) return true;

      const rawValue = el.value;
      const trimmedValue = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

      // 1. Required check
      if (rules.required) {
        if (this.isEmpty(trimmedValue)) {
          const msg = typeof rules.required === 'string' ? rules.required : 'This field is required.';
          this.showError(el, msg);
          return false;
        }
      }

      // If optional and empty, do not run format checks
      if (this.isEmpty(trimmedValue)) {
        this.clearError(el);
        return true;
      }

      // 2. Email check
      if (rules.email) {
        if (!this.isEmail(trimmedValue)) {
          const msg = typeof rules.email === 'string' ? rules.email : 'Please enter a valid email address (e.g. name@example.com).';
          this.showError(el, msg);
          return false;
        }
      }

      // 3. Min Length check
      if (rules.minLength !== undefined) {
        const minLen = typeof rules.minLength === 'object' ? rules.minLength.min : rules.minLength;
        if (trimmedValue.length < minLen) {
          const msg = typeof rules.minLength === 'object'
            ? rules.minLength.message
            : `Must be at least ${minLen} characters long.`;
          this.showError(el, msg);
          return false;
        }
      }

      // 4. Future Date check
      if (rules.futureDate) {
        if (!this.isFutureDate(trimmedValue, 1)) {
          const msg = typeof rules.futureDate === 'string'
            ? rules.futureDate
            : 'Please select a date and time in the future.';
          this.showError(el, msg);
          return false;
        }
      }

      // 5. Min numeric value check
      if (rules.min !== undefined) {
        const minVal = typeof rules.min === 'object' ? rules.min.val : rules.min;
        const num = parseFloat(trimmedValue);
        if (isNaN(num) || num < minVal) {
          const msg = typeof rules.min === 'object' ? rules.min.message : `Value must be at least ${minVal}.`;
          this.showError(el, msg);
          return false;
        }
      }

      // 6. Max numeric value check
      if (rules.max !== undefined) {
        const maxVal = typeof rules.max === 'object' ? rules.max.val : rules.max;
        const num = parseFloat(trimmedValue);
        if (isNaN(num) || num > maxVal) {
          const msg = typeof rules.max === 'object' ? rules.max.message : `Value must not exceed ${maxVal}.`;
          this.showError(el, msg);
          return false;
        }
      }

      // 7. Custom validation predicate
      if (typeof rules.custom === 'function') {
        const result = rules.custom(trimmedValue, el);
        if (result !== true) {
          const msg = typeof result === 'string' ? result : 'Invalid input value.';
          this.showError(el, msg);
          return false;
        }
      }

      this.clearError(el);
      return true;
    },

    /**
     * Validate an entire form using a schema
     * Schema format: { '#elementId': rules, ... }
     */
    validateForm(formTarget, schema) {
      const form = this.getElement(formTarget);
      if (!form) return false;

      let isFormValid = true;
      let firstInvalidElement = null;

      for (const [selector, rules] of Object.entries(schema)) {
        const el = form.querySelector(selector) || document.querySelector(selector);
        if (!el) continue;

        const isFieldValid = this.validateField(el, rules);
        if (!isFieldValid) {
          isFormValid = false;
          if (!firstInvalidElement) {
            firstInvalidElement = el;
          }
        }
      }

      if (!isFormValid && firstInvalidElement) {
        try {
          firstInvalidElement.focus();
        } catch (e) {
          // Focus fallback
        }
      }

      return isFormValid;
    }
  };

  // Expose to window for global access
  window.validator = validator;
  if (window.ui) {
    window.ui.validator = validator;
  }
})();
