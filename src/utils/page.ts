export const isProblemsetPage = (): boolean => {
  const path = window.location.pathname;
  return path.startsWith('/problemset') && !path.includes('/problemset/problem/');
};

export const isProblemPage = (): boolean => {
  const path = window.location.pathname;
  return (
    path.includes('/problemset/problem/') ||
    (path.includes('/contest/') && path.includes('/problem/')) ||
    (path.includes('/gym/') && path.includes('/problem/'))
  );
};

export const isContestPage = (): boolean => {
  const path = window.location.pathname;
  return path.startsWith('/contest/') || path.startsWith('/contests');
};

export const isContestRegistrationPage = (): boolean => {
  const path = window.location.pathname;
  return (
    path.startsWith('/contestRegistration') ||
    path.includes('/contestRegistration/') ||
    path.startsWith('/gymRegistration') ||
    path.includes('/gymRegistration/') ||
    document.querySelector('form.contestRegistration') !== null
  );
};

export const isExtensionActivePage = (): boolean => {
  return isProblemsetPage() || isContestRegistrationPage() || isProblemPage();
};



