// Comprehensive location data - All English-speaking countries + major tech/business hubs
export const COUNTRIES = [
  // Primary English-speaking countries
  { code: 'US', name: 'United States', flag: '🇺🇸', englishSpeaking: true },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', englishSpeaking: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', englishSpeaking: true },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', englishSpeaking: true },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', englishSpeaking: true },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', englishSpeaking: true },
  
  // Countries with English as official language
  { code: 'IN', name: 'India', flag: '🇮🇳', englishSpeaking: true },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', englishSpeaking: true },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', englishSpeaking: true },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', englishSpeaking: true },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', englishSpeaking: true },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', englishSpeaking: true },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', englishSpeaking: true },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', englishSpeaking: true },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', englishSpeaking: true },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', englishSpeaking: true },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', englishSpeaking: true },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', englishSpeaking: true },
  
  // Caribbean English-speaking countries
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', englishSpeaking: true },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', englishSpeaking: true },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', englishSpeaking: true },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', englishSpeaking: true },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', englishSpeaking: true },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', englishSpeaking: true },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', englishSpeaking: true },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲', englishSpeaking: true },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩', englishSpeaking: true },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', englishSpeaking: true },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', englishSpeaking: true },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨', englishSpeaking: true },
  
  // Pacific English-speaking countries
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯', englishSpeaking: true },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', englishSpeaking: true },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', englishSpeaking: true },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', englishSpeaking: true },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', englishSpeaking: true },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', englishSpeaking: true },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', englishSpeaking: true },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', englishSpeaking: true },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', englishSpeaking: true },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', englishSpeaking: true },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', englishSpeaking: true },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲', englishSpeaking: true },
  
  // Other countries where English is widely used
  { code: 'MT', name: 'Malta', flag: '🇲🇹', englishSpeaking: true },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', englishSpeaking: true },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', englishSpeaking: true },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', englishSpeaking: true },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', englishSpeaking: true },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', englishSpeaking: true },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', englishSpeaking: true },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', englishSpeaking: true },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', englishSpeaking: true },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', englishSpeaking: true },
  
  // Major tech/business hubs (non-English speaking but important for job market)
  { code: 'DE', name: 'Germany', flag: '🇩🇪', englishSpeaking: false },
  { code: 'FR', name: 'France', flag: '🇫🇷', englishSpeaking: false },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', englishSpeaking: false },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', englishSpeaking: false },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', englishSpeaking: false },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', englishSpeaking: false },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', englishSpeaking: false },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', englishSpeaking: false },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', englishSpeaking: false },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', englishSpeaking: false },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', englishSpeaking: false },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', englishSpeaking: false },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', englishSpeaking: false },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', englishSpeaking: false },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', englishSpeaking: false },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', englishSpeaking: false },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', englishSpeaking: false },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', englishSpeaking: false },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', englishSpeaking: false },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', englishSpeaking: false },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', englishSpeaking: false },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', englishSpeaking: false },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', englishSpeaking: false },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', englishSpeaking: false },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', englishSpeaking: false },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', englishSpeaking: false },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', englishSpeaking: false },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', englishSpeaking: false },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', englishSpeaking: false },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', englishSpeaking: false },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', englishSpeaking: false },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', englishSpeaking: false },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', englishSpeaking: false },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', englishSpeaking: false },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', englishSpeaking: false },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', englishSpeaking: false },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', englishSpeaking: false },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', englishSpeaking: false },
  { code: 'CN', name: 'China', flag: '🇨🇳', englishSpeaking: false },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', englishSpeaking: false },
];

