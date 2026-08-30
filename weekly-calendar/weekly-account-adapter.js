window.accountLoginAdapter = {
  onLoginSuccess(nextUserId) {
    setStoredCalendarUserId(nextUserId);
    user_name = nextUserId;
    if (userNameSpan) userNameSpan.textContent = `Hi, ${user_name}`;
    updateModeLinks();
    const url = new URL(location.href);
    url.searchParams.set('userId', nextUserId);
    location.assign(url.href);
  },
};
