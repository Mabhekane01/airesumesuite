export interface ParsedUA {
  browser: string;
  os: string;
  device: string;
}

export class UserAgentService {
  parse(uaString: string): ParsedUA {
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    let device = 'Desktop';

    // Simple Browser Detection
    if (uaString.includes('Firefox')) browser = 'Firefox';
    else if (uaString.includes('SamsungBrowser')) browser = 'Samsung Browser';
    else if (uaString.includes('Opera') || uaString.includes('OPR')) browser = 'Opera';
    else if (uaString.includes('Trident')) browser = 'Internet Explorer';
    else if (uaString.includes('Edge')) browser = 'Edge';
    else if (uaString.includes('Chrome')) browser = 'Chrome';
    else if (uaString.includes('Safari')) browser = 'Safari';

    // Simple OS Detection
    if (uaString.includes('Windows')) os = 'Windows';
    else if (uaString.includes('Mac OS X')) os = 'macOS';
    else if (uaString.includes('Android')) os = 'Android';
    else if (uaString.includes('Linux')) os = 'Linux';
    else if (uaString.includes('iPhone') || uaString.includes('iPad')) os = 'iOS';

    // Simple Device Detection
    if (uaString.includes('Mobi')) device = 'Mobile';
    if (uaString.includes('Tablet') || uaString.includes('iPad')) device = 'Tablet';

    return { browser, os, device };
  }
}

export const userAgentService = new UserAgentService();