// States/Provinces for all major English-speaking countries
export const STATES_PROVINCES = {
  // United States
  US: [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    { code: 'DC', name: 'District of Columbia' },
  ],
  
  // Canada
  CA: [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'YT', name: 'Yukon' },
  ],
  
  // Australia
  AU: [
    { code: 'NSW', name: 'New South Wales' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'WA', name: 'Western Australia' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'ACT', name: 'Australian Capital Territory' },
    { code: 'NT', name: 'Northern Territory' },
  ],
  
  // United Kingdom
  GB: [
    { code: 'ENG', name: 'England' },
    { code: 'SCT', name: 'Scotland' },
    { code: 'WLS', name: 'Wales' },
    { code: 'NIR', name: 'Northern Ireland' },
  ],
  
  // India (Major States)
  IN: [
    { code: 'AN', name: 'Andaman and Nicobar Islands' },
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'AS', name: 'Assam' },
    { code: 'BR', name: 'Bihar' },
    { code: 'CH', name: 'Chandigarh' },
    { code: 'CG', name: 'Chhattisgarh' },
    { code: 'DN', name: 'Dadra and Nagar Haveli' },
    { code: 'DD', name: 'Daman and Diu' },
    { code: 'DL', name: 'Delhi' },
    { code: 'GA', name: 'Goa' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'HR', name: 'Haryana' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'JK', name: 'Jammu and Kashmir' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'KL', name: 'Kerala' },
    { code: 'LA', name: 'Ladakh' },
    { code: 'LD', name: 'Lakshadweep' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'MN', name: 'Manipur' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'OR', name: 'Odisha' },
    { code: 'PY', name: 'Puducherry' },
    { code: 'PB', name: 'Punjab' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TS', name: 'Telangana' },
    { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'UK', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' },
  ],
  
  // South Africa
  ZA: [
    { code: 'EC', name: 'Eastern Cape' },
    { code: 'FS', name: 'Free State' },
    { code: 'GP', name: 'Gauteng' },
    { code: 'KZN', name: 'KwaZulu-Natal' },
    { code: 'LP', name: 'Limpopo' },
    { code: 'MP', name: 'Mpumalanga' },
    { code: 'NC', name: 'Northern Cape' },
    { code: 'NW', name: 'North West' },
    { code: 'WC', name: 'Western Cape' },
  ],
  
  // New Zealand
  NZ: [
    { code: 'AUK', name: 'Auckland' },
    { code: 'BOP', name: 'Bay of Plenty' },
    { code: 'CAN', name: 'Canterbury' },
    { code: 'GIS', name: 'Gisborne' },
    { code: 'HKB', name: 'Hawke\'s Bay' },
    { code: 'MWT', name: 'Manawatū-Whanganui' },
    { code: 'MBH', name: 'Marlborough' },
    { code: 'NSN', name: 'Nelson' },
    { code: 'NTL', name: 'Northland' },
    { code: 'OTA', name: 'Otago' },
    { code: 'STL', name: 'Southland' },
    { code: 'TKI', name: 'Taranaki' },
    { code: 'TAS', name: 'Tasman' },
    { code: 'WKO', name: 'Waikato' },
    { code: 'WGN', name: 'Wellington' },
    { code: 'WTC', name: 'West Coast' },
  ],
  
  // Nigeria (Major States)
  NG: [
    { code: 'AB', name: 'Abia' },
    { code: 'AD', name: 'Adamawa' },
    { code: 'AK', name: 'Akwa Ibom' },
    { code: 'AN', name: 'Anambra' },
    { code: 'BA', name: 'Bauchi' },
    { code: 'BY', name: 'Bayelsa' },
    { code: 'BE', name: 'Benue' },
    { code: 'BO', name: 'Borno' },
    { code: 'CR', name: 'Cross River' },
    { code: 'DE', name: 'Delta' },
    { code: 'EB', name: 'Ebonyi' },
    { code: 'ED', name: 'Edo' },
    { code: 'EK', name: 'Ekiti' },
    { code: 'EN', name: 'Enugu' },
    { code: 'FC', name: 'Federal Capital Territory' },
    { code: 'GO', name: 'Gombe' },
    { code: 'IM', name: 'Imo' },
    { code: 'JI', name: 'Jigawa' },
    { code: 'KD', name: 'Kaduna' },
    { code: 'KN', name: 'Kano' },
    { code: 'KT', name: 'Katsina' },
    { code: 'KE', name: 'Kebbi' },
    { code: 'KO', name: 'Kogi' },
    { code: 'KW', name: 'Kwara' },
    { code: 'LA', name: 'Lagos' },
    { code: 'NA', name: 'Nasarawa' },
    { code: 'NI', name: 'Niger' },
    { code: 'OG', name: 'Ogun' },
    { code: 'ON', name: 'Ondo' },
    { code: 'OS', name: 'Osun' },
    { code: 'OY', name: 'Oyo' },
    { code: 'PL', name: 'Plateau' },
    { code: 'RI', name: 'Rivers' },
    { code: 'SO', name: 'Sokoto' },
    { code: 'TA', name: 'Taraba' },
    { code: 'YO', name: 'Yobe' },
    { code: 'ZA', name: 'Zamfara' },
  ],
};

