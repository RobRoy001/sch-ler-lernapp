// Fallback für private/incognito Mode
const useLocalStorage = (key, initialValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.warn('localStorage not available, using in-memory storage');
    return initialValue;
  }
};

const setStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('localStorage not available');
  }
};

export { useLocalStorage, setStorage };
