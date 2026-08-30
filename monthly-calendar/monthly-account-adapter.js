window.accountLoginAdapter = {
  onLoginSuccess(nextUserId) {
    setStoredCalendarUserId(nextUserId);
    user_name = nextUserId;
    updateUserNameUI(user_name);
    const url = new URL(location.href);
    url.searchParams.set('userId', nextUserId);
    location.assign(url.href);
  },
};