// Legacy export for backwards compatibility
export const US_STATES = STATES_PROVINCES.US;

export const MAJOR_CITIES = [
  // US Cities
  { name: 'New York', state: 'NY', country: 'US', population: 8336000 },
  { name: 'Los Angeles', state: 'CA', country: 'US', population: 3979000 },
  { name: 'Chicago', state: 'IL', country: 'US', population: 2693000 },
  { name: 'Houston', state: 'TX', country: 'US', population: 2320000 },
  { name: 'Phoenix', state: 'AZ', country: 'US', population: 1680000 },
  { name: 'Philadelphia', state: 'PA', country: 'US', population: 1584000 },
  { name: 'San Antonio', state: 'TX', country: 'US', population: 1547000 },
  { name: 'San Diego', state: 'CA', country: 'US', population: 1423000 },
  { name: 'Dallas', state: 'TX', country: 'US', population: 1343000 },
  { name: 'San Jose', state: 'CA', country: 'US', population: 1021000 },
  { name: 'Austin', state: 'TX', country: 'US', population: 978000 },
  { name: 'Jacksonville', state: 'FL', country: 'US', population: 911000 },
  { name: 'Fort Worth', state: 'TX', country: 'US', population: 909000 },
  { name: 'Columbus', state: 'OH', country: 'US', population: 898000 },
  { name: 'San Francisco', state: 'CA', country: 'US', population: 873000 },
  { name: 'Charlotte', state: 'NC', country: 'US', population: 873000 },
  { name: 'Indianapolis', state: 'IN', country: 'US', population: 868000 },
  { name: 'Seattle', state: 'WA', country: 'US', population: 753000 },
  { name: 'Denver', state: 'CO', country: 'US', population: 715000 },
  { name: 'Boston', state: 'MA', country: 'US', population: 685000 },
  { name: 'Nashville', state: 'TN', country: 'US', population: 670000 },
  { name: 'Detroit', state: 'MI', country: 'US', population: 670000 },
  { name: 'Portland', state: 'OR', country: 'US', population: 650000 },
  { name: 'Las Vegas', state: 'NV', country: 'US', population: 641000 },
  { name: 'Atlanta', state: 'GA', country: 'US', population: 506000 },
  { name: 'Miami', state: 'FL', country: 'US', population: 442000 },
  
  // International Cities
  { name: 'London', state: 'England', country: 'GB', population: 9540000 },
  { name: 'Toronto', state: 'ON', country: 'CA', population: 2930000 },
  { name: 'Vancouver', state: 'BC', country: 'CA', population: 675000 },
  { name: 'Montreal', state: 'QC', country: 'CA', population: 1780000 },
  { name: 'Berlin', state: 'Berlin', country: 'DE', population: 3669000 },
  { name: 'Munich', state: 'Bavaria', country: 'DE', population: 1488000 },
  { name: 'Hamburg', state: 'Hamburg', country: 'DE', population: 1900000 },
  { name: 'Paris', state: 'Île-de-France', country: 'FR', population: 2161000 },
  { name: 'Amsterdam', state: 'North Holland', country: 'NL', population: 873000 },
  { name: 'Stockholm', state: 'Stockholm', country: 'SE', population: 975000 },
  { name: 'Zurich', state: 'Zurich', country: 'CH', population: 415000 },
  { name: 'Geneva', state: 'Geneva', country: 'CH', population: 201000 },
  { name: 'Dublin', state: 'Leinster', country: 'IE', population: 544000 },
  { name: 'Sydney', state: 'NSW', country: 'AU', population: 5312000 },
  { name: 'Melbourne', state: 'VIC', country: 'AU', population: 5078000 },
  { name: 'Singapore', state: 'Singapore', country: 'SG', population: 5454000 },
  { name: 'Tokyo', state: 'Tokyo', country: 'JP', population: 37274000 },
  { name: 'Mumbai', state: 'Maharashtra', country: 'IN', population: 20411000 },
  { name: 'Bangalore', state: 'Karnataka', country: 'IN', population: 12765000 },
  { name: 'São Paulo', state: 'São Paulo', country: 'BR', population: 22043000 },
];

