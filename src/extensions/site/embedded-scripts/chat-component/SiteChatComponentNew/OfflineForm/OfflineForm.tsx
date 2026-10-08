import React, { useEffect, useRef, useState } from 'react';
import { useOfflineForm } from '../hooks';
import { Button } from '../Shared';
import type { OfflineField, OfflineFormSchema } from '../SiteChatComponentNew.types';
import './OfflineForm.css';

interface OfflineFormProps {
  schema: OfflineFormSchema;
  recaptchaSiteKey: string;
  onSubmit: (values: Record<string, unknown>, captchaToken: string) => Promise<void> | void;
}

interface RecaptchaApi {
  render: (container: HTMLElement, options: {
    sitekey: string;
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => number;
  reset: (widgetId?: number) => void;
}

interface RecaptchaEnterpriseApi {
  render: RecaptchaApi['render'];
  reset: RecaptchaApi['reset'];
  ready: (callback: () => void) => void;
}

declare global {
  interface Window {
    grecaptcha?: { enterprise?: RecaptchaEnterpriseApi };
    cwWixRecaptchaOnLoad?: () => void;
  }
}

let recaptchaApiPromise: Promise<RecaptchaApi> | null = null;

const loadRecaptchaApi = (): Promise<RecaptchaApi> => {
  const existingEnterprise = window.grecaptcha?.enterprise;
  if (existingEnterprise?.render && existingEnterprise.ready) {
    return new Promise((resolve) => existingEnterprise.ready(() => resolve(existingEnterprise)));
  }
  if (recaptchaApiPromise) return recaptchaApiPromise;

  recaptchaApiPromise = new Promise<RecaptchaApi>((resolve, reject) => {
    let script = document.getElementById('cw-wix-recaptcha-enterprise') as HTMLScriptElement | null;
    const startedAt = Date.now();
    let settled = false;
    let readinessCheck: number;
    const resolveWhenReady = () => {
      const enterprise = window.grecaptcha?.enterprise;
      if (!enterprise?.render || !enterprise.ready || settled) return;
      enterprise.ready(() => {
        if (settled) return;
        settled = true;
        window.clearInterval(readinessCheck);
        resolve(enterprise);
      });
    };
    readinessCheck = window.setInterval(() => {
      resolveWhenReady();
      if (!settled && Date.now() - startedAt > 15_000) {
        settled = true;
        window.clearInterval(readinessCheck);
        reject(new Error('reCAPTCHA did not initialize'));
      }
    }, 100);
    const onLoad = resolveWhenReady;
    const onError = () => {
      settled = true;
      window.clearInterval(readinessCheck);
      reject(new Error('reCAPTCHA failed to load'));
    };

    window.cwWixRecaptchaOnLoad = onLoad;

    if (!script) {
      script = document.createElement('script');
      script.id = 'cw-wix-recaptcha-enterprise';
      script.src = 'https://www.google.com/recaptcha/enterprise.js?onload=cwWixRecaptchaOnLoad&render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      document.head.appendChild(script);
      return;
    }

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    onLoad();
  }).catch((error) => {
    delete window.cwWixRecaptchaOnLoad;
    recaptchaApiPromise = null;
    throw error;
  });

  return recaptchaApiPromise!;
};

interface FieldRendererProps {
  field: OfflineField;
  value: unknown;
  error: string;
  onChange: (id: string, value: unknown) => void;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  error,
  onChange,
}) => {
  const hasError = error.length > 0;
  const fieldId = `cw-offline-field-${field.id}`;
  const errorId = `${fieldId}-error`;

  const commonProps = {
    id: fieldId,
    className: `cw-offline-form__input${hasError ? ' cw-offline-form__input--error' : ''}`,
    'aria-invalid': hasError,
    'aria-describedby': hasError ? errorId : undefined,
    required: field.required,
  };

  if (field.type === 'textarea') {
    return (
      <div className="cw-offline-form__field">
        <label htmlFor={fieldId} className="cw-offline-form__label">
          {field.label}
          {field.required && (
            <span className="cw-offline-form__required" aria-hidden="true">
              {' '}*
            </span>
          )}
        </label>
        <textarea
          {...commonProps}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          rows={3}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={`cw-offline-form__textarea${hasError ? ' cw-offline-form__textarea--error' : ''}`}
        />
        {hasError && (
          <span id={errorId} className="cw-offline-form__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="cw-offline-form__field">
        <label htmlFor={fieldId} className="cw-offline-form__label">
          {field.label}
          {field.required && (
            <span className="cw-offline-form__required" aria-hidden="true">
              {' '}*
            </span>
          )}
        </label>
        <select
          {...commonProps}
          value={String(value ?? '')}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={`cw-offline-form__select${hasError ? ' cw-offline-form__select--error' : ''}`}
        >
          <option value="">
            {field.placeholder ?? `Select ${field.label}`}
          </option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasError && (
          <span id={errorId} className="cw-offline-form__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="cw-offline-form__field cw-offline-form__field--checkbox">
        <label className="cw-offline-form__checkbox-label" htmlFor={fieldId}>
          <input
            type="checkbox"
            id={fieldId}
            checked={Boolean(value)}
            onChange={(e) => onChange(field.id, e.target.checked)}
            className="cw-offline-form__checkbox"
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            required={field.required}
          />
          <span className="cw-offline-form__checkbox-text">
            {field.label}
            {field.required && (
              <span className="cw-offline-form__required" aria-hidden="true">
                {' '}*
              </span>
            )}
          </span>
        </label>
        {hasError && (
          <span id={errorId} className="cw-offline-form__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  // text | email | phone
  return (
    <div className="cw-offline-form__field">
      <label htmlFor={fieldId} className="cw-offline-form__label">
        {field.label}
        {field.required && (
          <span className="cw-offline-form__required" aria-hidden="true">
            {' '}*
          </span>
        )}
      </label>
      <input
        {...commonProps}
        type={field.type}
        value={String(value ?? '')}
        placeholder={field.placeholder}
        onChange={(e) => onChange(field.id, e.target.value)}
      />
      {hasError && (
        <span id={errorId} className="cw-offline-form__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

const OfflineForm: React.FC<OfflineFormProps> = ({ schema, recaptchaSiteKey, onSubmit }) => {
  const { values, errors, setValue, handleSubmit } = useOfflineForm(schema);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const captchaWidgetIdRef = useRef<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(true);
  const [captchaError, setCaptchaError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setIsCaptchaLoading(true);
    setCaptchaError('');
    let cancelled = false;
    void loadRecaptchaApi().then((recaptcha) => {
      if (cancelled || !captchaContainerRef.current) return;
      captchaWidgetIdRef.current = recaptcha.render(captchaContainerRef.current, {
        sitekey: recaptchaSiteKey,
        callback: (token) => {
          setCaptchaToken(token);
          setCaptchaError('');
        },
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => {
          setCaptchaToken('');
          setCaptchaError('reCAPTCHA could not be verified. Please try again.');
        },
      });
      setIsCaptchaLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setIsCaptchaLoading(false);
        setCaptchaError('reCAPTCHA could not load. Please refresh and try again.');
      }
    });

    return () => {
      cancelled = true;
      captchaWidgetIdRef.current = null;
      if (captchaContainerRef.current) captchaContainerRef.current.replaceChildren();
    };
  }, [recaptchaSiteKey]);

  const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!captchaToken || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const wasValid = await handleSubmit((formValues) => onSubmit(formValues, captchaToken));
      if (!wasValid) return;
      setIsSubmitted(true);
      setCaptchaToken('');
      if (captchaWidgetIdRef.current !== null) window.grecaptcha?.enterprise?.reset(captchaWidgetIdRef.current);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to send your message. Please try again.');
      setCaptchaToken('');
      if (captchaWidgetIdRef.current !== null) window.grecaptcha?.enterprise?.reset(captchaWidgetIdRef.current);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) return <p className="cw-offline-form__success" role="status">Thanks — your message has been sent.</p>;

  return (
    <form
      className="cw-offline-form"
      onSubmit={onFormSubmit}
      aria-label={schema.title}
      noValidate
    >
      <h3 className="cw-offline-form__title">{schema.title}</h3>

      {schema.fields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors[field.id] ?? ''}
          onChange={setValue}
        />
      ))}

      <div className="cw-offline-form__captcha" aria-label="reCAPTCHA verification">
        {isCaptchaLoading && (
          <span className="cw-offline-form__captcha-loading" role="status" aria-live="polite">
            <span className="cw-offline-form__captcha-spinner" aria-hidden="true" />
            Loading security check…
          </span>
        )}
        <div ref={captchaContainerRef} className="cw-offline-form__captcha-widget" />
        {captchaError && <span className="cw-offline-form__error" role="alert">{captchaError}</span>}
      </div>
      {submitError && <span className="cw-offline-form__error" role="alert">{submitError}</span>}

      <div className="cw-offline-form__actions">
        <Button type="submit" fullWidth disabled={!captchaToken || isSubmitting}>
          {isSubmitting ? 'Sending…' : schema.submitButtonText}
        </Button>
      </div>
    </form>
  );
};

export default OfflineForm;
