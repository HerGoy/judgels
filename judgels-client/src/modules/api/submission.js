export function constructContainerUrl(subpaths) {
  if (!subpaths || !Array.isArray(subpaths) || subpaths.length === 0 || !subpaths[0]) {
    return '';
  }
  if (subpaths.length === 2) {
    return `/courses/${subpaths[0]}/chapters/${subpaths[1]}`;
  } else {
    return `/problems/${subpaths[0]}`;
  }
}

export function constructProblemUrl(subpaths, problemAlias) {
  if (!problemAlias || problemAlias === '-' || problemAlias === '#') {
    return '';
  }
  const containerUrl = constructContainerUrl(subpaths);
  if (!containerUrl) {
    return '';
  }
  if (subpaths.length === 2) {
    return `${containerUrl}/problems/${problemAlias}`;
  } else {
    return `${containerUrl}/${problemAlias}`;
  }
}