// Legacy static currency list - now superseded by dynamic API
export const CURRENCIES = [
  // Primary English-speaking countries
  { code: 'USD', name: 'United States Dollar', symbol: '$', country: 'US', isEnglishSpeaking: true },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', country: 'GB', isEnglishSpeaking: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'CA', isEnglishSpeaking: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'AU', isEnglishSpeaking: true },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', country: 'NZ', isEnglishSpeaking: true },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'IE', isEnglishSpeaking: true }, // Ireland, Malta, Cyprus
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'SG', isEnglishSpeaking: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'IN', isEnglishSpeaking: true },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', country: 'ZA', isEnglishSpeaking: true },
  
  // Caribbean English-speaking countries
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$', country: 'AG', isEnglishSpeaking: true },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', country: 'JM', isEnglishSpeaking: true },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$', country: 'BB', isEnglishSpeaking: true },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$', country: 'TT', isEnglishSpeaking: true },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: 'B$', country: 'BS', isEnglishSpeaking: true },
  { code: 'GYD', name: 'Guyanese Dollar', symbol: 'GY$', country: 'GY', isEnglishSpeaking: true },
  { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$', country: 'BZ', isEnglishSpeaking: true },
  
  // African English-speaking countries
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', country: 'NG', isEnglishSpeaking: true },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', country: 'KE', isEnglishSpeaking: true },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', country: 'GH', isEnglishSpeaking: true },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', country: 'UG', isEnglishSpeaking: true },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', country: 'TZ', isEnglishSpeaking: true },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', country: 'BW', isEnglishSpeaking: true },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', country: 'ZM', isEnglishSpeaking: true },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK', country: 'MW', isEnglishSpeaking: true },
  { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$', country: 'LR', isEnglishSpeaking: true },
  { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le', country: 'SL', isEnglishSpeaking: true },
  { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D', country: 'GM', isEnglishSpeaking: true },
  
  // Pacific English-speaking countries
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$', country: 'FJ', isEnglishSpeaking: true },
  { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K', country: 'PG', isEnglishSpeaking: true },
  { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT', country: 'VU', isEnglishSpeaking: true },
  { code: 'SBD', name: 'Solomon Islands Dollar', symbol: 'SI$', country: 'SB', isEnglishSpeaking: true },
  { code: 'WST', name: 'Samoan Tala', symbol: 'WS$', country: 'WS', isEnglishSpeaking: true },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$', country: 'TO', isEnglishSpeaking: true },
  
  // Asian English-speaking regions
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', country: 'LK', isEnglishSpeaking: true },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', country: 'MY', isEnglishSpeaking: true },
  { code: 'BND', name: 'Brunei Dollar', symbol: 'B$', country: 'BN', isEnglishSpeaking: true },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', country: 'HK', isEnglishSpeaking: true },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', country: 'PH', isEnglishSpeaking: true },
  
  // Non-English speaking major currencies (for reference)
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', country: 'CH', isEnglishSpeaking: false },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'JP', isEnglishSpeaking: false },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', country: 'SE', isEnglishSpeaking: false },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', country: 'NO', isEnglishSpeaking: false },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', country: 'DK', isEnglishSpeaking: false },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', country: 'BR', isEnglishSpeaking: false }
];

// Note: This static list is for backwards compatibility.
// Use the dynamic API endpoints for comprehensive, up-to-date currency data:
// GET /api/v1/currencies - All currencies
// GET /api/v1/currencies/english-speaking - English-speaking countries only
// GET /api/v1/currencies/search?query=... - Search currencies
// GET /api/v1/currencies/country/:countryCode - Currencies by country

