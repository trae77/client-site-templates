(function () {
  'use strict';

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = document.getElementById('form-status');
  var messages = {
    name: 'Please enter your name.',
    email: 'Please enter a valid email address.',
    message: 'Please tell us a little about the job.'
  };

  function validEmail(value) {
    var at = value.indexOf('@');
    var dot = value.indexOf('.', at);
    return at > 0 && dot > at + 1 && dot < value.length - 1 && value.indexOf(' ') === -1;
  }

  function setError(field, text) {
    var err = document.getElementById(field.id + '-error');
    if (!err) return;
    if (text) {
      err.textContent = text;
      err.hidden = false;
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', err.id);
    } else {
      err.textContent = '';
      err.hidden = true;
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  }

  function check(field) {
    var value = field.value.trim();
    var bad = !value || (field.name === 'email' && !validEmail(value));
    setError(field, bad ? messages[field.name] : '');
    return !bad;
  }

  var required = ['name', 'email', 'message'].map(function (n) { return form.elements[n]; });

  required.forEach(function (field) {
    field.addEventListener('blur', function () { check(field); });
    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid') === 'true') check(field);
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault(); // sample form: nothing is sent
    var firstBad = null;
    required.forEach(function (field) {
      if (!check(field) && !firstBad) firstBad = field;
    });
    if (firstBad) {
      status.textContent = 'Please fix the highlighted fields.';
      firstBad.focus();
      return;
    }
    status.textContent = 'Thanks. This is a sample form and is not connected yet, so nothing was sent.';
  });
})();
