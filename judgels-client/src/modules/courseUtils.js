export function extractCourseLogo(desc) {
  if (!desc) return '';
  const match = desc.match(/<!--\s*logo:\s*([^\s>]+)\s*-->/);
  if (match) return match[1];
  const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : '';
}

export function cleanCourseDescription(desc) {
  if (!desc) return '';
  return desc.replace(/<!--\s*logo:\s*[^\s>]+\s*-->\s*/g, '').trim();
}

export function buildCourseDescriptionWithLogo(rawDesc, logoUrl) {
  const clean = cleanCourseDescription(rawDesc);
  if (!logoUrl || !logoUrl.trim()) return clean;
  return `<!-- logo: ${logoUrl.trim()} -->\n${clean}`;
}