export const JOB_TITLES = [
  // Software Engineering
  'Software Engineer',
  'Senior Software Engineer',
  'Staff Software Engineer',
  'Principal Software Engineer',
  'Software Architect',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'React Developer',
  'Node.js Developer',
  'Python Developer',
  'Java Developer',
  'C# Developer',
  'iOS Developer',
  'Android Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Site Reliability Engineer',
  'Platform Engineer',
  'Cloud Engineer',
  'Infrastructure Engineer',
  'Security Engineer',
  'QA Engineer',
  'Test Engineer',
  'Automation Engineer',
  
  // Data & Analytics
  'Data Scientist',
  'Senior Data Scientist',
  'Data Engineer',
  'Data Analyst',
  'Business Intelligence Analyst',
  'Machine Learning Engineer',
  'AI Engineer',
  'Research Scientist',
  'Quantitative Analyst',
  'Analytics Manager',
  'Data Product Manager',
  
  // Product & Design
  'Product Manager',
  'Senior Product Manager',
  'Principal Product Manager',
  'Product Owner',
  'UX Designer',
  'UI Designer',
  'UX/UI Designer',
  'Product Designer',
  'Visual Designer',
  'Interaction Designer',
  'Design System Designer',
  'User Researcher',
  'Design Manager',
  
  // Management & Leadership
  'Engineering Manager',
  'Senior Engineering Manager',
  'Director of Engineering',
  'VP of Engineering',
  'CTO',
  'Technical Lead',
  'Team Lead',
  'Product Director',
  'Head of Product',
  'VP of Product',
  'Chief Product Officer',
  
  // Marketing & Sales
  'Marketing Manager',
  'Digital Marketing Manager',
  'Content Marketing Manager',
  'Growth Manager',
  'Performance Marketing Manager',
  'SEO Specialist',
  'Social Media Manager',
  'Brand Manager',
  'Marketing Director',
  'Sales Manager',
  'Account Manager',
  'Business Development Manager',
  'Sales Representative',
  'Customer Success Manager',
  
  // Operations & Finance
  'Operations Manager',
  'Operations Analyst',
  'Financial Analyst',
  'Accountant',
  'Finance Manager',
  'Controller',
  'CFO',
  'HR Manager',
  'Recruiter',
  'People Operations Manager',
  'Office Manager',
  'Executive Assistant',
  'Project Manager',
  'Program Manager',
  'Scrum Master',
  'Agile Coach',
  
  // Consulting & Advisory
  'Management Consultant',
  'Strategy Consultant',
  'Technology Consultant',
  'Business Analyst',
  'Systems Analyst',
  'Solution Architect',
  'Technical Consultant',
  
  // Specialized Roles
  'Cybersecurity Analyst',
  'Information Security Manager',
  'Compliance Manager',
  'Legal Counsel',
  'Paralegal',
  'Technical Writer',
  'Content Writer',
  'Copywriter',
  'Community Manager',
];

export const MAJOR_COMPANIES = [
  // Tech Giants
  'Google',
  'Apple',
  'Microsoft',
  'Amazon',
  'Meta',
  'Netflix',
  'Tesla',
  'Spotify',
  'Uber',
  'Airbnb',
  'Twitter',
  'LinkedIn',
  'Snapchat',
  'TikTok',
  'Zoom',
  'Slack',
  'Shopify',
  'Square',
  'Stripe',
  'Coinbase',
  'OpenAI',
  'Anthropic',
  
  // Traditional Tech
  'IBM',
  'Oracle',
  'SAP',
  'Adobe',
  'Salesforce',
  'VMware',
  'Cisco',
  'Intel',
  'NVIDIA',
  'AMD',
  'Qualcomm',
  'Broadcom',
  
  // Startups & Scale-ups
  'Figma',
  'Notion',
  'Canva',
  'Discord',
  'Twilio',
  'Datadog',
  'Snowflake',
  'Palantir',
  'Unity',
  'Epic Games',
  'Roblox',
  'DoorDash',
  'Instacart',
  'Robinhood',
  'Plaid',
  'Brex',
  
  // Finance
  'JPMorgan Chase',
  'Goldman Sachs',
  'Morgan Stanley',
  'Bank of America',
  'Wells Fargo',
  'Citigroup',
  'BlackRock',
  'Vanguard',
  'Fidelity',
  'Charles Schwab',
  
  // Consulting
  'McKinsey & Company',
  'Boston Consulting Group',
  'Bain & Company',
  'Deloitte',
  'PwC',
  'EY',
  'KPMG',
  'Accenture',
  
  // Healthcare & Biotech
  'Johnson & Johnson',
  'Pfizer',
  'Roche',
  'Novartis',
  'Merck',
  'AbbVie',
  'Gilead Sciences',
  'Moderna',
  'Illumina',
  
  // Retail & E-commerce
  'Walmart',
  'Target',
  'Home Depot',
  'Costco',
  'Best Buy',
  'Nike',
  'Adidas',
  'Lululemon',
  
  // Media & Entertainment
  'Disney',
  'Warner Bros',
  'NBCUniversal',
  'Sony',
  'Paramount',
  'HBO',
  'ESPN',
  'CNN',
  'The New York Times',
  'Washington Post',
  
  // Automotive
  'Ford',
  'General Motors',
  'Toyota',
  'BMW',
  'Mercedes-Benz',
  'Volkswagen',
  'Rivian',
  'Lucid Motors',
  
  // International
  'Spotify',
  'Klarna',
  'Revolut',
  'N26',
  'SAP',
  'Siemens',
  'ASML',
  'Booking.com',
  'Adyen',
];

