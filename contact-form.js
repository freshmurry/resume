// Interactive Contact Form with Real-time Validation
class ContactForm {
  constructor() {
    this.form = document.getElementById('contact-form');
    this.submitBtn = document.getElementById('submit-btn');
    this.statusDiv = document.getElementById('form-status');
    this.init();
  }

  init() {
    if (this.form) {
      this.setupValidation();
      this.setupSubmission();
      this.setupRealTimeValidation();
    }
  }

  setupValidation() {
    const inputs = this.form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.validateField(input));
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';

    // Remove existing error styling
    field.classList.remove('error');
    this.removeFieldError(field);

    // Validation rules
    switch (fieldName) {
      case 'name':
        if (value.length < 2) {
          isValid = false;
          errorMessage = 'Name must be at least 2 characters long';
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address';
        }
        break;

      case 'phone':
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (value && !phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
          isValid = false;
          errorMessage = 'Please enter a valid phone number';
        }
        break;

      case 'message':
        if (value.length < 10) {
          isValid = false;
          errorMessage = 'Message must be at least 10 characters long';
        }
        break;

      case 'company':
        if (value.length < 2) {
          isValid = false;
          errorMessage = 'Company name must be at least 2 characters long';
        }
        break;
    }

    if (!isValid) {
      field.classList.add('error');
      this.showFieldError(field, errorMessage);
    }

    this.updateSubmitButton();
    return isValid;
  }

  showFieldError(field, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.8em';
    errorDiv.style.marginTop = '5px';
    
    field.parentNode.appendChild(errorDiv);
  }

  removeFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  setupRealTimeValidation() {
    const inputs = this.form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        if (input.value.trim()) {
          this.validateField(input);
        }
      });
    });
  }

  updateSubmitButton() {
    const isValid = this.isFormValid();
    if (this.submitBtn) {
      this.submitBtn.disabled = !isValid;
      this.submitBtn.style.opacity = isValid ? '1' : '0.6';
    }
  }

  isFormValid() {
    const requiredFields = this.form.querySelectorAll('[required]');
    return Array.from(requiredFields).every(field => {
      return field.value.trim() && !field.classList.contains('error');
    });
  }

  async setupSubmission() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!this.isFormValid()) {
        this.showStatus('Please fix the errors above', 'error');
        return;
      }

      this.setLoading(true);
      
      try {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        // Create email content
        const emailSubject = `Contact Form Submission from ${data.name}`;
        const emailBody = `
Name: ${data.name}
Email: ${data.email}
Company: ${data.company || 'Not provided'}
Phone: ${data.phone || 'Not provided'}

Message:
${data.message}

---
Sent from Lawrence Murry's resume website contact form.
        `;
        
        // Create mailto link
        const mailtoLink = `mailto:lawrencemurry@yahoo.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        
        // Open default email client
        window.location.href = mailtoLink;
        
        this.showStatus('Email client opened. Please send the message to complete your submission.', 'success');
        this.form.reset();
        this.trackContactSubmission(data);
        
      } catch (error) {
        this.showStatus('Error opening email client. Please try again.', 'error');
      } finally {
        this.setLoading(false);
      }
    });
  }

  setLoading(loading) {
    if (this.submitBtn) {
      this.submitBtn.disabled = loading;
      this.submitBtn.textContent = loading ? 'Sending...' : 'Send Message';
    }
  }

  showStatus(message, type) {
    if (this.statusDiv) {
      this.statusDiv.textContent = message;
      this.statusDiv.className = `form-status ${type}`;
      this.statusDiv.style.display = 'block';
      
      setTimeout(() => {
        this.statusDiv.style.display = 'none';
      }, 5000);
    }
  }

  trackContactSubmission(data) {
    // Track in Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'contact_form_submit', {
        event_category: 'engagement',
        event_label: 'contact_form',
        value: 1
      });
    }
  }
}

// Initialize contact form
document.addEventListener('DOMContentLoaded', () => {
  new ContactForm();
}); 