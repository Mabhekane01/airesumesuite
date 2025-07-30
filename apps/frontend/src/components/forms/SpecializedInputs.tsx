import React, { useState, useEffect } from 'react';
import { AutocompleteInput } from './AutocompleteInput';
import {
  searchCities,
  searchStates,
  searchCountries,
  searchJobTitles,
  searchCompanies,
  searchCurrencies,
  COUNTRIES,
  CURRENCIES,
  JOB_SOURCES,
  APPLICATION_METHODS,
  PRIORITY_LEVELS,
  SALARY_PERIODS,
} from '../../data/standardData';

interface LocationInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type: 'city' | 'state' | 'country';
  countryCode?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  type,
  countryCode = 'US',
  placeholder,
  disabled = false,
  required = false,
  className = '',
  helpText,
}) => {
  const getSearchFunction = () => {
    switch (type) {
      case 'city':
        return (query: string) => {
          const cities = searchCities(query, 15);
          return cities.map(city => ({
            value: city.name,
            label: city.name,
            description: `${city.state}, ${COUNTRIES.find(c => c.code === city.country)?.name}`,
            icon: '🏙️',
          }));
        };
      
      case 'state':
        return (query: string) => {
          const states = searchStates(query, 15);
          return states.map(state => ({
            value: state.name,
            label: state.name,
            description: `${state.code}`,
            icon: '🗺️',
          }));
        };
      
      case 'country':
        return (query: string) => {
          const countries = searchCountries(query, 15);
          return countries.map(country => ({
            value: country.name,
            label: country.name,
            description: country.code,
            icon: country.flag,
          }));
        };
      
      default:
        return () => [];
    }
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (type) {
      case 'city': return 'e.g. San Francisco';
      case 'state': return 'e.g. California';
      case 'country': return 'e.g. United States';
      default: return 'Type to search...';
    }
  };

  return (
    <AutocompleteInput
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={[]}
      searchFunction={getSearchFunction()}
      placeholder={getPlaceholder()}
      disabled={disabled}
      required={required}
      className={className}
      helpText={helpText}
      allowCustomValue={true}
      minSearchLength={1}
      maxDisplayOptions={15}
    />
  );
};

interface JobTitleInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
}

export const JobTitleInput: React.FC<JobTitleInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'e.g. Senior Software Engineer',
  disabled = false,
  required = false,
  className = '',
  helpText = 'Select from common job titles or enter a custom one',
}) => {
  const searchFunction = (query: string) => {
    const titles = searchJobTitles(query, 12);
    return titles.map(title => ({
      value: title,
      label: title,
      icon: '💼',
    }));
  };

  return (
    <AutocompleteInput
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={[]}
      searchFunction={searchFunction}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
      helpText={helpText}
      allowCustomValue={true}
      minSearchLength={1}
      maxDisplayOptions={12}
    />
  );
};

interface CompanyInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
}

export const CompanyInput: React.FC<CompanyInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'e.g. Google',
  disabled = false,
  required = false,
  className = '',
  helpText = 'Select from major companies or enter any company name',
}) => {
  const searchFunction = (query: string) => {
    const companies = searchCompanies(query, 12);
    return companies.map(company => ({
      value: company,
      label: company,
      icon: '🏢',
    }));
  };

  return (
    <AutocompleteInput
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={[]}
      searchFunction={searchFunction}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
      helpText={helpText}
      allowCustomValue={true}
      minSearchLength={1}
      maxDisplayOptions={12}
    />
  );
};

interface CurrencyInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Select currency',
  disabled = false,
  required = false,
  className = '',
  helpText = 'Choose the currency for salary information',
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<any>(null);

  // Load initial currency data when value changes
  useEffect(() => {
    if (value && !selectedCurrency) {
      // Find currency data by code
      const currency = CURRENCIES.find(c => c.code === value);
      if (currency) {
        setSelectedCurrency({
          id: currency.code,
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          displaySymbol: `${currency.symbol} (${currency.code})`
        });
      }
    }
  }, [value, selectedCurrency]);

  const handleCurrencyChange = (currency: any) => {
    setSelectedCurrency(currency);
    onChange(currency ? currency.code : '');
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-dark-text-secondary mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {/* Try to use the new CurrencyAutocomplete, fallback to select */}
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className="input-field-dark w-full"
        >
          <option value="">{placeholder}</option>
          {CURRENCIES.filter(c => c.isEnglishSpeaking).map(currency => (
            <option key={currency.code} value={currency.code}>
              {currency.symbol} {currency.code} - {currency.name}
            </option>
          ))}
          <optgroup label="Other Major Currencies">
            {CURRENCIES.filter(c => !c.isEnglishSpeaking).map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.code} - {currency.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      
      {helpText && (
        <p className="mt-1 text-sm text-dark-text-muted">{helpText}</p>
      )}
    </div>
  );
};

interface JobSourceInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
}

export const JobSourceInput: React.FC<JobSourceInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Where did you find this job?',
  disabled = false,
  required = false,
  className = '',
  helpText = 'Select where you discovered this job opportunity',
}) => {
  const options = JOB_SOURCES.map(source => ({
    value: source.value,
    label: source.label,
    icon: source.icon,
  }));

  return (
    <AutocompleteInput
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
      helpText={helpText}
      allowCustomValue={false}
      minSearchLength={0}
      maxDisplayOptions={options.length}
    />
  );
};

interface ApplicationMethodInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
}

export const ApplicationMethodInput: React.FC<ApplicationMethodInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'How are you applying?',
  disabled = false,
  required = false,
  className = '',
  helpText = 'Select your application method',
}) => {
  const options = APPLICATION_METHODS.map(method => ({
    value: method.value,
    label: method.label,
    icon: method.icon,
  }));

  return (
    <AutocompleteInput
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
      helpText={helpText}
      allowCustomValue={false}
      minSearchLength={0}
      maxDisplayOptions={options.length}
    />
  );
};

interface PriorityInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
}

export const PriorityInput: React.FC<PriorityInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Set priority level',
  disabled = false,
  required = false,
  className = '',
  helpText = 'How important is this job opportunity to you?',
}) => {
  const options = PRIORITY_LEVELS.map(priority => ({
    value: priority.value,
    label: priority.label,
    icon: priority.icon,
    description: priority.color.includes('purple') ? 'Your most desired position' :
                 priority.color.includes('red') ? 'Very important opportunity' :
                 priority.color.includes('yellow') ? 'Standard application' :
                 'Low priority or backup option',
  }));

  return (
    <AutocompleteInput
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
      helpText={helpText}
      allowCustomValue={false}
      minSearchLength={0}
      maxDisplayOptions={options.length}
    />
  );
};

interface SalaryPeriodInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helpText?: string;
}

export const SalaryPeriodInput: React.FC<SalaryPeriodInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Select pay period',
  disabled = false,
  required = false,
  className = '',
  helpText = 'How often is the salary paid?',
}) => {
  const options = SALARY_PERIODS.map(period => ({
    value: period.value,
    label: period.label,
    icon: period.icon,
  }));

  return (
    <AutocompleteInput
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
      helpText={helpText}
      allowCustomValue={false}
      minSearchLength={0}
      maxDisplayOptions={options.length}
    />
  );
};