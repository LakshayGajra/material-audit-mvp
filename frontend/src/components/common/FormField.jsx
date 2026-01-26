import { useState, useEffect } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Enhanced form field with inline validation
 *
 * @param {string} type - 'text' | 'number' | 'email' | 'date' | 'select'
 * @param {string} label - Field label
 * @param {any} value - Field value
 * @param {Function} onChange - Change handler (value) => void
 * @param {boolean} required - Whether field is required
 * @param {Function} validate - Custom validation: (value) => string | null (error message or null)
 * @param {Array} options - Options for select: [{ value, label }]
 * @param {string} placeholder - Placeholder text
 * @param {string} helperText - Default helper text
 * @param {boolean} showSuccess - Show checkmark on valid input
 * @param {boolean} validateOnBlur - Only validate on blur (default: true)
 * @param {boolean} validateOnChange - Validate on every change (default: false)
 * @param {object} inputProps - Additional input props
 * @param {boolean} disabled - Whether field is disabled
 * @param {boolean} fullWidth - Full width (default: true)
 * @param {object} sx - Additional styles
 */
export default function FormField({
  type = 'text',
  label,
  value,
  onChange,
  required = false,
  validate,
  options = [],
  placeholder,
  helperText,
  showSuccess = false,
  validateOnBlur = true,
  validateOnChange = false,
  inputProps = {},
  disabled = false,
  fullWidth = true,
  sx = {},
  ...rest
}) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');

  // Run validation
  const runValidation = (val) => {
    // Required validation
    if (required && (val === '' || val === null || val === undefined)) {
      return `${label} is required`;
    }

    // Type-specific validation
    if (val !== '' && val !== null && val !== undefined) {
      if (type === 'email' && val) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          return 'Please enter a valid email address';
        }
      }

      if (type === 'number' && val !== '') {
        const num = parseFloat(val);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (inputProps.min !== undefined && num < inputProps.min) {
          return `Value must be at least ${inputProps.min}`;
        }
        if (inputProps.max !== undefined && num > inputProps.max) {
          return `Value must be at most ${inputProps.max}`;
        }
      }
    }

    // Custom validation
    if (validate) {
      const customError = validate(val);
      if (customError) return customError;
    }

    return '';
  };

  // Validate on change if enabled
  useEffect(() => {
    if (validateOnChange && touched) {
      setError(runValidation(value));
    }
  }, [value, validateOnChange, touched]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (validateOnChange) {
      setError(runValidation(newValue));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (validateOnBlur) {
      setError(runValidation(value));
    }
  };

  const hasError = touched && !!error;
  const isValid = touched && !error && value !== '' && value !== null && value !== undefined;

  // Common props
  const commonProps = {
    fullWidth,
    disabled,
    error: hasError,
    sx: { mb: 2, ...sx },
    ...rest,
  };

  // Success adornment
  const successAdornment = showSuccess && isValid ? (
    <InputAdornment position="end">
      <CheckCircleIcon color="success" fontSize="small" />
    </InputAdornment>
  ) : null;

  // Render select
  if (type === 'select') {
    return (
      <FormControl {...commonProps} required={required}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          label={label}
          onChange={handleChange}
          onBlur={handleBlur}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
        {(hasError || helperText) && (
          <FormHelperText error={hasError}>
            {hasError ? error : helperText}
          </FormHelperText>
        )}
      </FormControl>
    );
  }

  // Render text/number/email/date field
  return (
    <TextField
      {...commonProps}
      type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
      label={label}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      required={required}
      placeholder={placeholder}
      helperText={hasError ? error : helperText}
      slotProps={{
        inputLabel: type === 'date' ? { shrink: true } : undefined,
        input: {
          endAdornment: successAdornment,
          ...inputProps,
        },
      }}
    />
  );
}
