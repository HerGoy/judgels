import { userWebConfigQueryOptions } from './queries/userWeb';
import { queryClient } from './queryClient';

function getUserWebConfig() {
  return queryClient.getQueryData(userWebConfigQueryOptions().queryKey);
}

export function getAppName() {
  return getUserWebConfig()?.appName;
}

export function getAppSlogan() {
  return getUserWebConfig()?.appSlogan;
}

export function getHomeBanner() {
  return getUserWebConfig()?.homeBanner;
}

export function getSiteLogo() {
  const banner = getUserWebConfig()?.homeBanner;
  if (banner) {
    const match = banner.match(/<!--\s*site_logo:\s*([^\s>]+)\s*-->/);
    if (match) return match[1];
  }
  return localStorage.getItem('judgels_site_logo') || null;
}