export const JOB_SOURCES = [
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'indeed', label: 'Indeed', icon: '🔍' },
  { value: 'glassdoor', label: 'Glassdoor', icon: '🏢' },
  { value: 'company_website', label: 'Company Website', icon: '🌐' },
  { value: 'referral', label: 'Referral', icon: '👥' },
  { value: 'recruiter', label: 'Recruiter', icon: '🤝' },
  { value: 'job_board', label: 'Job Board', icon: '📋' },
  { value: 'networking', label: 'Networking Event', icon: '🤝' },
  { value: 'career_fair', label: 'Career Fair', icon: '🎪' },
  { value: 'manual', label: 'Manual Entry', icon: '✍️' },
];

export const APPLICATION_METHODS = [
  { value: 'online', label: 'Online Application', icon: '💻' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'referral', label: 'Through Referral', icon: '👥' },
  { value: 'recruiter', label: 'Via Recruiter', icon: '🤝' },
  { value: 'career_fair', label: 'Career Fair', icon: '🎪' },
  { value: 'networking', label: 'Networking', icon: '🤝' },
  { value: 'cold_outreach', label: 'Cold Outreach', icon: '📞' },
];

export const PRIORITY_LEVELS = [
  { value: 'dream_job', label: 'Dream Job', color: 'text-purple-400', icon: '⭐' },
  { value: 'high', label: 'High Priority', color: 'text-red-400', icon: '🔥' },
  { value: 'medium', label: 'Medium Priority', color: 'text-yellow-400', icon: '➡️' },
  { value: 'low', label: 'Low Priority', color: 'text-green-400', icon: '⬇️' },
];

export const SALARY_PERIODS = [
  { value: 'yearly', label: 'Per Year', icon: '📅' },
  { value: 'monthly', label: 'Per Month', icon: '📆' },
  { value: 'weekly', label: 'Per Week', icon: '🗓️' },
  { value: 'daily', label: 'Per Day', icon: '📋' },
  { value: 'hourly', label: 'Per Hour', icon: '⏰' },
];

// Helper functions
export const searchCities = (query: string, limit = 10) => {
  const lowerQuery = query.toLowerCase();
  return MAJOR_CITIES
    .filter(city => 
      city.name.toLowerCase().includes(lowerQuery) ||
      city.state.toLowerCase().includes(lowerQuery) ||
      COUNTRIES.find(c => c.code === city.country)?.name.toLowerCase().includes(lowerQuery)
    )
    .sort((a, b) => b.population - a.population)
    .slice(0, limit);
};

export const searchStates = (query: string, limit = 10) => {
  const lowerQuery = query.toLowerCase();
  return US_STATES
    .filter(state => 
      state.name.toLowerCase().includes(lowerQuery) ||
      state.code.toLowerCase().includes(lowerQuery)
    )
    .slice(0, limit);
};

export const searchCountries = (query: string, limit = 10) => {
  const lowerQuery = query.toLowerCase();
  return COUNTRIES
    .filter(country => 
      country.name.toLowerCase().includes(lowerQuery) ||
      country.code.toLowerCase().includes(lowerQuery)
    )
    .slice(0, limit);
};

export const searchJobTitles = (query: string, limit = 10) => {
  const lowerQuery = query.toLowerCase();
  return JOB_TITLES
    .filter(title => title.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      const aIndex = a.toLowerCase().indexOf(lowerQuery);
      const bIndex = b.toLowerCase().indexOf(lowerQuery);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.length - b.length;
    })
    .slice(0, limit);
};

export const searchCompanies = (query: string, limit = 10) => {
  const lowerQuery = query.toLowerCase();
  return MAJOR_COMPANIES
    .filter(company => company.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      const aIndex = a.toLowerCase().indexOf(lowerQuery);
      const bIndex = b.toLowerCase().indexOf(lowerQuery);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.length - b.length;
    })
    .slice(0, limit);
};

export const searchCurrencies = (query: string, limit = 10) => {
  const lowerQuery = query.toLowerCase();
  return CURRENCIES
    .filter(currency => 
      currency.name.toLowerCase().includes(lowerQuery) ||
      currency.code.toLowerCase().includes(lowerQuery) ||
      currency.symbol.includes(query)
    )
    .slice(0, limit);
};