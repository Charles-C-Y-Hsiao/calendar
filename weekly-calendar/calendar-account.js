const CALENDAR_USER_STORAGE_KEY = 'calendar.currentUserId';

function isValidCalendarUserId(value) {
  return /^[0-9]{8}$/.test(String(value || '').trim());
}

function readStoredCalendarUserId() {
  try {
    return localStorage.getItem(CALENDAR_USER_STORAGE_KEY);
  } catch (err) {
    console.warn('[calendar-account] localStorage read failed', err);
    return null;
  }
}

function setStoredCalendarUserId(userId) {
  const nextUserId = String(userId || '').trim();
  if (!isValidCalendarUserId(nextUserId)) return false;
  try {
    localStorage.setItem(CALENDAR_USER_STORAGE_KEY, nextUserId);
    return true;
  } catch (err) {
    console.warn('[calendar-account] localStorage write failed', err);
    return false;
  }
}

function initCalendarUserId(defaultUserId) {
  const fallbackUserId = isValidCalendarUserId(defaultUserId) ? defaultUserId : '00666888';
  const storedUserId = readStoredCalendarUserId();
  if (isValidCalendarUserId(storedUserId)) return storedUserId;
  setStoredCalendarUserId(fallbackUserId);
  return fallbackUserId;
}

function bindCalendarUserStorageSync(onChange) {
  window.addEventListener('storage', (event) => {
    if (event.key !== CALENDAR_USER_STORAGE_KEY) return;
    const nextUserId = event.newValue;
    if (!isValidCalendarUserId(nextUserId)) return;
    onChange(nextUserId);
  });
}
